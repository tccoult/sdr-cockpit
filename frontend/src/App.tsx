import { useEffect, useState } from "react";
import { CompactHeader, HealthStatus } from "./components/layout/CompactHeader";
import { Drawer } from "./components/common/Drawer";
import { HealthDrawer } from "./components/health/HealthDrawer";
import { ActiveTaskPanel } from "./components/tasks/ActiveTaskPanel/ActiveTaskPanel";
import { TaskRosterPanel } from "./components/tasks/TaskRosterPanel";
import { TaskWizard } from "./components/tasks/TaskWizard";
import { useDataStream, useTasks } from "./hooks";
import { VisualizationView } from "./components/visualization/VisualizationView";
import { Button } from "./components/common/Button";
import { PLASMA } from "./utils/colorMaps";
import { TaskStatus } from "./types/sdr";

function App() {
  const colorMap = PLASMA;

  // UI state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(true); // Open by default
  const [isHealthDrawerOpen, setIsHealthDrawerOpen] = useState(false);
  const [isTaskDrawerPinned, setIsTaskDrawerPinned] = useState(false);
  const [isHealthDrawerPinned, setIsHealthDrawerPinned] = useState(false);
  const [renderFps, setRenderFps] = useState(0);

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
    paused: selectedTask?.status === TaskStatus.PAUSED, // Pause when task is paused
    visualizationMode: selectedTask?.visualizationMode,
  });

  const totalTasks = tasks.length;
  const operatorTasks = tasks.filter((task) => task.owner === "self").length;

  // Determine health status (placeholder logic)
  const healthStatus: HealthStatus = streamError
    ? "error"
    : streamStatus === "connecting"
    ? "warning"
    : streamStatus === "connected"
    ? "healthy"
    : "unknown";

  useEffect(() => {
    if (isWizardOpen || !selectedTaskId) {
      setRenderFps(0);
    }
  }, [isWizardOpen, selectedTaskId]);

  // Close unpinned drawers when selecting a task
  const handleSelectTask = (taskId: string) => {
    selectTask(taskId);
    if (!isTaskDrawerPinned) {
      setIsTaskDrawerOpen(false);
    }
  };

  // Calculate main area margin based on pinned drawers
  const mainMarginLeft = isTaskDrawerPinned && isTaskDrawerOpen ? "300px" : "0";
  const mainMarginRight = isHealthDrawerPinned && isHealthDrawerOpen ? "300px" : "0";

  return (
    <>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-100 dark:bg-cockpit-surface">
        {/* Compact Header */}
        <CompactHeader
          selectedTask={selectedTask}
          dataFps={fps}
          renderFps={renderFps}
          totalTasks={totalTasks}
          healthStatus={healthStatus}
          onToggleTaskDrawer={() => setIsTaskDrawerOpen((prev) => !prev)}
          onToggleHealthDrawer={() => setIsHealthDrawerOpen((prev) => !prev)}
        />

        {/* Main Content Area */}
        <main
          className="relative flex-1 overflow-hidden transition-all duration-200"
          style={{
            marginLeft: mainMarginLeft,
            marginRight: mainMarginRight,
          }}
        >
          {selectedTask ? (
            <div className="flex h-full w-full flex-col p-2">
              <VisualizationView
                taskId={selectedTask.id}
                centerFreq={selectedTask.frequency}
                sampleRate={selectedTask.sampleRate}
                colorMap={colorMap}
                visualizationMode={selectedTask.visualizationMode}
                dataError={streamError || undefined}
                isConnecting={streamStatus === "connecting"}
                onRenderFpsChange={setRenderFps}
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center text-slate-500 dark:text-slate-300">
              <div className="text-6xl">📡</div>
              <div>
                <p className="text-xl font-semibold text-slate-900 dark:text-white">
                  No Task Selected
                </p>
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
        </main>
      </div>

      {/* Task Drawer */}
      <Drawer
        isOpen={isTaskDrawerOpen}
        onClose={() => setIsTaskDrawerOpen(false)}
        position="left"
        title="Tasks"
        isPinned={isTaskDrawerPinned}
        onTogglePin={() => setIsTaskDrawerPinned((prev) => !prev)}
      >
        <div className="p-4">
          <ActiveTaskPanel
            task={selectedTask}
            onPauseTask={pauseTask}
            onStopTask={stopTask}
            onRecordTask={startRecording}
            onStopRecording={stopRecording}
          />
        </div>

        <div className="border-t border-slate-200 dark:border-white/10">
          <TaskRosterPanel
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            isDiscovering={isDiscovering}
            onSelectTask={handleSelectTask}
            onCreateTask={() => setIsWizardOpen(true)}
          />
        </div>
      </Drawer>

      {/* Health Drawer */}
      <Drawer
        isOpen={isHealthDrawerOpen}
        onClose={() => setIsHealthDrawerOpen(false)}
        position="right"
        title="System Health & Telemetry"
        isPinned={isHealthDrawerPinned}
        onTogglePin={() => setIsHealthDrawerPinned((prev) => !prev)}
      >
        <HealthDrawer
          dataFps={fps}
          renderFps={renderFps}
          totalTasks={totalTasks}
          operatorTasks={operatorTasks}
          selectedTask={selectedTask}
          streamStatus={streamStatus}
          streamError={streamError}
          healthStatus={healthStatus}
        />
      </Drawer>

      {/* Task Wizard */}
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
