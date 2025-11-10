import { useEffect, useState } from "react";
import { CompactHeader, HealthStatus } from "./components/layout/CompactHeader";
import { Drawer } from "./components/common/Drawer";
import { MobileNav, MobileView } from "./components/layout/MobileNav";
import { StatusPanel } from "./components/status/StatusPanel";
import { ActiveTaskPanel } from "./components/tasks/ActiveTaskPanel/ActiveTaskPanel";
import { TaskRosterPanel } from "./components/tasks/TaskRosterPanel";
import { TaskWizard } from "./components/tasks/TaskWizard";
import { SettingsMenuItem } from "./components/settings/SettingsMenu";
import { SystemSettings } from "./components/settings/SystemSettings";
import { DisplaySettings } from "./components/settings/DisplaySettings";
import { VersionInfo } from "./components/settings/VersionInfo";
import { SystemUpdateWizard } from "./components/settings/SystemUpdateWizard";
import { useDataStream, useTasks } from "./hooks";
import { VisualizationView } from "./components/visualization/VisualizationView";
import { Button } from "./components/common/Button";
import { PLASMA } from "./utils/colorMaps";
import { TaskStatus } from "./types/sdr";
import { getMockBistResult, getMockSystemInfo } from "./utils/mockDiagnostics";
import { X } from "lucide-react";
import { useTheme } from "./components/app/useTheme";
import { getHealthIndicator } from "./styles/themeColors";

const TASK_DRAWER_WIDTH = 300;
const STATUS_PANEL_WIDTH = 300;
const HEADER_HEIGHT = 48;

