import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Task, TaskType } from "../../types/sdr";
import { Button } from "../common/Button";
import { TaskCard } from "./TaskCard";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

type FilterType = "all" | TaskType;

export interface TaskRosterPanelProps {
  tasks: Task[];
  selectedTaskId: string | null;
  isDiscovering: boolean;
  onSelectTask: (taskId: string) => void;
  onCreateTask: () => void;
  className?: string;
}

const FILTER_OPTIONS: FilterType[] = ["all", TaskType.RX, TaskType.TX];

export function TaskRosterPanel({
  tasks,
  selectedTaskId,
  isDiscovering,
  onSelectTask,
  onCreateTask,
  className,
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
    <section
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Task Roster
          </p>
          <h2 className="text-sm font-semibold text-foreground">Tasks</h2>
        </div>
        <Button
          onClick={onCreateTask}
          variant="icon"
          title="Create new task"
          aria-label="Create new task"
        >
          <Plus size={16} />
        </Button>
      </div>

      <div className="border-b border-border/70 bg-muted/50 px-4 py-2.5">
        <div className="inline-flex rounded-md border border-border/70 bg-card/60 p-0.5 shadow-sm">
          {FILTER_OPTIONS.map((option, index) => {
            const isActive = option === filter;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={cn(
                  "px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition",
                  "rounded-none first:rounded-l-md last:rounded-r-md",
                  index > 0 && "-ml-px",
                  isActive
                    ? "bg-accent/20 text-foreground"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {option.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {isDiscovering && tasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <div className="animate-spin text-3xl">⟳</div>
            <p className="text-sm font-medium text-foreground">Discovering tasks...</p>
            <p className="text-xs text-muted-foreground">Scanning SDR system</p>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <div className="text-4xl">📡</div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              No {filter !== "all" ? `${filter.toUpperCase()} ` : ""}tasks
            </div>
            <div className="max-w-[220px] text-xs text-muted-foreground">
              {filter === "all"
                ? "Create a receive task to start monitoring RF spectrum"
                : `No ${filter.toUpperCase()} tasks available`}
            </div>
            {filter === "all" && (
              <Button onClick={onCreateTask} variant="secondary" size="sm">
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
    </section>
  );
}
