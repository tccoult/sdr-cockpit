import { useEffect, useRef, useState } from "react";
import { Button } from "./components/common/Button";
import { TaskSidebar } from "./components/tasks/TaskSidebar";
import { TaskWizard } from "./components/tasks/TaskWizard";
import { SpectrumView } from "./components/visualization/SpectrumView";
import { useWindowSize } from "./hooks/useWindowSize";
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
  const { width } = useWindowSize(); // Get dynamic width
  const isMobile = width < 1024;

  const colorMap = PLASMA;

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

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#0a0a0f",
        color: "white",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        position: "relative",
      }}
    >
      {/* Mobile overlay */}
      {isSidebarOpen && isMobile && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 999,
            display: "block",
          }}
        />
      )}

      {/* Task Sidebar */}
      <div
        style={{
          position: isMobile ? "fixed" : "relative",
          left: isMobile ? (isSidebarOpen ? 0 : -280) : 0,
          top: 0,
          height: "100vh",
          zIndex: 1000,
          transition: "left 0.3s ease",
        }}
      >
        <TaskSidebar
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          isDiscovering={isDiscovering}
          onSelectTask={handleSelectTask}
          onCreateTask={() => setIsWizardOpen(true)}
          onPauseTask={handlePauseTask}
          onStopTask={handleStopTask}
          onRecordTask={handleRecordTask}
          onStopRecording={handleStopRecording}
        />
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(10, 10, 15, 0.8)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Hamburger menu for mobile */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{
                display: isMobile ? "flex" : "none",
                flexDirection: "column",
                gap: 4,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 8,
              }}
              aria-label="Toggle sidebar"
            >
              <div
                style={{
                  width: 24,
                  height: 2,
                  background: "white",
                  borderRadius: 2,
                }}
              />
              <div
                style={{
                  width: 24,
                  height: 2,
                  background: "white",
                  borderRadius: 2,
                }}
              />
              <div
                style={{
                  width: 24,
                  height: 2,
                  background: "white",
                  borderRadius: 2,
                }}
              />
            </button>

            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
                SDR Cockpit
              </h1>
              {selectedTask && (
                <p
                  style={{
                    margin: "4px 0 0 0",
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: 13,
                  }}
                >
                  {selectedTask.name} -{" "}
                  {formatFrequency(selectedTask.frequency)}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 14,
              }}
            >
              <strong>{fps}</strong> FPS
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                background:
                  selectedTask?.status === "live" ||
                  selectedTask?.status === "transmitting"
                    ? "rgba(76, 175, 80, 0.1)"
                    : "rgba(158, 158, 158, 0.1)",
                border:
                  selectedTask?.status === "live" ||
                  selectedTask?.status === "transmitting"
                    ? "1px solid rgba(76, 175, 80, 0.3)"
                    : "1px solid rgba(158, 158, 158, 0.3)",
                borderRadius: 6,
                fontSize: 14,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background:
                    selectedTask?.status === "live" ||
                    selectedTask?.status === "transmitting"
                      ? "#4caf50"
                      : "#9e9e9e",
                  animation:
                    selectedTask?.status === "live" ||
                    selectedTask?.status === "transmitting"
                      ? "pulse 2s infinite"
                      : "none",
                }}
              />
              <span>
                {selectedTask?.status === "live" && "Live"}
                {selectedTask?.status === "transmitting" && "Transmitting"}
                {selectedTask?.status === "paused" && "Paused"}
                {!selectedTask && "No Task Selected"}
              </span>
            </div>
          </div>
        </div>

        {/* Spectrum display area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            overflow: "auto",
          }}
        >
          {selectedTask ? (
            <div
              style={{
                width: "100%",
                animation: "slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <SpectrumView
                centerFreq={selectedTask.frequency}
                sampleRate={selectedTask.sampleRate}
                colorMap={colorMap}
              />
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.6)",
                padding: 60,
              }}
            >
              <div style={{ fontSize: 64, marginBottom: 20 }}>📡</div>
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
                No Task Selected
              </div>
              <div style={{ fontSize: 14, marginBottom: 30, opacity: 0.8 }}>
                Select a task from the sidebar to view spectrum
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
      </div>

      {/* Task Wizard Modal */}
      <TaskWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreateRxTask={handleCreateRxTask}
        onCreateTxTask={handleCreateTxTask}
      />
    </div>
  );
}

export default App;
