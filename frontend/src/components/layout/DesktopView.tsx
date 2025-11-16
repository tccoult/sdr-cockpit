/**
 * Desktop visualization view
 * Shows spectrum visualization or empty state
 */

import { Button } from '../common/Button';
import { VisualizationView } from '../visualization/VisualizationView';
import { Task } from '../../api/client';
import { DataStreamStatus } from '../../api';
import { ColorMap } from '../../utils/colorMaps';

export interface DesktopViewProps {
  selectedTask: Task | null;
  colorMap: ColorMap;
  streamError: string | null;
  streamStatus: DataStreamStatus;
  onRenderFpsChange: (fps: number) => void;
  onCreateTask: () => void;
}

export function DesktopView({
  selectedTask,
  colorMap,
  streamError,
  streamStatus,
  onRenderFpsChange,
  onCreateTask,
}: DesktopViewProps) {
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
          Select a task from the roster to view spectrum activity.
        </p>
      </div>
      <Button onClick={onCreateTask} variant="secondary" size="lg">
        + Create New Task
      </Button>
    </div>
  );
}
