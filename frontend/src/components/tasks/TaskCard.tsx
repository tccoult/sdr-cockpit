import { Task } from "../../types/sdr";
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
      "bg-status-success/15 text-status-success ring-1 ring-status-success/30 dark:bg-status-success/20",
    label: "Live",
  },
  transmitting: {
    dot: "bg-status-transmit shadow-[0_0_10px_rgba(110,201,255,0.35)]",
    badge:
      "bg-status-transmit/15 text-status-transmit ring-1 ring-status-transmit/30 dark:bg-status-transmit/20",
    label: "Transmitting",
  },
  paused: {
    dot: "bg-status-warning",
    badge:
      "bg-status-warning/15 text-status-warning ring-1 ring-status-warning/25 dark:bg-status-warning/20",
    label: "Paused",
  },
  stopped: {
    dot: "bg-status-stopped",
    badge:
      "bg-status-stopped/15 text-status-stopped ring-1 ring-status-stopped/25 dark:bg-status-stopped/20",
    label: "Stopped",
  },
};

const RECORDING_BADGE =
  "bg-status-recording/15 text-status-recording ring-1 ring-status-recording/35 dark:bg-status-recording/20";

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
        "group relative rounded-lg border border-border/50 bg-card/90 px-3 py-3 text-left text-foreground shadow-sm transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:border-white/10 dark:bg-white/5",
        isSelected
          ? "ring-2 ring-accent/40 dark:ring-accent/50"
          : "hover:border-accent/30 hover:bg-accent/5 dark:hover:border-accent/40",
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
          <p className="truncate text-sm font-semibold">
            {task.name}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {formatFrequency(task.frequency)} · {task.type.toUpperCase()}
          </p>
        </div>
        <span
          className={[
            "whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
            statusStyles.badge,
          ].join(" ")}
        >
          {isRecording ? "REC" : statusStyles.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="font-medium text-foreground/80">
            Owner
          </span>
          <span className="text-foreground">
            {task.ownerName}
          </span>
        </span>
        <span className="flex items-center gap-1">
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
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
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
