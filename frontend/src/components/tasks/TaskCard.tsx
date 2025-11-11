import { Task } from "../../types/sdr";
import { formatDuration, formatFrequency } from "../../utils/formatters";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

type TaskCardProps = {
  task: Task;
  isSelected: boolean;
  onSelect: (taskId: string) => void;
};

const STATUS_STYLES: Record<
  Task["status"],
  { dot: string; badge: string; label: string; glow?: string }
> = {
  live: {
    dot: "bg-status-success",
    badge:
      "border border-status-success/40 bg-status-success/15 text-status-success",
    label: "Live",
    glow: "shadow-[0_0_12px_rgba(76,228,179,0.4)]",
  },
  transmitting: {
    dot: "bg-status-transmit",
    badge:
      "border border-status-transmit/40 bg-status-transmit/15 text-status-transmit",
    label: "Transmitting",
    glow: "shadow-[0_0_12px_rgba(110,201,255,0.4)]",
  },
  paused: {
    dot: "bg-status-warning",
    badge:
      "border border-status-warning/40 bg-status-warning/15 text-status-warning",
    label: "Paused",
  },
  stopped: {
    dot: "bg-status-stopped",
    badge:
      "border border-status-stopped/40 bg-status-stopped/15 text-status-stopped",
    label: "Stopped",
  },
};

const RECORDING_BADGE =
  "border border-status-recording/40 bg-status-recording/15 text-status-recording";

export function TaskCard({ task, isSelected, onSelect }: TaskCardProps) {
  const statusStyles = STATUS_STYLES[task.status];
  const isRecording = task.recording?.isRecording ?? false;

  const handleSelect = () => {
    onSelect(task.id);
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSelect();
        }
      }}
      className={cn(
        "group relative rounded-md border border-border/70 bg-card/80 px-3 py-2 transition-colors",
        "focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/60 focus-visible:ring-offset-0",
        isSelected
          ? "border-accent/60 bg-accent/10 shadow-[0_0_0_1px_rgba(148,163,184,0.2)]"
          : "hover:border-border hover:bg-muted/60"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "h-2 w-2 flex-shrink-0 rounded-full",
            isRecording && "animate-pulse",
            statusStyles.dot,
            statusStyles.glow
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{task.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {formatFrequency(task.frequency)} · {task.type.toUpperCase()}
          </p>
        </div>
        <span
          className={cn(
            "whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            statusStyles.badge
          )}
        >
          {isRecording ? "REC" : statusStyles.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="font-semibold text-muted-foreground/80">Owner</span>
          <span className="text-foreground">{task.ownerName}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="font-semibold text-muted-foreground/80">Uptime</span>
          <span className="text-foreground">{formatDuration(task.uptime)}</span>
        </span>
        {task.recording && (
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              RECORDING_BADGE
            )}
          >
            {task.recording.filename}
          </span>
        )}
      </div>
    </article>
  );
}
