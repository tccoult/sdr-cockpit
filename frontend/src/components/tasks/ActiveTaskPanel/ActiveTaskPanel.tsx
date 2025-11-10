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
          "border-status-success/30 bg-status-success/12 text-status-success dark:border-status-success/40 dark:bg-status-success/15 dark:text-status-success",
        dotClass: "bg-status-success dark:bg-status-success animate-pulse",
      };
    }

    if (task?.status === TaskStatus.PAUSED) {
      return {
        badgeClass:
          "border-status-warning/30 bg-status-warning/12 text-status-warning dark:border-status-warning/40 dark:bg-status-warning/15 dark:text-status-warning",
        dotClass: "bg-status-warning",
      };
    }

    return {
      badgeClass:
        "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-500/40 dark:bg-slate-500/15 dark:text-slate-200",
      dotClass: "bg-slate-400 dark:bg-slate-300",
    };
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Active Task
          </p>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {task ? task.name : "No task selected"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {task
              ? `${formatFrequency(
                  task.frequency
                )} · ${task.type.toUpperCase()} task`
              : "Select a task from the roster to drive the cockpit visuals."}
          </p>
        </div>
        <div
          className={`flex items-center gap-2 rounded-md border px-3 py-1 text-xs font-semibold ${badgeClass}`}
        >
          <span className={`h-2 w-2 rounded-full ${dotClass}`} />
          {statusLabel}
        </div>
      </div>

      {task && (
        <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Sample Rate
            </p>
            <p>{task.sampleRate.toLocaleString()} sps</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Owner
            </p>
            <p>{task.ownerName}</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Uptime
            </p>
            <p>{Math.max(task.uptime, 0).toFixed(0)}s</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Recording
            </p>
            <p>
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
  );
}
