import { CircleDot, Pause, Play, Square } from "lucide-react";
import { Task, TaskType, TaskStatus } from "../../../types/sdr";
import { formatFrequency } from "../../../utils/formatters";
import { Button } from "../../common/Button";
import { panelChrome } from "../../../styles/panelStyles";
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
    <div className={[panelChrome, "space-y-5 p-4 text-foreground"].join(" ")}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Active Task
          </p>
          <h2 className="text-lg font-semibold leading-tight">
            {task ? task.name : "No task selected"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {task
              ? `${formatFrequency(task.frequency)} · ${task.type.toUpperCase()} task`
              : "Select a task from the roster to drive the cockpit visuals."}
          </p>
        </div>
        <div
          className={`flex items-center gap-2 rounded-md border border-border/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:border-border/50 dark:bg-card/20 ${badgeClass}`}
        >
          <span className={`h-2 w-2 rounded-full ${dotClass}`} />
          {statusLabel}
        </div>
      </div>

      {task && (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm text-muted-foreground">
          <div className="space-y-1">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.18em]">Sample Rate</dt>
            <dd className="text-foreground">
              {task.sampleRate.toLocaleString()} sps
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.18em]">Owner</dt>
            <dd className="text-foreground">{task.ownerName}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.18em]">Uptime</dt>
            <dd className="text-foreground">{Math.max(task.uptime, 0).toFixed(0)}s</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.18em]">Recording</dt>
            <dd className="text-foreground">
              {task.recording?.isRecording
                ? `Recording · ${task.recording.duration}s`
                : "Idle"}
            </dd>
          </div>
        </dl>
      )}

      <div className="flex flex-wrap gap-2">
        {task && (
          <>
            <Button
              onClick={() => onPauseTask(task.id)}
              size="sm"
              variant="secondary"
              className="px-3"
            >
              {task.status === TaskStatus.PAUSED ? (
                <>
                  <Play aria-hidden className="h-3.5 w-3.5" />
                  <span className="text-[11px] uppercase tracking-[0.16em]">Resume</span>
                </>
              ) : (
                <>
                  <Pause aria-hidden className="h-3.5 w-3.5" />
                  <span className="text-[11px] uppercase tracking-[0.16em]">Pause</span>
                </>
              )}
            </Button>

            <Button
              onClick={() => onStopTask(task.id)}
              size="sm"
              variant="secondary"
              className="px-3"
            >
              <Square aria-hidden className="h-3.5 w-3.5" />
              <span className="text-[11px] uppercase tracking-[0.16em]">Stop</span>
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
                className="px-3"
              >
                {task.recording?.isRecording ? (
                  <>
                    <Square aria-hidden className="h-3.5 w-3.5" />
                    <span className="text-[11px] uppercase tracking-[0.16em]">Stop Rec</span>
                  </>
                ) : (
                  <>
                    <CircleDot aria-hidden className="h-3.5 w-3.5" />
                    <span className="text-[11px] uppercase tracking-[0.16em]">Record</span>
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
