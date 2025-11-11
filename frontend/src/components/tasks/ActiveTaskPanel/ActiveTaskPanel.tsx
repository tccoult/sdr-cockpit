import { CircleDot, Pause, Play, Square } from "lucide-react";
import { Task, TaskType, TaskStatus } from "../../../types/sdr";
import { formatFrequency } from "../../../utils/formatters";
import { Button } from "../../common/Button";
import { getTaskStatusLabel } from "./taskStatus";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const STATUS_BADGE_TOKENS: Record<
  TaskStatus | "idle",
  { badge: string; dot: string; label: string }
> = {
  [TaskStatus.LIVE]: {
    badge:
      "border-status-success/40 bg-status-success/15 text-status-success",
    dot: "bg-status-success",
    label: "Live",
  },
  [TaskStatus.TRANSMITTING]: {
    badge:
      "border-status-transmit/40 bg-status-transmit/15 text-status-transmit",
    dot: "bg-status-transmit",
    label: "Transmitting",
  },
  [TaskStatus.PAUSED]: {
    badge:
      "border-status-warning/40 bg-status-warning/15 text-status-warning",
    dot: "bg-status-warning",
    label: "Paused",
  },
  [TaskStatus.STOPPED]: {
    badge:
      "border-status-stopped/40 bg-status-stopped/15 text-status-stopped",
    dot: "bg-status-stopped",
    label: "Stopped",
  },
  idle: {
    badge: "border-border/60 bg-muted/60 text-muted-foreground",
    dot: "bg-muted-foreground/60",
    label: "Idle",
  },
};

interface ActiveTaskPanelProps {
  task: Task | null;
  onPauseTask: (taskId: string) => void;
  onStopTask: (taskId: string) => void;
  onRecordTask: (taskId: string) => void;
  onStopRecording: (taskId: string) => void;
  className?: string;
}

export function ActiveTaskPanel({
  task,
  onPauseTask,
  onStopTask,
  onRecordTask,
  onStopRecording,
  className,
}: ActiveTaskPanelProps) {
  const statusLabel = getTaskStatusLabel(task);
  const statusKey = task?.status ?? "idle";
  const statusTokens = STATUS_BADGE_TOKENS[statusKey];

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 px-4 py-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Active Task
          </p>
          <h2 className="text-base font-semibold text-foreground">
            {task ? task.name : "No task selected"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {task
              ? `${formatFrequency(task.frequency)} · ${task.type.toUpperCase()} task`
              : "Select a task from the roster to drive the cockpit visuals."}
          </p>
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
            statusTokens.badge
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              task?.status === TaskStatus.LIVE || task?.status === TaskStatus.TRANSMITTING
                ? "animate-pulse"
                : null,
              statusTokens.dot
            )}
          />
          {statusLabel}
        </div>
      </div>

      {task && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border/70 px-4 py-4 text-sm text-foreground">
          <Detail label="Sample Rate" value={`${task.sampleRate.toLocaleString()} sps`} />
          <Detail label="Owner" value={task.ownerName} />
          <Detail label="Uptime" value={`${Math.max(task.uptime, 0).toFixed(0)} s`} />
          <Detail
            label="Recording"
            value={
              task.recording?.isRecording
                ? `Recording · ${task.recording.duration}s`
                : "Idle"
            }
          />
        </div>
      )}

      {task && (
        <div className="flex flex-wrap gap-2 border-t border-border/70 px-4 py-3">
          <Button onClick={() => onPauseTask(task.id)} size="sm" variant="subtle">
            {task.status === TaskStatus.PAUSED ? (
              <>
                <Play aria-hidden className="h-3.5 w-3.5" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause aria-hidden className="h-3.5 w-3.5" />
                <span>Pause</span>
              </>
            )}
          </Button>

          <Button onClick={() => onStopTask(task.id)} size="sm" variant="subtle">
            <Square aria-hidden className="h-3.5 w-3.5" />
            <span>Stop</span>
          </Button>

          {task.type === TaskType.RX && (
            <Button
              onClick={() =>
                task.recording?.isRecording
                  ? onStopRecording(task.id)
                  : onRecordTask(task.id)
              }
              size="sm"
              variant="subtle"
            >
              {task.recording?.isRecording ? (
                <>
                  <Square aria-hidden className="h-3.5 w-3.5" />
                  <span>Stop Recording</span>
                </>
              ) : (
                <>
                  <CircleDot aria-hidden className="h-3.5 w-3.5" />
                  <span>Record</span>
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

interface DetailProps {
  label: string;
  value: string;
}

function Detail({ label, value }: DetailProps) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
