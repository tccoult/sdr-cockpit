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
      "border border-status-success/35 bg-status-success/15 text-status-success",
    label: "Live",
  },
  transmitting: {
    dot: "bg-status-transmit shadow-[0_0_12px_rgba(110,201,255,0.45)]",
    badge:
      "border border-status-transmit/35 bg-status-transmit/15 text-status-transmit",
    label: "Transmitting",
  },
  paused: {
    dot: "bg-status-warning",
    badge:
      "border border-status-warning/35 bg-status-warning/15 text-status-warning",
    label: "Paused",
  },
  stopped: {
    dot: "bg-status-stopped",
    badge:
      "border border-status-stopped/35 bg-status-stopped/15 text-status-stopped",
    label: "Stopped",
  },
};

const RECORDING_BADGE =
  "border border-status-recording/35 bg-status-recording/15 text-status-recording";

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
        "group relative flex flex-col gap-2 rounded-md border px-3 py-2.5 text-foreground shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cockpit-accent/40",
        "border-border/50 bg-card/95 hover:border-border/40 hover:bg-card",
        isSelected
          ? "border-cockpit-accent/60 bg-cockpit-accent/10 ring-1 ring-cockpit-accent/40 shadow-[0_0_0_1px_rgba(124,131,255,0.2)]"
          : "",
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

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="font-medium text-muted-foreground">
            Owner
          </span>
          <span className="text-foreground/90">
            {task.ownerName}
          </span>
        </span>
        <span className="flex items-center gap-1">
          <span className="font-medium text-muted-foreground">
            Uptime
          </span>
          <span className="text-foreground/90">
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
