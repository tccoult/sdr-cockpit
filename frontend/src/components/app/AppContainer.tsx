import { useCallback, useEffect, useMemo, useState } from "react";

import { useDataStream, useDiagnostics, useEscapeKey, useTasks } from "../../hooks";
import { getHealthIndicator } from "../../styles/theme";
import { TaskStatus } from "../../types/sdr";
import { PLASMA } from "../../utils/colorMaps";
import { AppShell } from "./AppShell";
import { LayoutProvider, useLayout } from "./layout";
import { SettingsOverlay } from "./SettingsOverlay";
import { useTheme } from "./useTheme";
import { MobileNav } from "../layout/MobileNav";
import type { MobileView } from "../layout/MobileNav";
import type { SettingsMenuItem } from "../settings/SettingsMenu";
import { SystemUpdateWizard } from "../settings/SystemUpdateWizard";
import { TaskWizard } from "../tasks/TaskWizard";

export function AppContainer() {
  return (
    <LayoutProvider>
      <AppContent />
    </LayoutProvider>
  );
}

function AppContent() {
  const { theme, toggleTheme } = useTheme();

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [activeSettingsPanel, setActiveSettingsPanel] =
    useState<SettingsMenuItem | null>(null);
  const [isUpdateWizardOpen, setIsUpdateWizardOpen] = useState(false);
  const [renderFps, setRenderFps] = useState(0);

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

  const { fps, streamStatus, streamError } = useDataStream({
    taskId: selectedTaskId,
    centerFreq: selectedTask?.frequency,
    sampleRate: selectedTask?.sampleRate,
    fftSize: selectedTask?.fftSize,
    enabled: !isWizardOpen,
    paused: selectedTask?.status === TaskStatus.PAUSED,
    visualizationMode: selectedTask?.visualizationMode,
  });

  const diagnostics = useDiagnostics();

  useEffect(() => {
    if (isWizardOpen || !selectedTaskId) {
      setRenderFps(0);
    }
  }, [isWizardOpen, selectedTaskId]);

  const openTaskWizard = useCallback(() => setIsWizardOpen(true), []);
  const closeTaskWizard = useCallback(() => setIsWizardOpen(false), []);

  const openUpdateWizard = useCallback(
    () => setIsUpdateWizardOpen(true),
    []
  );
  const closeUpdateWizard = useCallback(
    () => setIsUpdateWizardOpen(false),
    []
  );

  const openSettingsPanel = useCallback(
    (item: SettingsMenuItem) => {
      if (item === "update") {
        openUpdateWizard();
        return;
      }
      setActiveSettingsPanel(item);
    },
    [openUpdateWizard]
  );

  const closeSettingsPanel = useCallback(
    () => setActiveSettingsPanel(null),
    []
  );

  const layout = useLayout();
  const {
    mobileView,
    setMobileView,
    isMobileNavOpen,
    closeMobileNav,
    handleTaskActivated,
    isTaskDrawerOpen,
    isTaskDrawerPinned,
    closeTaskDrawer,
    isSystemHealthPanelOpen,
    isSystemHealthPanelPinned,
    closeSystemHealthPanel,
  } = layout;

  const updateMobileView = useCallback(
    (view: MobileView) => {
      setMobileView(view);
    },
    [setMobileView]
  );

  const handleSelectTask = useCallback(
    (taskId: string) => {
      selectTask(taskId);
      handleTaskActivated();
    },
    [handleTaskActivated, selectTask]
  );

  const totalTasks = tasks.length;

  const healthStatus = useMemo(() => {
    if (streamError) return "error" as const;
    if (streamStatus === "connecting") return "warning" as const;
    if (streamStatus === "connected") return "healthy" as const;
    return "unknown" as const;
  }, [streamError, streamStatus]);

  const healthIndicator = useMemo(
    () => getHealthIndicator(healthStatus),
    [healthStatus]
  );

  const handleEscape = useCallback(() => {
    if (activeSettingsPanel) {
      closeSettingsPanel();
    } else if (isUpdateWizardOpen) {
      closeUpdateWizard();
    } else if (isMobileNavOpen) {
      closeMobileNav();
    } else if (!isSystemHealthPanelPinned && isSystemHealthPanelOpen) {
      closeSystemHealthPanel();
    } else if (!isTaskDrawerPinned && isTaskDrawerOpen) {
      closeTaskDrawer();
    }
  }, [
    activeSettingsPanel,
    closeMobileNav,
    closeSettingsPanel,
    closeSystemHealthPanel,
    closeTaskDrawer,
    closeUpdateWizard,
    isMobileNavOpen,
    isSystemHealthPanelOpen,
    isSystemHealthPanelPinned,
    isTaskDrawerOpen,
    isTaskDrawerPinned,
    isUpdateWizardOpen,
  ]);

  const escapeHandlerEnabled =
    Boolean(activeSettingsPanel) ||
    isUpdateWizardOpen ||
    isMobileNavOpen ||
    (!isSystemHealthPanelPinned && isSystemHealthPanelOpen) ||
    (!isTaskDrawerPinned && isTaskDrawerOpen);

  useEscapeKey(handleEscape, escapeHandlerEnabled);

  const diagnosticsSnapshot = diagnostics.snapshot;

  return (
    <>
      <AppShell
        selectedTask={selectedTask}
        selectedTaskId={selectedTaskId}
        tasks={tasks}
        totalTasks={totalTasks}
        isDiscovering={isDiscovering}
        onSelectTask={handleSelectTask}
        onCreateTask={openTaskWizard}
        onPauseTask={pauseTask}
        onStopTask={stopTask}
        onRecordTask={startRecording}
        onStopRecording={stopRecording}
        dataFps={fps}
        renderFps={renderFps}
        onRenderFpsChange={setRenderFps}
        streamStatus={streamStatus}
        streamError={streamError}
        healthStatus={healthStatus}
        onOpenSettings={openSettingsPanel}
        bistResult={diagnosticsSnapshot?.bistResult ?? null}
        colorMap={PLASMA}
        mobileView={mobileView}
        onMobileViewChange={updateMobileView}
      />

      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={closeMobileNav}
        currentView={mobileView}
        onViewChange={updateMobileView}
        onOpenSettings={openSettingsPanel}
        isDarkMode={theme === "dark"}
        onToggleTheme={toggleTheme}
        healthIndicator={healthIndicator}
      />

      <TaskWizard
        isOpen={isWizardOpen}
        onClose={closeTaskWizard}
        onCreateRxTask={createRxTask}
        onCreateTxTask={createTxTask}
      />

      <SettingsOverlay
        activePanel={activeSettingsPanel}
        onClose={closeSettingsPanel}
        systemInfo={diagnosticsSnapshot?.systemInfo ?? null}
        isLoading={diagnostics.isLoading}
        error={diagnostics.error}
      />

      <SystemUpdateWizard
        isOpen={isUpdateWizardOpen}
        onClose={closeUpdateWizard}
      />
    </>
  );
}
