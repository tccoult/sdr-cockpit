import { Task } from "../../api/client";
import { formatDuration, formatFrequency } from "../../utils/formatters";

type TaskCardProps = {
  task: Task;
  isSelected: boolean;
  onSelect: (taskId: string) => void;
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
      className={[
        "group relative rounded-md border px-3 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        "bg-muted/40 text-foreground/90 hover:bg-muted/70",
        isSelected
          ? "border-accent/50 bg-accent/10 shadow-inner"
          : "border-transparent",
      ].join(" ")}
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
          <span className="font-medium text-foreground/80">
            Owner
          </span>
          <span className="text-foreground">
            {task.ownerName}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-medium text-foreground/80">
            Uptime
          </span>
          <span className="text-foreground">
            {formatDuration(task.uptime)}
          </span>
        </span>
        {task.recording && (
          <span
            className={[
              "rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide",
              RECORDING_BADGE,
            ].join(" ")}
          >
            {task.recording.filename}
          </span>
        )}
      </div>
    </article>
  );
}
