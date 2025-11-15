import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { getBitResults } from "./api/health";
import { getApiMode } from "./api/config";
import { useTheme } from "./components/app/useTheme";
import { Button } from "./components/common/Button";
import { Drawer } from "./components/common/Drawer";
import { CompactHeader, HealthStatus } from "./components/layout/CompactHeader";
import { MobileNav, MobileView } from "./components/layout/MobileNav";
import { DisplaySettings } from "./components/settings/DisplaySettings";
import { SettingsMenuItem } from "./components/settings/SettingsMenu";
import { SystemSettings } from "./components/settings/SystemSettings";
import { SystemUpdateWizard } from "./components/settings/SystemUpdateWizard";
import { VersionInfo } from "./components/settings/VersionInfo";
import { SystemHealthPanel } from "./components/system-health/SystemHealthPanel";
import { ActiveTaskPanel } from "./components/tasks/ActiveTaskPanel/ActiveTaskPanel";
import { TaskRosterPanel } from "./components/tasks/TaskRosterPanel";
import { TaskWizard } from "./components/tasks/TaskWizard";
import { VisualizationView } from "./components/visualization/VisualizationView";
import { useDataStream, useTasks } from "./hooks";
import { getHealthIndicator } from "./styles/theme";
import { TaskStatus } from "./types/sdr";
import { PLASMA } from "./utils/colorMaps";
import { getMockBitResult, getMockSystemInfo } from "./utils/mockHealth";

const TASK_DRAWER_WIDTH = 300;
const SYSTEM_HEALTH_PANEL_WIDTH = 300;
const HEADER_HEIGHT = 48;

