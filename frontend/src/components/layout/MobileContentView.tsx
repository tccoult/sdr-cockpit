/**
 * Mobile content view switcher
 * Shows visualization, tasks, or health based on active view
 */

import { Task } from "../../api/client";
import { BitResult } from "../../services/api";
import { ColorMap } from "../../utils/colorMaps";
import { SystemHealthPanel } from "../system-health/SystemHealthPanel";
import { TaskRosterPanel } from "../tasks/TaskRosterPanel";
import { VisualizationPanel } from "../visualization/VisualizationPanel";
import { MobileView } from "./MobileNav";

export interface MobileContentViewProps {
  mobileView: MobileView;
  tasks: Task[];
  isDiscovering: boolean;
  bitResult: BitResult;
  colorMap: ColorMap;
  onRenderFpsChange: (fps: number) => void;
  onDataFpsChange: (fps: number) => void;
  onCreateTask: () => void;
  onPauseTask: (taskId: string) => Promise<void>;
  onStopTask: (taskId: string) => Promise<void>;
  onStartRecording: (taskId: string) => Promise<void>;
  onStopRecording: (taskId: string) => Promise<void>;
}

export function MobileContentView({
  mobileView,
  tasks,
  isDiscovering,
  bitResult,
  colorMap,
  onRenderFpsChange,
  onDataFpsChange,
  onCreateTask,
  onPauseTask: _onPauseTask,
  onStopTask: _onStopTask,
  onStartRecording: _onStartRecording,
  onStopRecording: _onStopRecording,
}: MobileContentViewProps) {
  if (mobileView === "visualization") {
    return (
      <div className="flex h-full w-full flex-col p-2">
        <VisualizationPanel
          colorMap={colorMap}
          onRenderFpsChange={onRenderFpsChange}
          onDataFpsChange={onDataFpsChange}
        />
      </div>
    );
  }

  if (mobileView === "tasks") {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
        <TaskRosterPanel
          tasks={tasks}
          isDiscovering={isDiscovering}
          onCreateTask={onCreateTask}
        />
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
