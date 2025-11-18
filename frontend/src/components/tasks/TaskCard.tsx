import { Pause, Play, Square, Circle } from "lucide-react";
import { Task, TaskOwner, TaskStatus } from "../../api/client";
import { formatDuration, formatFrequency } from "../../utils/formatters";
import { Button } from "@/components/ui/button";

type TaskCardProps = {
  task: Task;
  isExpanded: boolean;
  onToggle: () => void;
  onPauseTask?: (taskId: string) => Promise<void>;
  onStopTask?: (taskId: string) => Promise<void>;
  onStartRecording?: (taskId: string) => Promise<void>;
  onStopRecording?: (taskId: string) => Promise<void>;
};

const STATUS_STYLES: Record<
  Task["status"],
  { dot: string; badge: string; label: string }
> = {
  live: {
    dot: "bg-status-success shadow-[0_0_10px_rgba(76,228,179,0.35)]",
    badge:
      "border border-status-success/30 bg-status-success/12 text-status-success dark:border-status-success/40 dark:bg-status-success/15 dark:text-status-success",
    label: "Live",
  },
  transmitting: {
    dot: "bg-status-transmit shadow-[0_0_10px_rgba(110,201,255,0.35)]",
    badge:
      "border border-status-transmit/30 bg-status-transmit/12 text-status-transmit dark:border-status-transmit/40 dark:bg-status-transmit/15 dark:text-status-transmit",
    label: "Transmitting",
  },
  paused: {
    dot: "bg-status-warning",
    badge:
      "border border-status-warning/30 bg-status-warning/12 text-status-warning dark:border-status-warning/40 dark:bg-status-warning/15 dark:text-status-warning",
    label: "Paused",
  },
  stopped: {
    dot: "bg-status-stopped",
    badge:
      "border border-status-stopped/30 bg-status-stopped/12 text-status-stopped dark:border-status-stopped/40 dark:bg-status-stopped/15 dark:text-status-stopped",
    label: "Stopped",
  },
};

const RECORDING_BADGE =
  "border border-status-recording/30 bg-status-recording/12 text-status-recording dark:border-status-recording/50 dark:bg-status-recording/15 dark:text-status-recording";

export function TaskCard({
  task,
  isExpanded,
  onToggle,
  onPauseTask,
  onStopTask,
  onStartRecording,
  onStopRecording,
}: TaskCardProps) {
  const statusStyles = STATUS_STYLES[task.status];
  const isRecording = task.recording?.isRecording ?? false;
  const canControl = task.owner === TaskOwner.SELF;
  const detailPanelId = `task-${task.id}-details`;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "group relative rounded-md border px-3 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        "text-foreground/90 hover:bg-muted/70",
        isExpanded ? "border-accent/40 bg-accent/10" : "border-transparent bg-muted/40"
      )}
      aria-expanded={isExpanded}
      aria-controls={detailPanelId}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={[
            "h-2 w-2 flex-shrink-0 rounded-full",
            isRecording ? "animate-pulse" : "",
            statusStyles.dot,
          ].join(" ")}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {task.name}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {formatFrequency(task.frequency)} · {task.type.toUpperCase()}
          </p>
        </div>
        <span
          className={[
            "whitespace-nowrap rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
            statusStyles.badge,
          ].join(" ")}
        >
          {isRecording ? "REC" : statusStyles.label}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="font-medium text-foreground/80">Owner</span>
          <span className="text-foreground">{task.ownerName}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-medium text-foreground/80">Uptime</span>
          <span className="text-foreground">{formatDuration(task.uptime)}</span>
        </span>
      </div>

      {/* Expanded content */}
      <div
        className={cn(
          "overflow-hidden transition-[max-height,opacity]",
          isExpanded
            ? "max-h-48 opacity-100 duration-200 ease-out"
            : "max-h-0 opacity-0 duration-150 ease-in"
        )}
        id={detailPanelId}
      >
        <div className="border-t border-border/50 pt-3 mt-3">
          {/* Recording info */}
          {task.recording && (
            <div className="mb-3">
              <span
                className={cn(
                  "rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wide",
                  RECORDING_BADGE
                )}
              >
                Recording: {task.recording.filename}
              </span>
            </div>
          )}

          {/* Task controls or view-only message */}
          {canControl ? (
            <div className="flex flex-wrap gap-2">
              {/* Play/Pause button */}
              {(task.status === TaskStatus.PAUSED || task.status === TaskStatus.STOPPED) && onPauseTask && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPauseTask(task.id);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Play size={14} />
                  <span className="text-xs">Resume</span>
                </Button>
              )}
              {task.status === TaskStatus.LIVE && onPauseTask && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPauseTask(task.id);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Pause size={14} />
                  <span className="text-xs">Pause</span>
                </Button>
              )}

              {/* Stop button */}
              {task.status !== TaskStatus.STOPPED && onStopTask && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStopTask(task.id);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Square size={14} />
                  <span className="text-xs">Stop</span>
                </Button>
              )}

              {/* Recording controls */}
              {isRecording && onStopRecording && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStopRecording(task.id);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Square size={14} />
                  <span className="text-xs">Stop Recording</span>
                </Button>
              )}
              {!isRecording && task.status === TaskStatus.LIVE && onStartRecording && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartRecording(task.id);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Circle size={14} className="fill-current" />
                  <span className="text-xs">Record</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground/70">View Only</p>
              <p className="mt-1 text-[11px]">
                This task is owned by {task.ownerName}. You can view it but cannot control it.
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