function App() {
  const colorMap = PLASMA;
  const { theme, toggleTheme } = useTheme();

  // UI state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(true); // Open by default
  const [isSystemHealthPanelOpen, setIsSystemHealthPanelOpen] = useState(false);
  const [isTaskDrawerPinned, setIsTaskDrawerPinned] = useState(true); // Keep task bar docked initially
  const [isSystemHealthPanelPinned, setIsSystemHealthPanelPinned] =
    useState(false);
  const [renderFps, setRenderFps] = useState(0);

  // Mobile navigation state
  const [mobileView, setMobileView] = useState<MobileView>("visualization");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Settings modal state
  const [activeSettingsPanel, setActiveSettingsPanel] =
    useState<SettingsMenuItem | null>(null);
  const [isUpdateWizardOpen, setIsUpdateWizardOpen] = useState(false);

  // Health data state
  const [bitResult, setBitResult] = useState(() => getMockBitResult());
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

  // Poll health/BIT data every 3 seconds in online mode
  useEffect(() => {
    const apiMode = getApiMode();

    if (apiMode === 'offline') {
      // In offline mode, just update periodically with new mock data
      const interval = setInterval(() => {
        setBitResult(getMockBitResult());
      }, 3000);
      return () => clearInterval(interval);
    }

    // Online mode - poll the API
    const fetchHealth = async () => {
      try {
        const result = await getBitResults();
        setBitResult(result);
      } catch (error) {
        console.error('Failed to fetch BIT results:', error);
      }
    };

    // Initial fetch
    fetchHealth();

    // Poll every 3 seconds
    const interval = setInterval(fetchHealth, 3000);
    return () => clearInterval(interval);
  }, []);

  // Detect mobile screen size (< 1024px)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");

    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    // Set initial value
    handleMediaChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener("change", handleMediaChange);
    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, []);

  // ESC key handling for modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeSettingsPanel) {
          setActiveSettingsPanel(null);
        } else if (isUpdateWizardOpen) {
          setIsUpdateWizardOpen(false);
        } else if (isMobileNavOpen) {
          setIsMobileNavOpen(false);
        } else if (!isSystemHealthPanelPinned && isSystemHealthPanelOpen) {
          setIsSystemHealthPanelOpen(false);
        } else if (!isTaskDrawerPinned && isTaskDrawerOpen) {
          setIsTaskDrawerOpen(false);
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [
    activeSettingsPanel,
    isUpdateWizardOpen,
    isMobileNavOpen,
    isSystemHealthPanelOpen,
    isSystemHealthPanelPinned,
    isTaskDrawerOpen,
    isTaskDrawerPinned,
  ]);

  // Close unpinned drawers when selecting a task
  const handleSelectTask = (taskId: string) => {
    selectTask(taskId);
    if (!isTaskDrawerPinned) {
      setIsTaskDrawerOpen(false);
    }
  };

  // Handle settings menu selection
  const handleSettingsSelect = (item: SettingsMenuItem) => {
    if (item === "update") {
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
    : isSystemHealthPanelPinned && isSystemHealthPanelOpen
    ? `${SYSTEM_HEALTH_PANEL_WIDTH}px`
    : "0";

  // Get health indicator for mobile nav
  const healthIndicator = getHealthIndicator(healthStatus);

  return (
    <>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
        {/* Compact Header */}
        <CompactHeader
          selectedTask={selectedTask}
          dataFps={fps}
          renderFps={renderFps}
          totalTasks={totalTasks}
          healthStatus={healthStatus}
          isHealthPanelOpen={isSystemHealthPanelOpen}
          isMobile={isMobile}
          onToggleTaskDrawer={handleToggleMenu}
          onToggleHealthPanel={() =>
            setIsSystemHealthPanelOpen((prev) => !prev)
          }
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
              <div className="flex h-full flex-col items-center justify-center gap-6 text-center text-muted-foreground">
                <div className="text-6xl">📡</div>
                <div>
                  <p className="text-xl font-semibold text-foreground">
                    No Task Selected
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground/90">
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
            {mobileView === "visualization" && (
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
                  <div className="flex h-full flex-col items-center justify-center gap-6 text-center text-muted-foreground">
                    <div className="text-6xl">📡</div>
                    <div>
                      <p className="text-xl font-semibold text-foreground">
                        No Task Selected
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground/90">
                        Select a task from the Tasks view.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {mobileView === "tasks" && (
              <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
                <div className="border-b border-border/60 bg-card/80 p-3">
                  <ActiveTaskPanel
                    task={selectedTask}
                    onPauseTask={pauseTask}
                    onStopTask={stopTask}
                    onRecordTask={startRecording}
                    onStopRecording={stopRecording}
                  />
                </div>
                <div className="flex flex-1 min-h-0 overflow-hidden">
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

            {mobileView === "health" && (
              <div className="h-full overflow-auto bg-background">
                <SystemHealthPanel bitResult={bitResult} />
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
          <div className="p-3">
            <ActiveTaskPanel
              task={selectedTask}
              onPauseTask={pauseTask}
              onStopTask={stopTask}
              onRecordTask={startRecording}
              onStopRecording={stopRecording}
            />
          </div>

          <div className="border-t border-border/60">
            <TaskRosterPanel
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              isDiscovering={isDiscovering}
              onSelectTask={handleSelectTask}
              onCreateTask={() => setIsWizardOpen(true)}
            />
          </div>
        </Drawer>

        {/* System Health Drawer */}
        <Drawer
          isOpen={isSystemHealthPanelOpen}
          onClose={() => setIsSystemHealthPanelOpen(false)}
          position="right"
          title="System Health"
          isPinned={isSystemHealthPanelPinned}
          onTogglePin={() => setIsSystemHealthPanelPinned((prev) => !prev)}
          width={`${SYSTEM_HEALTH_PANEL_WIDTH}px`}
          offsetTop={HEADER_HEIGHT}
        >
          <SystemHealthPanel bitResult={bitResult} />
        </Drawer>
      </div>

      {/* Mobile Navigation - only on mobile */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        currentView={mobileView}
        onViewChange={setMobileView}
        onOpenSettings={handleSettingsSelect}
        isDarkMode={theme === "dark"}
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
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in-95 duration-150 rounded-sm border border-border/70 bg-card text-foreground shadow-xl shadow-black/20">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/70 p-4">
              <h2 className="text-lg font-semibold text-foreground">
                {activeSettingsPanel === "system"
                  ? "System Settings"
                  : activeSettingsPanel === "display"
                  ? "Display Settings"
                  : "Version Info"}
              </h2>
              <button
                type="button"
                onClick={() => setActiveSettingsPanel(null)}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] overflow-y-auto">
              {activeSettingsPanel === "system" && <SystemSettings />}
              {activeSettingsPanel === "display" && <DisplaySettings />}
              {activeSettingsPanel === "version" && (
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
