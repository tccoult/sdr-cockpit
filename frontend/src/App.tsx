import { useRef, useState } from "react";
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
import { ActiveTaskPanel } from "./components/tasks/ActiveTaskPanel/ActiveTaskPanel";
import { getTaskStatusLabel } from "./components/tasks/ActiveTaskPanel/taskStatus";
import { TaskRosterPanel } from "./components/tasks/TaskRosterPanel";
import { TaskWizard } from "./components/tasks/TaskWizard";
import { useWindowSize } from "./components/app/useWindowSize";
import { ThemeToggle } from "./components/app/ThemeToggle";
import { ApiModeIndicator } from "./components/app/ApiModeIndicator";
import { SpectrumView } from "./components/visualization/SpectrumView";
import { PlotSandbox } from "./components/visualization/PlotSandbox";
import { PLASMA } from "./utils/colorMaps";
import { formatFrequency } from "./utils/formatters";
import { useTasks, useDataStream } from "./hooks";

function App() {
  const { width } = useWindowSize();
  const isMobile = width < 1024;

  const colorMap = PLASMA;
  const showPlotSandbox = import.meta.env.VITE_PLOT_SANDBOX === "true";

  // UI state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // Task management hook
  const {
    tasks,
    selectedTask,
    selectedTaskId,
    isDiscovering,
    selectTask,
    createRxTask,
    createTxTask,
    pauseTask,
    stopTask,
    startRecording,
    stopRecording,
  } = useTasks();

  // Data streaming hook
  const { fps, streamStatus, streamError } = useDataStream({
    taskId: selectedTaskId,
    centerFreq: selectedTask?.frequency,
    sampleRate: selectedTask?.sampleRate,
    fftSize: selectedTask?.fftSize,
    enabled: !isWizardOpen, // Pause streaming when wizard is open
  });

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
                className="flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100 lg:hidden dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                aria-label="Toggle task column"
              >
                <span className="sr-only">Toggle task column</span>
                <span className="h-0.5 w-6 rounded-full bg-slate-600 dark:bg-white" />
                <span className="h-0.5 w-6 rounded-full bg-slate-600 dark:bg-white" />
                <span className="h-0.5 w-6 rounded-full bg-slate-600 dark:bg-white" />
              </button>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  SDR Cockpit
                </h1>
                {selectedTask && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                    {selectedTask.name} · {formatFrequency(selectedTask.frequency)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
              <ThemeToggle />
              <CockpitTelemetryRail className="text-sm">
                <ApiModeIndicator />
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-inner shadow-slate-200/60 dark:border-white/10 dark:bg-black/30 dark:shadow-inner dark:shadow-black/20">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Frame Rate
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                    {fps}
                    <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">FPS</span>
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-inner shadow-slate-200/60 dark:border-white/10 dark:bg-black/20 dark:shadow-inner dark:shadow-black/20">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Tasks Online
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{totalTasks}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{operatorTasks} by operator</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-inner shadow-slate-200/60 dark:border-white/10 dark:bg-black/20 dark:shadow-inner dark:shadow-black/20">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Active Status
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                    {taskStatusLabel}
                  </p>
                </div>
              </CockpitTelemetryRail>
            </div>
          </div>
        </CockpitHeaderZone>

        <CockpitColumn
          position="left"
          className={`lg:w-[320px] ${
            isMobile
              ? isSidebarOpen
                ? 'z-50 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-300/60 dark:border-white/10 dark:bg-[rgba(10,10,15,0.95)] dark:shadow-2xl dark:shadow-black/60'
                : 'hidden'
              : ''
          }`}
        >
          <CockpitSpotlightSection>
            <ActiveTaskPanel
              task={selectedTask}
              onPauseTask={pauseTask}
              onStopTask={stopTask}
              onRecordTask={startRecording}
              onStopRecording={stopRecording}
            />
          </CockpitSpotlightSection>

          <CockpitRosterSection className="overflow-hidden">
            <TaskRosterPanel
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              isDiscovering={isDiscovering}
              onSelectTask={selectTask}
              onCreateTask={() => setIsWizardOpen(true)}
            />
          </CockpitRosterSection>
        </CockpitColumn>

        <CockpitColumn position="center" className="flex-1">
          <CockpitMainArea className="backdrop-blur">
            {selectedTask ? (
              <>
                <SpectrumView
                  taskId={selectedTask.id}
                  centerFreq={selectedTask.frequency}
                  sampleRate={selectedTask.sampleRate}
                  colorMap={colorMap}
                  dataError={streamError || undefined}
                  isConnecting={streamStatus === 'connecting'}
                />
                {showPlotSandbox && (
                  <div className="mt-6 flex flex-none justify-center">
                    <PlotSandbox
                      width={Math.min(Math.max(width - 160, 360), 960)}
                      height={260}
                    />
                  </div>
                )}
              </>
            ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center text-slate-500 dark:text-slate-300">
                  <div className="text-6xl">📡</div>
                  <div>
                    <p className="text-xl font-semibold text-slate-900 dark:text-white">No Task Selected</p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
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
          </CockpitMainArea>
        </CockpitColumn>
      </CockpitLayout>

      <TaskWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreateRxTask={createRxTask}
        onCreateTxTask={createTxTask}
      />
    </>
  );
}

export default App;
