/**
 * Desktop drawer collection
 * Task drawer (left) and health panel (right)
 */

import { Drawer } from '../common/Drawer';
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
  tasks: Task[];
  isDiscovering: boolean;
  onCloseTaskDrawer: () => void;
  onToggleTaskDrawerPin: () => void;
  onTaskInteraction: () => void;
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
  tasks,
  isDiscovering,
  onCloseTaskDrawer,
  onToggleTaskDrawerPin,
  onTaskInteraction,
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
        <TaskRosterPanel
          tasks={tasks}
          isDiscovering={isDiscovering}
          onCreateTask={onCreateTask}
          onTaskInteraction={onTaskInteraction}
          onPauseTask={onPauseTask}
          onStopTask={onStopTask}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
        />
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
