import { useMemo } from "react";

import type { DataStreamStatus } from "../../api";
import { Drawer } from "../common/Drawer";
import { CompactHeader } from "../layout/CompactHeader";
import type { MobileView } from "../layout/MobileNav";
import { SystemHealthPanel } from "../system-health/SystemHealthPanel";
import { ActiveTaskPanel } from "../tasks/ActiveTaskPanel/ActiveTaskPanel";
import { TaskRosterPanel } from "../tasks/TaskRosterPanel";
import { VisualizationView } from "../visualization/VisualizationView";
import {
  HEADER_HEIGHT,
  SYSTEM_HEALTH_PANEL_WIDTH,
  TASK_DRAWER_WIDTH,
  useLayout,
} from "./layout";
import type { HealthStatus } from "../layout/CompactHeader";
import { Button } from "../common/Button";
import type { SettingsMenuItem } from "../settings/SettingsMenu";
import type { Task } from "../../types/sdr";
import type { BistResult } from "../../types/diagnostics";
import type { ColorMap } from "../../utils/colorMaps";

export interface AppShellProps {
  selectedTask: Task | null;
  selectedTaskId: string | null;
  tasks: Task[];
  totalTasks: number;
  isDiscovering: boolean;
  onSelectTask: (taskId: string) => void;
  onCreateTask: () => void;
  onPauseTask: (taskId: string) => Promise<void>;
  onStopTask: (taskId: string) => Promise<void>;
  onRecordTask: (taskId: string) => Promise<void>;
  onStopRecording: (taskId: string) => Promise<void>;
  dataFps: number;
  renderFps: number;
  onRenderFpsChange: (fps: number) => void;
  streamStatus: DataStreamStatus;
  streamError: string | null;
  healthStatus: HealthStatus;
  onOpenSettings: (item: SettingsMenuItem) => void;
  bistResult: BistResult | null;
  colorMap: ColorMap;
  mobileView: MobileView;
  onMobileViewChange: (view: MobileView) => void;
}

export function AppShell({
  selectedTask,
  selectedTaskId,
  tasks,
  totalTasks,
  isDiscovering,
  onSelectTask,
  onCreateTask,
  onPauseTask,
  onStopTask,
  onRecordTask,
  onStopRecording,
  dataFps,
  renderFps,
  onRenderFpsChange,
  streamStatus,
  streamError,
  healthStatus,
  onOpenSettings,
  bistResult,
  colorMap,
  mobileView,
  onMobileViewChange,
}: AppShellProps) {
  const {
    isMobile,
    togglePrimaryNavigation,
    toggleSystemHealthPanel,
    isSystemHealthPanelOpen,
    isSystemHealthPanelPinned,
    toggleSystemHealthPanelPin,
    isTaskDrawerOpen,
    isTaskDrawerPinned,
    toggleTaskDrawerPin,
    closeTaskDrawer,
    closeSystemHealthPanel,
    mainOffsets,
  } = useLayout();

  const mainStyle = useMemo(
    () => ({
      marginLeft: `${mainOffsets.left}px`,
      marginRight: `${mainOffsets.right}px`,
    }),
    [mainOffsets.left, mainOffsets.right]
  );

  return (
    <>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
        <CompactHeader
          selectedTask={selectedTask}
          dataFps={dataFps}
          renderFps={renderFps}
          totalTasks={totalTasks}
          healthStatus={healthStatus}
          isHealthPanelOpen={isSystemHealthPanelOpen}
          isMobile={isMobile}
          onToggleTaskDrawer={togglePrimaryNavigation}
          onToggleHealthPanel={toggleSystemHealthPanel}
          onOpenSettings={onOpenSettings}
        />

        <main
          className="relative flex-1 overflow-hidden transition-all duration-200"
          style={mainStyle}
        >
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
                  onRenderFpsChange={onRenderFpsChange}
                />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-6 text-center text-muted-foreground">
                <div className="text-6xl">📡</div>
                <div>
                  <p className="text-xl font-semibold text-foreground">No Task Selected</p>
                  <p className="mt-2 text-sm text-muted-foreground/90">
                    Select a task from the roster to view spectrum activity.
                  </p>
                </div>
                <Button onClick={onCreateTask} variant="secondary" size="lg">
                  + Create New Task
                </Button>
              </div>
            )}
          </div>

          <div className="h-full lg:hidden">
            <MobileMainView
              selectedTask={selectedTask}
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              isDiscovering={isDiscovering}
              onSelectTask={onSelectTask}
              onCreateTask={onCreateTask}
              onPauseTask={onPauseTask}
              onStopTask={onStopTask}
              onRecordTask={onRecordTask}
              onStopRecording={onStopRecording}
              streamStatus={streamStatus}
              streamError={streamError}
              onRenderFpsChange={onRenderFpsChange}
              colorMap={colorMap}
              mobileView={mobileView}
              onMobileViewChange={onMobileViewChange}
              bistResult={bistResult}
            />
          </div>
        </main>
      </div>

      <div className="hidden lg:block">
        <Drawer
          isOpen={isTaskDrawerOpen}
          onClose={closeTaskDrawer}
          position="left"
          title="Tasks"
          isPinned={isTaskDrawerPinned}
          onTogglePin={toggleTaskDrawerPin}
          width={`${TASK_DRAWER_WIDTH}px`}
          offsetTop={HEADER_HEIGHT}
        >
          <div className="p-3">
            <ActiveTaskPanel
              task={selectedTask}
              onPauseTask={onPauseTask}
              onStopTask={onStopTask}
              onRecordTask={onRecordTask}
              onStopRecording={onStopRecording}
            />
          </div>

          <div className="border-t border-border/60">
            <TaskRosterPanel
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              isDiscovering={isDiscovering}
              onSelectTask={onSelectTask}
              onCreateTask={onCreateTask}
            />
          </div>
        </Drawer>

        <Drawer
          isOpen={isSystemHealthPanelOpen}
          onClose={closeSystemHealthPanel}
          position="right"
          title="System Health"
          isPinned={isSystemHealthPanelPinned}
          onTogglePin={toggleSystemHealthPanelPin}
          width={`${SYSTEM_HEALTH_PANEL_WIDTH}px`}
          offsetTop={HEADER_HEIGHT}
        >
          <SystemHealthPanel bistResult={bistResult} />
        </Drawer>
      </div>
    </>
  );
}

