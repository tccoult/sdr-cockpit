/**
 * SDR Cockpit Main Application
 * Refactored for clarity and maintainability
 */

import { useEffect, useState } from 'react';
import { useTheme } from './components/app/useTheme';
import { CompactHeader, HealthStatus } from './components/layout/CompactHeader';
import { MobileNav, MobileView } from './components/layout/MobileNav';
import { DesktopView } from './components/layout/DesktopView';
import { MobileContentView } from './components/layout/MobileContentView';
import { DesktopDrawers } from './components/layout/DesktopDrawers';
import { Modals } from './components/layout/Modals';
import {
  useTasks,
  useHealthData,
  useUIPreferences,
  useMobile,
  useKeyboardShortcuts,
} from './hooks';
import { useDataSources } from './hooks/api/useDataSources';
import { SettingsMenuItem } from './components/settings/SettingsMenu';
import { getHealthIndicator } from './styles/theme';
import { PLASMA } from './utils/colorMaps';
import { getMockSystemInfo } from './mocks/mockHealth';

const TASK_DRAWER_WIDTH = 300;
const SYSTEM_HEALTH_PANEL_WIDTH = 300;

function App() {
  const colorMap = PLASMA;
  const { theme, toggleTheme } = useTheme();
  const isMobile = useMobile();

  // Data hooks
  const bitResult = useHealthData();
  const systemInfo = getMockSystemInfo();

  // UI state
  const [renderFps, setRenderFps] = useState(0);
  const [mobileView, setMobileView] = useState<MobileView>('visualization');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isTaskWizardOpen, setIsTaskWizardOpen] = useState(false);
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<SettingsMenuItem | null>(null);
  const [isUpdateWizardOpen, setIsUpdateWizardOpen] = useState(false);

  // UI preferences (with localStorage)
  const {
    isTaskDrawerOpen,
    setIsTaskDrawerOpen,
    isTaskDrawerPinned,
    setIsTaskDrawerPinned,
    isHealthPanelOpen,
    setIsHealthPanelOpen,
    isHealthPanelPinned,
    setIsHealthPanelPinned,
  } = useUIPreferences();

  // Task management
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

  // Pre-fetch data sources for visualization controls dropdown
  useDataSources();

  // Keyboard shortcuts (ESC)
  useKeyboardShortcuts({
    activeSettingsPanel,
    setActiveSettingsPanel,
    isUpdateWizardOpen,
    setIsUpdateWizardOpen,
    isMobileNavOpen,
    setIsMobileNavOpen,
    isHealthPanelOpen: isHealthPanelOpen,
    setIsHealthPanelOpen,
    isHealthPanelPinned,
    isTaskDrawerOpen,
    setIsTaskDrawerOpen,
    isTaskDrawerPinned,
  });

  // Reset render FPS when wizard opens
  useEffect(() => {
    if (isTaskWizardOpen) {
      setRenderFps(0);
    }
  }, [isTaskWizardOpen]);

  // Handlers
  const handleSelectTask = (taskId: string) => {
    selectTask(taskId);
    if (!isTaskDrawerPinned) {
      setIsTaskDrawerOpen(false);
    }
  };

  const handleSettingsSelect = (item: SettingsMenuItem) => {
    if (item === 'update') {
      setIsUpdateWizardOpen(true);
    } else {
      setActiveSettingsPanel(item);
    }
  };

  const handleToggleMenu = () => {
    if (isMobile) {
      setIsMobileNavOpen((prev) => !prev);
    } else {
      setIsTaskDrawerOpen((prev) => !prev);
    }
  };

  // Layout calculations
  const mainMarginLeft = isMobile
    ? '0'
    : isTaskDrawerPinned && isTaskDrawerOpen
    ? `${TASK_DRAWER_WIDTH}px`
    : '0';
  const mainMarginRight = isMobile
    ? '0'
    : isHealthPanelPinned && isHealthPanelOpen
    ? `${SYSTEM_HEALTH_PANEL_WIDTH}px`
    : '0';

  // Health status (simplified - no longer tracking stream status here)
  const healthStatus: HealthStatus = 'healthy';

  const healthIndicator = getHealthIndicator(healthStatus);

  return (
    <>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
        {/* Header */}
        <CompactHeader
          selectedTask={selectedTask}
          dataFps={0}
          renderFps={renderFps}
          totalTasks={tasks.length}
          healthStatus={healthStatus}
          isHealthPanelOpen={isHealthPanelOpen}
          isMobile={isMobile}
          onToggleTaskDrawer={handleToggleMenu}
          onToggleHealthPanel={() => setIsHealthPanelOpen((prev) => !prev)}
          onOpenSettings={handleSettingsSelect}
        />

        {/* Main Content */}
        <main
          className="relative flex-1 overflow-hidden transition-all duration-200"
          style={{ marginLeft: mainMarginLeft, marginRight: mainMarginRight }}
        >
          {/* Desktop View */}
          <div className="hidden h-full lg:block">
            <DesktopView
              colorMap={colorMap}
              onRenderFpsChange={setRenderFps}
            />
          </div>

          {/* Mobile View */}
          <div className="h-full lg:hidden">
            <MobileContentView
              mobileView={mobileView}
              selectedTask={selectedTask}
              selectedTaskId={selectedTaskId}
              tasks={tasks}
              isDiscovering={isDiscovering}
              bitResult={bitResult}
              colorMap={colorMap}
              streamError={null}
              streamStatus="disconnected"
              onRenderFpsChange={setRenderFps}
              onSelectTask={selectTask}
              onCreateTask={() => setIsTaskWizardOpen(true)}
              onPauseTask={pauseTask}
              onStopTask={stopTask}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
            />
          </div>
        </main>
      </div>

      {/* Desktop Drawers */}
      <DesktopDrawers
        isTaskDrawerOpen={isTaskDrawerOpen}
        isTaskDrawerPinned={isTaskDrawerPinned}
        selectedTask={selectedTask}
        selectedTaskId={selectedTaskId}
        tasks={tasks}
        isDiscovering={isDiscovering}
        onCloseTaskDrawer={() => setIsTaskDrawerOpen(false)}
        onToggleTaskDrawerPin={() => setIsTaskDrawerPinned((prev) => !prev)}
        onSelectTask={handleSelectTask}
        onCreateTask={() => setIsTaskWizardOpen(true)}
        onPauseTask={pauseTask}
        onStopTask={stopTask}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        isHealthPanelOpen={isHealthPanelOpen}
        isHealthPanelPinned={isHealthPanelPinned}
        bitResult={bitResult}
        onCloseHealthPanel={() => setIsHealthPanelOpen(false)}
        onToggleHealthPanelPin={() => setIsHealthPanelPinned((prev) => !prev)}
      />

      {/* Mobile Navigation */}
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

      {/* Modals */}
      <Modals
        isTaskWizardOpen={isTaskWizardOpen}
        onCloseTaskWizard={() => setIsTaskWizardOpen(false)}
        onCreateRxTask={createRxTask}
        onCreateTxTask={createTxTask}
        activeSettingsPanel={activeSettingsPanel}
        systemInfo={systemInfo}
        onCloseSettings={() => setActiveSettingsPanel(null)}
        isUpdateWizardOpen={isUpdateWizardOpen}
        onCloseUpdateWizard={() => setIsUpdateWizardOpen(false)}
      />
    </>
  );
}

export default App;
