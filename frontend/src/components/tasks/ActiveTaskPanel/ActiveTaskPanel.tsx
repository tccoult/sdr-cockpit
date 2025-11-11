import { CircleDot, Pause, Play, Square } from "lucide-react";
import { Task, TaskType, TaskStatus } from "../../../types/sdr";
import { formatFrequency } from "../../../utils/formatters";
import { Button } from "../../common/Button";
import { panelSurface, panelSubtle } from "../../../styles/panelStyles";
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
    <div className={[panelSurface, "flex flex-col gap-4 p-4 text-sm text-foreground"].join(" ")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Active Task
          </p>
          <h2 className="text-lg font-semibold">
            {task ? task.name : "No task selected"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {task
              ? `${formatFrequency(task.frequency)} · ${task.type.toUpperCase()} task`
              : "Select a task from the roster to drive the cockpit visuals."}
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${badgeClass}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
          {statusLabel}
        </div>
      </div>

      {task && (
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <StatBlock label="Sample Rate" value={`${task.sampleRate.toLocaleString()} sps`} />
          <StatBlock label="Owner" value={task.ownerName} />
          <StatBlock label="Uptime" value={`${Math.max(task.uptime, 0).toFixed(0)}s`} />
          <StatBlock
            label="Recording"
            value={
              task.recording?.isRecording
                ? `Recording · ${task.recording.duration}s`
                : "Idle"
            }
            highlight={task.recording?.isRecording}
          />
        </div>
      )}

      {task && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            onClick={() => onPauseTask(task.id)}
            size="sm"
            variant="subtle"
            className="px-3"
          >
            {task.status === TaskStatus.PAUSED ? (
              <>
                <Play aria-hidden className="h-4 w-4" />
                Resume
              </>
            ) : (
              <>
                <Pause aria-hidden className="h-4 w-4" />
                Pause
              </>
            )}
          </Button>

          <Button
            onClick={() => onStopTask(task.id)}
            size="sm"
            variant="subtle"
            className="px-3"
          >
            <Square aria-hidden className="h-4 w-4" />
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
              variant={task.recording?.isRecording ? "primary" : "subtle"}
              className="px-3"
            >
              {task.recording?.isRecording ? (
                <>
                  <Square aria-hidden className="h-4 w-4" />
                  Stop Recording
                </>
              ) : (
                <>
                  <CircleDot aria-hidden className="h-4 w-4" />
                  Record
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface StatBlockProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function StatBlock({ label, value, highlight = false }: StatBlockProps) {
  return (
    <div
      className={[
        panelSubtle,
        "flex flex-col gap-1 rounded-lg border-transparent bg-muted/40 px-3 py-2.5 text-sm shadow-sm dark:bg-white/5",
        highlight &&
          "ring-1 ring-status-recording/40 dark:ring-status-recording/50",
      ].join(" ")}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}