interface MobileMainViewProps {
  selectedTask: Task | null;
  tasks: Task[];
  selectedTaskId: string | null;
  isDiscovering: boolean;
  onSelectTask: (taskId: string) => void;
  onCreateTask: () => void;
  onPauseTask: (taskId: string) => Promise<void>;
  onStopTask: (taskId: string) => Promise<void>;
  onRecordTask: (taskId: string) => Promise<void>;
  onStopRecording: (taskId: string) => Promise<void>;
  streamStatus: DataStreamStatus;
  streamError: string | null;
  onRenderFpsChange: (fps: number) => void;
  colorMap: ColorMap;
  mobileView: MobileView;
  onMobileViewChange: (view: MobileView) => void;
  bistResult: BistResult | null;
}

function MobileMainView({
  selectedTask,
  tasks,
  selectedTaskId,
  isDiscovering,
  onSelectTask,
  onCreateTask,
  onPauseTask,
  onStopTask,
  onRecordTask,
  onStopRecording,
  streamStatus,
  streamError,
  onRenderFpsChange,
  colorMap,
  mobileView,
  onMobileViewChange,
  bistResult,
}: MobileMainViewProps) {
  if (mobileView === "visualization") {
    return (
      <div className="flex h-full w-full flex-col p-2">
        {selectedTask ? (
          <VisualizationView
            taskId={selectedTask.id}
            centerFreq={selectedTask.frequency}
            sampleRate={selectedTask.sampleRate}
            colorMap={colorMap}
            visualizationMode={selectedTask.visualizationMode}
            dataError={streamError || undefined}
            isConnecting={streamStatus === "connecting"}
            onRenderFpsChange={onRenderFpsChange}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center text-muted-foreground">
            <div className="text-6xl">📡</div>
            <div>
              <p className="text-xl font-semibold text-foreground">No Task Selected</p>
              <p className="mt-2 text-sm text-muted-foreground/90">
                Select a task from the Tasks view.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mobileView === "tasks") {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
        <div className="border-b border-border/60 bg-card/80 p-3">
          <ActiveTaskPanel
            task={selectedTask}
            onPauseTask={onPauseTask}
            onStopTask={onStopTask}
            onRecordTask={onRecordTask}
            onStopRecording={onStopRecording}
          />
        </div>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <TaskRosterPanel
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            isDiscovering={isDiscovering}
            onSelectTask={(taskId) => {
              onSelectTask(taskId);
              onMobileViewChange("visualization");
            }}
            onCreateTask={onCreateTask}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background">
      <SystemHealthPanel bistResult={bistResult} />
    </div>
  );
}
