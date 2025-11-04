import { CircleDot, Pause, Play, Square } from "lucide-react";
import { Task } from "../../../types/sdr";
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
    if (task?.status === "live" || task?.status === "transmitting") {
      return {
        badgeClass:
          "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200",
        dotClass: "bg-emerald-500 dark:bg-emerald-400 animate-pulse",
      };
    }

    if (task?.status === "paused") {
      return {
        badgeClass:
          "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200",
        dotClass: "bg-amber-300",
      };
    }

    return {
      badgeClass:
        "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-500/40 dark:bg-slate-500/10 dark:text-slate-200",
      dotClass: "bg-slate-500 dark:bg-slate-300",
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
          className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass}`}
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
            >
              {task.status === "paused" ? (
                <>
                  <Play aria-hidden className="mr-2 h-4 w-4" />
                  Resume
                </>
              ) : (
                <>
                  <Pause aria-hidden className="mr-2 h-4 w-4" />
                  Pause
                </>
              )}
            </Button>

            <Button
              onClick={() => onStopTask(task.id)}
              size="sm"
              variant="secondary"
            >
              <Square aria-hidden className="mr-2 h-4 w-4" />
              Stop
            </Button>

            {task.type === "rx" && (
              <Button
                onClick={() =>
                  task.recording?.isRecording
                    ? onStopRecording(task.id)
                    : onRecordTask(task.id)
                }
                size="sm"
                variant={task.recording?.isRecording ? "secondary" : "primary"}
              >
                {task.recording?.isRecording ? (
                  <>
                    <Square aria-hidden className="mr-2 h-4 w-4" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <CircleDot aria-hidden className="mr-2 h-4 w-4" />
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