function App() {
  const colorMap = PLASMA;
  const { theme, toggleTheme } = useTheme();

  // UI state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(true); // Open by default
  const [isStatusPanelOpen, setIsStatusPanelOpen] = useState(false);
  const [isTaskDrawerPinned, setIsTaskDrawerPinned] = useState(true); // Keep task bar docked initially
  const [isStatusPanelPinned, setIsStatusPanelPinned] = useState(false);
  const [renderFps, setRenderFps] = useState(0);

  // Mobile navigation state
  const [mobileView, setMobileView] = useState<MobileView>('visualization');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Settings modal state
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<SettingsMenuItem | null>(null);
  const [isUpdateWizardOpen, setIsUpdateWizardOpen] = useState(false);

  // Mock data
  const bistResult = getMockBistResult();
  const systemInfo = getMockSystemInfo();

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

  // Detect mobile screen size (< 1024px)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');

    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    // Set initial value
    handleMediaChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  // ESC key handling for modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeSettingsPanel) {
          setActiveSettingsPanel(null);
        } else if (isUpdateWizardOpen) {
          setIsUpdateWizardOpen(false);
        } else if (isMobileNavOpen) {
          setIsMobileNavOpen(false);
        } else if (!isStatusPanelPinned && isStatusPanelOpen) {
          setIsStatusPanelOpen(false);
        } else if (!isTaskDrawerPinned && isTaskDrawerOpen) {
          setIsTaskDrawerOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [activeSettingsPanel, isUpdateWizardOpen, isMobileNavOpen, isStatusPanelOpen, isStatusPanelPinned, isTaskDrawerOpen, isTaskDrawerPinned]);

  // Close unpinned drawers when selecting a task
  const handleSelectTask = (taskId: string) => {
    selectTask(taskId);
    if (!isTaskDrawerPinned) {
      setIsTaskDrawerOpen(false);
    }
  };

  // Handle settings menu selection
  const handleSettingsSelect = (item: SettingsMenuItem) => {
    if (item === 'update') {
      setIsUpdateWizardOpen(true);
    } else {
      setActiveSettingsPanel(item);
    }
  };

  // Handle hamburger button click (mobile nav or task drawer based on screen size)
  const handleToggleMenu = () => {
    if (isMobile) {
      setIsMobileNavOpen((prev) => !prev);
    } else {
      setIsTaskDrawerOpen((prev) => !prev);
    }
  };

  // Calculate main area margin based on pinned drawers (desktop only)
  const mainMarginLeft = isMobile
    ? "0"
    : isTaskDrawerPinned && isTaskDrawerOpen
    ? `${TASK_DRAWER_WIDTH}px`
    : "0";
  const mainMarginRight = isMobile
    ? "0"
    : isStatusPanelPinned && isStatusPanelOpen
    ? `${STATUS_PANEL_WIDTH}px`
    : "0";

  // Get health indicator for mobile nav
  const healthIndicator = getHealthIndicator(healthStatus);

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
          isStatusPanelOpen={isStatusPanelOpen}
          isMobile={isMobile}
          onToggleTaskDrawer={handleToggleMenu}
          onToggleStatusPanel={() => setIsStatusPanelOpen((prev) => !prev)}
          onOpenSettings={handleSettingsSelect}
        />

        {/* Main Content Area */}
        <main
          className="relative flex-1 overflow-hidden transition-all duration-200"
          style={{
            marginLeft: mainMarginLeft,
            marginRight: mainMarginRight,
          }}
        >
          {/* Desktop View: Visualization only */}
          <div className="hidden h-full lg:block">
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
          </div>

          {/* Mobile View: Selected panel only */}
          <div className="h-full lg:hidden">
            {mobileView === 'visualization' && (
              <>
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
                        Select a task from the Tasks view.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {mobileView === 'tasks' && (
              <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-slate-900">
                <div className="border-b border-slate-200 p-4 dark:border-white/10">
                  <ActiveTaskPanel
                    task={selectedTask}
                    onPauseTask={pauseTask}
                    onStopTask={stopTask}
                    onRecordTask={startRecording}
                    onStopRecording={stopRecording}
                  />
                </div>
                <div className="flex-1 overflow-hidden">
                  <TaskRosterPanel
                    tasks={tasks}
                    selectedTaskId={selectedTaskId}
                    isDiscovering={isDiscovering}
                    onSelectTask={selectTask}
                    onCreateTask={() => setIsWizardOpen(true)}
                  />
                </div>
              </div>
            )}

            {mobileView === 'status' && (
              <div className="h-full overflow-auto bg-white dark:bg-slate-900">
                <StatusPanel
                  dataFps={fps}
                  renderFps={renderFps}
                  totalTasks={totalTasks}
                  operatorTasks={operatorTasks}
                  selectedTask={selectedTask}
                  streamStatus={streamStatus}
                  streamError={streamError}
                  healthStatus={healthStatus}
                  bistResult={bistResult}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Desktop Drawers - hidden on mobile */}
      <div className="hidden lg:block">
        {/* Task Drawer */}
        <Drawer
          isOpen={isTaskDrawerOpen}
          onClose={() => setIsTaskDrawerOpen(false)}
          position="left"
          title="Tasks"
          isPinned={isTaskDrawerPinned}
          onTogglePin={() => setIsTaskDrawerPinned((prev) => !prev)}
          width={`${TASK_DRAWER_WIDTH}px`}
          offsetTop={HEADER_HEIGHT}
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

        {/* Status Panel Drawer */}
        <Drawer
          isOpen={isStatusPanelOpen}
          onClose={() => setIsStatusPanelOpen(false)}
          position="right"
          title="System Status"
          isPinned={isStatusPanelPinned}
          onTogglePin={() => setIsStatusPanelPinned((prev) => !prev)}
          width={`${STATUS_PANEL_WIDTH}px`}
          offsetTop={HEADER_HEIGHT}
        >
          <StatusPanel
            dataFps={fps}
            renderFps={renderFps}
            totalTasks={totalTasks}
            operatorTasks={operatorTasks}
            selectedTask={selectedTask}
            streamStatus={streamStatus}
            streamError={streamError}
            healthStatus={healthStatus}
            bistResult={bistResult}
          />
        </Drawer>
      </div>

      {/* Mobile Navigation - only on mobile */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        currentView={mobileView}
        onViewChange={setMobileView}
        onOpenSettings={handleSettingsSelect}
        isDarkMode={theme === 'dark'}
        onToggleTheme={toggleTheme}
        healthIndicator={healthIndicator}
      />

      {/* Task Wizard */}
      <TaskWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreateRxTask={createRxTask}
        onCreateTxTask={createTxTask}
      />

      {/* Settings Modal */}
      {activeSettingsPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setActiveSettingsPanel(null)}
          />

          {/* Modal */}
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in-95 duration-150 rounded-sm border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-white/10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {activeSettingsPanel === 'system'
                  ? 'System Settings'
                  : activeSettingsPanel === 'display'
                  ? 'Display Settings'
                  : 'Version Info'}
              </h2>
              <button
                type="button"
                onClick={() => setActiveSettingsPanel(null)}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] overflow-y-auto">
              {activeSettingsPanel === 'system' && <SystemSettings />}
              {activeSettingsPanel === 'display' && <DisplaySettings />}
              {activeSettingsPanel === 'version' && (
                <VersionInfo
                  versionTree={systemInfo.versionTree}
                  overallVersion={systemInfo.version}
                  buildDate={systemInfo.buildDate}
                  platform={systemInfo.platform}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* System Update Wizard */}
      <SystemUpdateWizard
        isOpen={isUpdateWizardOpen}
        onClose={() => setIsUpdateWizardOpen(false)}
      />
    </>
  );
}

export default App;
