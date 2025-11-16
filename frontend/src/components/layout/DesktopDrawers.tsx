/**
 * Desktop drawer collection
 * Task drawer (left) and health panel (right)
 */

import { Drawer } from '../common/Drawer';
import { ActiveTaskPanel } from '../tasks/ActiveTaskPanel/ActiveTaskPanel';
import { TaskRosterPanel } from '../tasks/TaskRosterPanel';
import { SystemHealthPanel } from '../system-health/SystemHealthPanel';
import { Task } from '../../api/client';
import { BitResult } from '../../services/api';

const TASK_DRAWER_WIDTH = 300;
const SYSTEM_HEALTH_PANEL_WIDTH = 300;
const HEADER_HEIGHT = 48;

export interface DesktopDrawersProps {
  // Task Drawer
  isTaskDrawerOpen: boolean;
  isTaskDrawerPinned: boolean;
  selectedTask: Task | null;
  selectedTaskId: string | null;
  tasks: Task[];
  isDiscovering: boolean;
  onCloseTaskDrawer: () => void;
  onToggleTaskDrawerPin: () => void;
  onSelectTask: (taskId: string) => void;
  onCreateTask: () => void;
  onPauseTask: (taskId: string) => Promise<void>;
  onStopTask: (taskId: string) => Promise<void>;
  onStartRecording: (taskId: string) => Promise<void>;
  onStopRecording: (taskId: string) => Promise<void>;

  // Health Panel
  isHealthPanelOpen: boolean;
  isHealthPanelPinned: boolean;
  bitResult: BitResult;
  onCloseHealthPanel: () => void;
  onToggleHealthPanelPin: () => void;
}

export function DesktopDrawers({
  isTaskDrawerOpen,
  isTaskDrawerPinned,
  selectedTask,
  selectedTaskId,
  tasks,
  isDiscovering,
  onCloseTaskDrawer,
  onToggleTaskDrawerPin,
  onSelectTask,
  onCreateTask,
  onPauseTask,
  onStopTask,
  onStartRecording,
  onStopRecording,
  isHealthPanelOpen,
  isHealthPanelPinned,
  bitResult,
  onCloseHealthPanel,
  onToggleHealthPanelPin,
}: DesktopDrawersProps) {
  return (
    <div className="hidden lg:block">
      {/* Task Drawer */}
      <Drawer
        isOpen={isTaskDrawerOpen}
        onClose={onCloseTaskDrawer}
        position="left"
        title="Tasks"
        isPinned={isTaskDrawerPinned}
        onTogglePin={onToggleTaskDrawerPin}
        width={`${TASK_DRAWER_WIDTH}px`}
        offsetTop={HEADER_HEIGHT}
      >
        <div className="p-3">
          <ActiveTaskPanel
            task={selectedTask}
            onPauseTask={onPauseTask}
            onStopTask={onStopTask}
            onRecordTask={onStartRecording}
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

      {/* System Health Drawer */}
      <Drawer
        isOpen={isHealthPanelOpen}
        onClose={onCloseHealthPanel}
        position="right"
        title="System Health"
        isPinned={isHealthPanelPinned}
        onTogglePin={onToggleHealthPanelPin}
        width={`${SYSTEM_HEALTH_PANEL_WIDTH}px`}
        offsetTop={HEADER_HEIGHT}
      >
        <SystemHealthPanel bitResult={bitResult} />
      </Drawer>
    </div>
  );
}
