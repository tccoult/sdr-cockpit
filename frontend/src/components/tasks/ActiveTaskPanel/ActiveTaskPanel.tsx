import { CircleDot, Pause, Play, Square } from "lucide-react";
import { Task, TaskType, TaskStatus } from "../../../types/sdr";
import { formatFrequency } from "../../../utils/formatters";
import { dataLabel, dataValue, moduleLabel, panelChromeMuted } from "../../../styles/panelStyles";
import { Button } from "../../common/Button";
import { getTaskStatusLabel } from "./taskStatus";

interface ActiveTaskPanelProps {
  task: Task | null;
  onPauseTask: (taskId: string) => void;
  onStopTask: (taskId: string) => void;
  onRecordTask: (taskId: string) => void;
  onStopRecording: (taskId: string) => void;
}

export function ActiveTaskPanel({
  task,
  onPauseTask,
  onStopTask,
  onRecordTask,
  onStopRecording,
}: ActiveTaskPanelProps) {
  const statusLabel = getTaskStatusLabel(task);

  const { badgeClass, dotClass } = (() => {
    if (task?.status === TaskStatus.LIVE || task?.status === TaskStatus.TRANSMITTING) {
      return {
        badgeClass:
          "border-status-success/30 bg-status-success/15 text-status-success",
        dotClass: "bg-status-success dark:bg-status-success animate-pulse",
      };
    }

    if (task?.status === TaskStatus.PAUSED) {
      return {
        badgeClass:
          "border-status-warning/30 bg-status-warning/15 text-status-warning",
        dotClass: "bg-status-warning",
      };
    }

    return {
      badgeClass:
        "border-border/60 bg-muted/70 text-muted-foreground",
      dotClass: "bg-muted-foreground",
    };
  })();

  return (
    <div className={[panelChromeMuted, "space-y-5 p-4"].join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className={moduleLabel}>Active Task</p>
          <h2 className="text-lg font-semibold text-foreground">
            {task ? task.name : "No task selected"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {task
              ? `${formatFrequency(task.frequency)} · ${task.type.toUpperCase()} task`
              : "Select a task from the roster to drive the cockpit visuals."}
          </p>
        </div>
        <div
          className={`flex items-center gap-2 rounded-md border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${badgeClass}`}
        >
          <span className={`h-2 w-2 rounded-full ${dotClass}`} />
          {statusLabel}
        </div>
      </div>

      {task && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs text-muted-foreground">
          <div className="space-y-1">
            <p className={dataLabel}>Sample Rate</p>
            <p className={dataValue}>{task.sampleRate.toLocaleString()} sps</p>
          </div>
          <div className="space-y-1">
            <p className={dataLabel}>Owner</p>
            <p className={dataValue}>{task.ownerName}</p>
          </div>
          <div className="space-y-1">
            <p className={dataLabel}>Uptime</p>
            <p className={dataValue}>{Math.max(task.uptime, 0).toFixed(0)}s</p>
          </div>
          <div className="space-y-1">
            <p className={dataLabel}>Recording</p>
            <p className={dataValue}>
              {task.recording?.isRecording
                ? `Recording · ${task.recording.duration}s`
                : "Idle"}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {task && (
          <>
            <Button
              onClick={() => onPauseTask(task.id)}
              size="sm"
              variant="secondary"
              className="px-3 py-1.5 text-xs"
            >
              {task.status === TaskStatus.PAUSED ? (
                <>
                  <Play aria-hidden className="mr-1 h-3.5 w-3.5" />
                  Resume
                </>
              ) : (
                <>
                  <Pause aria-hidden className="mr-1 h-3.5 w-3.5" />
                  Pause
                </>
              )}
            </Button>

            <Button
              onClick={() => onStopTask(task.id)}
              size="sm"
              variant="secondary"
              className="px-3 py-1.5 text-xs"
            >
              <Square aria-hidden className="mr-1 h-3.5 w-3.5" />
              Stop
            </Button>

            {task.type === TaskType.RX && (
              <Button
                onClick={() =>
                  task.recording?.isRecording
                    ? onStopRecording(task.id)
                    : onRecordTask(task.id)
                }
                size="sm"
                variant="secondary"
                className="px-3 py-1.5 text-xs"
              >
                {task.recording?.isRecording ? (
                  <>
                    <Square aria-hidden className="mr-1 h-3.5 w-3.5" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <CircleDot aria-hidden className="mr-1 h-3.5 w-3.5" />
                    Record
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
