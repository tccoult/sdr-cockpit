/**
 * Mobile content view switcher
 * Shows visualization, tasks, or health based on active view
 */

import { Task } from '../../api/client';
import { DataStreamStatus } from '../../api';
import { BitResult } from '../../services/api';
import { ColorMap } from '../../utils/colorMaps';
import { MobileView } from './MobileNav';
import { VisualizationView } from '../visualization/VisualizationView';
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
  streamError,
  streamStatus,
  onRenderFpsChange,
  onSelectTask,
  onCreateTask,
  onPauseTask,
  onStopTask,
  onStartRecording,
  onStopRecording,
}: MobileContentViewProps) {
  if (mobileView === 'visualization') {
    if (selectedTask) {
      return (
        <div className="flex h-full w-full flex-col p-2">
          <VisualizationView
            taskId={selectedTask.id}
            centerFreq={selectedTask.frequency}
            sampleRate={selectedTask.sampleRate}
            colorMap={colorMap}
            visualizationMode={selectedTask.visualizationMode ?? undefined}
            dataError={streamError || undefined}
            isConnecting={streamStatus === 'connecting'}
            onRenderFpsChange={onRenderFpsChange}
          />
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 text-center text-muted-foreground">
        <div className="text-6xl">📡</div>
        <div>
          <p className="text-xl font-semibold text-foreground">No Task Selected</p>
          <p className="mt-2 text-sm text-muted-foreground/90">
            Select a task from the Tasks view.
          </p>
        </div>
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
