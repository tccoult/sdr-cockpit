import { useEffect, useRef, useState } from "react";
import { Button } from "./components/common/Button";
import {
  CockpitColumn,
  CockpitHeaderZone,
  CockpitLayout,
  CockpitMainArea,
  CockpitRosterSection,
  CockpitSpotlightSection,
  CockpitTelemetryRail,
} from "./components/layout";
import {
  ActiveTaskPanel,
  getTaskStatusLabel,
} from "./components/tasks/ActiveTaskPanel/ActiveTaskPanel";
import { TaskRosterPanel } from "./components/tasks/TaskRosterPanel";
import { TaskWizard } from "./components/tasks/TaskWizard";
import { useWindowSize } from "./components/app/useWindowSize";
import { SpectrumView } from "./components/visualization/SpectrumView";
import { PlotSandbox } from "./components/visualization/PlotSandbox";
import { CreateRxTaskParams, CreateTxTaskParams, Task } from "./types/sdr";
import { PLASMA } from "./utils/colorMaps";
import { formatFrequency } from "./utils/formatters";
import { MockFFTGenerator, dispatchFFTData } from "./utils/mockDataGenerator";

import {
  createMockRxTask,
  createMockTxTask,
  generateDemoTasks,
  startRecording,
  stopRecording,
  toggleTaskPause,
  updateRecording,
  updateTaskUptime,
  updateTxProgress,
} from "./utils/mockTaskGenerator";

