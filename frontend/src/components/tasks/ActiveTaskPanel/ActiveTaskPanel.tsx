import { CircleDot, Pause, Play, Square } from "lucide-react";
import { Task, TaskType, TaskStatus } from "../../../types/sdr";
import { formatFrequency } from "../../../utils/formatters";
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
          "border border-status-success/30 bg-status-success/15 text-status-success",
        dotClass: "bg-status-success animate-pulse",
      };
    }

    if (task?.status === TaskStatus.PAUSED) {
      return {
        badgeClass:
          "border border-status-warning/30 bg-status-warning/15 text-status-warning",
        dotClass: "bg-status-warning",
      };
    }

    return {
      badgeClass:
        "border border-border/60 bg-muted/60 text-muted-foreground",
      dotClass: "bg-muted-foreground/60",
    };
  })();

  return (
    <section className="rounded-lg border border-border/70 bg-card/95 p-4 text-foreground shadow-lg shadow-black/15">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Active Task</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              {task ? task.name : "No task selected"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {task
                ? `${formatFrequency(
                    task.frequency
                  )} · ${task.type.toUpperCase()} task`
                : "Select a task from the roster to drive the cockpit visuals."}
            </p>
          </div>
          <div
            className={`flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold ${badgeClass}`}
          >
            <span className={`h-2 w-2 rounded-full ${dotClass}`} />
            {statusLabel}
          </div>
        </div>

        {task && (
          <div className="grid grid-cols-2 gap-3 text-[11px] text-muted-foreground">
            <div>
              <p className="font-semibold uppercase tracking-wide text-muted-foreground/80">
                Sample Rate
              </p>
              <p className="text-foreground">{task.sampleRate.toLocaleString()} sps</p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wide text-muted-foreground/80">
                Owner
              </p>
              <p className="text-foreground">{task.ownerName}</p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wide text-muted-foreground/80">
                Uptime
              </p>
              <p className="text-foreground">{Math.max(task.uptime, 0).toFixed(0)}s</p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wide text-muted-foreground/80">
                Recording
              </p>
              <p className="text-foreground">
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
                className="px-2 py-1"
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
                className="px-2 py-1"
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
                  className="px-2 py-1"
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
    </section>
  );
}
