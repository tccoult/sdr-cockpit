/**
 * Mobile content view switcher
 * Shows visualization, tasks, or health based on active view
 */

import { Task } from '../../api/client';
import { DataStreamStatus } from '../../api';
import { BitResult } from '../../services/api';
import { ColorMap } from '../../utils/colorMaps';
import { MobileView } from './MobileNav';
import { SourceVisualizationPanel } from '../visualization/SourceVisualizationPanel';
import { ActiveTaskPanel } from '../tasks/ActiveTaskPanel/ActiveTaskPanel';
import { TaskRosterPanel } from '../tasks/TaskRosterPanel';
import { SystemHealthPanel } from '../system-health/SystemHealthPanel';

export interface MobileContentViewProps {
  mobileView: MobileView;
  selectedTask: Task | null;
  selectedTaskId: string | null;
  tasks: Task[];
  isDiscovering: boolean;
  bitResult: BitResult;
  colorMap: ColorMap;
  streamError: string | null;
  streamStatus: DataStreamStatus;
  onRenderFpsChange: (fps: number) => void;
  onSelectTask: (taskId: string) => void;
  onCreateTask: () => void;
  onPauseTask: (taskId: string) => Promise<void>;
  onStopTask: (taskId: string) => Promise<void>;
  onStartRecording: (taskId: string) => Promise<void>;
  onStopRecording: (taskId: string) => Promise<void>;
}

export function MobileContentView({
  mobileView,
  selectedTask,
  selectedTaskId,
  tasks,
  isDiscovering,
  bitResult,
  colorMap,
  streamError: _streamError,
  streamStatus: _streamStatus,
  onRenderFpsChange,
  onSelectTask,
  onCreateTask,
  onPauseTask,
  onStopTask,
  onStartRecording,
  onStopRecording,
}: MobileContentViewProps) {
  if (mobileView === 'visualization') {
    return (
      <div className="flex h-full w-full flex-col p-2">
        <SourceVisualizationPanel
          colorMap={colorMap}
          onRenderFpsChange={onRenderFpsChange}
        />
      </div>
    );
  }

  if (mobileView === 'tasks') {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
        <div className="border-b border-border/60 bg-card/80 p-3">
          <ActiveTaskPanel
            task={selectedTask}
            onPauseTask={onPauseTask}
            onStopTask={onStopTask}
            onRecordTask={onStartRecording}
            onStopRecording={onStopRecording}
          />
        </div>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <TaskRosterPanel
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            isDiscovering={isDiscovering}
            onSelectTask={onSelectTask}
            onCreateTask={onCreateTask}
          />
        </div>
      </div>
    );
  }

  // mobileView === 'health'
  return (
    <div className="h-full overflow-auto bg-background">
      <SystemHealthPanel bitResult={bitResult} />
    </div>
  );
}
