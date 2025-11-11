import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Task, TaskType } from "../../types/sdr";
import { Button } from "../common/Button";
import { TaskCard } from "./TaskCard";

type FilterType = "all" | TaskType;

export interface TaskRosterPanelProps {
  tasks: Task[];
  selectedTaskId: string | null;
  isDiscovering: boolean;
  onSelectTask: (taskId: string) => void;
  onCreateTask: () => void;
}

const FILTER_OPTIONS: FilterType[] = ["all", TaskType.RX, TaskType.TX];

export function TaskRosterPanel({
  tasks,
  selectedTaskId,
  isDiscovering,
  onSelectTask,
  onCreateTask,
}: TaskRosterPanelProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredTasks = useMemo(() => {
    if (filter === "all") {
      return tasks;
    }
    return tasks.filter((task) => task.type === filter);
  }, [filter, tasks]);

  const sortedTasks = useMemo(
    () =>
      [...filteredTasks].sort((a, b) => {
        return b.createdAt - a.createdAt;
      }),
    [filteredTasks]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/50 text-foreground dark:bg-muted/20">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/70 px-4 py-3 text-muted-foreground backdrop-blur-md dark:border-border/50 dark:bg-muted/25">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em]">
          Tasks
        </h2>
        <Button
          onClick={onCreateTask}
          variant="icon"
          title="Create new task"
          aria-label="Create new task"
          className="h-8 w-8"
        >
          <Plus size={16} />
        </Button>
      </div>

      <div className="flex gap-2 border-b border-border/60 bg-muted/60 px-4 py-3 dark:border-border/50 dark:bg-muted/20">
        {FILTER_OPTIONS.map((option) => {
          const isActive = option === filter;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={[
                "flex-1 rounded-md border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition",
                isActive
                  ? "border-border/60 bg-card/90 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                  : "border-border/40 bg-card/40 text-muted-foreground hover:border-border/60 hover:bg-card/50 hover:text-foreground",
              ].join(" ")}
            >
              {option}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {isDiscovering && tasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <div className="animate-spin text-3xl">⟳</div>
            <p className="text-sm font-medium">Discovering tasks...</p>
            <p className="text-xs text-muted-foreground/80">
              Scanning SDR system
            </p>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <div className="text-4xl">📡</div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">
              No {filter !== "all" ? filter.toUpperCase() : ""} tasks
            </div>
            <div className="max-w-[220px] text-xs text-muted-foreground/80">
              {filter === "all"
                ? "Create a receive task to start monitoring RF spectrum"
                : `No ${filter.toUpperCase()} tasks available`}
            </div>
            {filter === "all" && (
              <Button
                onClick={onCreateTask}
                variant="secondary"
                size="sm"
                className="mt-2 px-4 text-[11px] uppercase tracking-[0.2em]"
              >
                + Create Task
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isSelected={task.id === selectedTaskId}
                onSelect={onSelectTask}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