function App() {
  const { width, height: windowHeight } = useWindowSize(); // Get dynamic size
  const isMobile = width < 1024;

  const colorMap = PLASMA;
  const showPlotSandbox = import.meta.env.VITE_PLOT_SANDBOX === "true";

  // Task state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // FPS tracking
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());

  // Mock data generators (one per task)
  const generatorsRef = useRef<Map<string, MockFFTGenerator>>(new Map());
  const intervalRef = useRef<number | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Initialize with demo tasks
  useEffect(() => {
    // Simulate discovery delay
    setTimeout(() => {
      const demoTasks = generateDemoTasks();
      setTasks(demoTasks);
      setIsDiscovering(false);

      // Auto-select first task
      if (demoTasks.length > 0) {
        setSelectedTaskId(demoTasks[0].id);
      }
    }, 1500);
  }, []);

  // Get selected task
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  // Create/update FFT generator for selected task
  useEffect(() => {
    if (!selectedTask) return;

    if (!generatorsRef.current.has(selectedTask.id)) {
      // Use frequency as seed to make each task's data visually distinct
      const generator = new MockFFTGenerator(
        selectedTask.frequency,
        selectedTask.sampleRate,
        selectedTask.fftSize || 2048,
        selectedTask.frequency // Use frequency as seed for unique signals per task
      );
      generatorsRef.current.set(selectedTask.id, generator);
    }
  }, [selectedTask]);

  // FFT data generation loop
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      // Pause FFT generation when wizard is open for better performance
      if (!selectedTask || selectedTask.status === "paused" || isWizardOpen)
        return;

      const generator = generatorsRef.current.get(selectedTask.id);
      if (generator) {
        const fftData = generator.generateFFT();
        dispatchFFTData(fftData);

        // Update FPS counter
        frameCountRef.current++;
        const now = Date.now();
        if (now - lastFpsUpdateRef.current >= 1000) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          lastFpsUpdateRef.current = now;
        }
      }
    }, 1000 / 60); // 30 FPS

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [selectedTask, isWizardOpen]);

  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextHeight = entry.contentRect.height;
      setHeaderHeight((prev) =>
        Math.abs(prev - nextHeight) < 1 ? prev : nextHeight
      );
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  const viewerHeight = Math.max(
    windowHeight - headerHeight - 32,
    720
  );

  // Update task uptimes and recordings
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setTasks((prevTasks) =>
        prevTasks.map((task) => {
          let updatedTask = updateTaskUptime(task);

          // Update TX progress
          if (task.type === "tx" && task.status === "transmitting") {
            updatedTask = updateTxProgress(updatedTask, 1); // 1 second
          }

          // Update recording
          if (task.recording?.isRecording) {
            updatedTask = updateRecording(updatedTask, 1); // 1 second
          }

          return updatedTask;
        })
      );
    }, 1000);

    return () => clearInterval(updateInterval);
  }, []);

  // Task handlers
  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const handleCreateRxTask = (params: CreateRxTaskParams) => {
    const newTask = createMockRxTask(params);
    setTasks((prev) => [...prev, newTask]);
    setSelectedTaskId(newTask.id);
  };

  const handleCreateTxTask = (params: CreateTxTaskParams) => {
    const newTask = createMockTxTask({
      name: params.name,
      frequency: params.frequency || 433.92e6,
      loop: params.loop,
      filename: params.file.name,
    });
    setTasks((prev) => [...prev, newTask]);
    setSelectedTaskId(newTask.id);
  };

  const handlePauseTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? toggleTaskPause(task) : task))
    );
  };

  const handleStopTask = (taskId: string) => {
    // Remove task
    setTasks((prev) => prev.filter((task) => task.id !== taskId));

    // Remove generator
    generatorsRef.current.delete(taskId);

    // If this was the selected task, select another
    if (taskId === selectedTaskId) {
      const remainingTasks = tasks.filter((t) => t.id !== taskId);
      setSelectedTaskId(
        remainingTasks.length > 0 ? remainingTasks[0].id : null
      );
    }
  };

  const handleRecordTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? startRecording(task) : task))
    );
  };

  const handleStopRecording = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? stopRecording(task) : task))
    );
  };

  const taskStatusLabel = getTaskStatusLabel(selectedTask);

  const totalTasks = tasks.length;
  const operatorTasks = tasks.filter((task) => task.owner === "self").length;

  return (
    <>
      <CockpitLayout>
        {isSidebarOpen && isMobile && (
          <button
            type="button"
            aria-label="Close task column"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          />
        )}

        <CockpitHeaderZone ref={headerRef}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                className="flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-md border border-white/10 bg-white/5 transition hover:bg-white/10 lg:hidden"
                aria-label="Toggle task column"
              >
                <span className="sr-only">Toggle task column</span>
                <span className="h-0.5 w-6 rounded-full bg-white" />
                <span className="h-0.5 w-6 rounded-full bg-white" />
                <span className="h-0.5 w-6 rounded-full bg-white" />
              </button>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">
                  SDR Cockpit
                </h1>
                {selectedTask && (
                  <p className="mt-1 text-sm text-slate-300">
                    {selectedTask.name} · {formatFrequency(selectedTask.frequency)}
                  </p>
                )}
              </div>
            </div>

            <CockpitTelemetryRail className="text-sm">
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 shadow-inner shadow-black/20">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Frame Rate
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {fps}
                  <span className="ml-1 text-xs font-normal text-slate-400">FPS</span>
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3 shadow-inner shadow-black/20">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Tasks Online
                </p>
                <p className="mt-1 text-lg font-semibold text-white">{totalTasks}</p>
                <p className="text-xs text-slate-400">{operatorTasks} by operator</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3 shadow-inner shadow-black/20">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Active Status
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {taskStatusLabel}
                </p>
              </div>
            </CockpitTelemetryRail>
          </div>
        </CockpitHeaderZone>

        <CockpitColumn
          position="left"
          className={`lg:w-[320px] ${
            isMobile
              ? isSidebarOpen
                ? 'z-50 rounded-2xl border border-white/10 bg-[rgba(10,10,15,0.95)] p-3 shadow-2xl'
                : 'hidden'
              : ''
          }`}
        >
          <CockpitSpotlightSection>
            <ActiveTaskPanel
              task={selectedTask}
              onPauseTask={handlePauseTask}
              onStopTask={handleStopTask}
              onRecordTask={handleRecordTask}
              onStopRecording={handleStopRecording}
            />
          </CockpitSpotlightSection>

          <CockpitRosterSection className="overflow-hidden">
            <TaskRosterPanel
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              isDiscovering={isDiscovering}
              onSelectTask={handleSelectTask}
              onCreateTask={() => setIsWizardOpen(true)}
            />
          </CockpitRosterSection>
        </CockpitColumn>

        <CockpitColumn position="center" className="flex-1">
          <CockpitMainArea className="backdrop-blur">
            <div className="flex flex-1 flex-col">
              {selectedTask ? (
                <div
                  className="w-full flex-1"
                  style={{ minHeight: viewerHeight, animation: "slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}
                >
                  <SpectrumView
                    taskId={selectedTask.id}
                    centerFreq={selectedTask.frequency}
                    sampleRate={selectedTask.sampleRate}
                    colorMap={colorMap}
                    availableHeight={viewerHeight}
                  />
                  {showPlotSandbox && (
                    <div className="mt-6 flex justify-center">
                      <PlotSandbox
                        width={Math.min(Math.max(width - 160, 360), 960)}
                        height={260}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center text-slate-300">
                  <div className="text-6xl">📡</div>
                  <div>
                    <p className="text-xl font-semibold text-white">No Task Selected</p>
                    <p className="mt-2 text-sm text-slate-400">
                      Select a task from the roster to view spectrum activity.
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsWizardOpen(true)}
                    variant="secondary"
                    size="lg"
                  >
                    + Create New Task
                  </Button>
                </div>
              )}
            </div>
          </CockpitMainArea>
        </CockpitColumn>
      </CockpitLayout>

      <TaskWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreateRxTask={handleCreateRxTask}
        onCreateTxTask={handleCreateTxTask}
      />
    </>
  );
}

export default App;
