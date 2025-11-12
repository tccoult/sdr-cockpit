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
const FILTER_LABELS: Record<FilterType, string> = {
  all: "All",
  [TaskType.RX]: "RX",
  [TaskType.TX]: "TX",
};

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
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm border border-border/70 bg-card text-foreground shadow-lg shadow-black/15">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h3 className="text-sm font-semibold text-foreground">Tasks Roster</h3>
          <Button
            onClick={onCreateTask}
            variant="icon"
            size="sm"
            title="Create new task"
            aria-label="Create new task"
          >
            <Plus size={16} />
          </Button>
        </div>

        <div className="px-4 pb-3 pt-2">
          <div className="inline-flex rounded-md border border-border/80 bg-muted/60 p-0.5 shadow-sm">
            {FILTER_OPTIONS.map((option, index) => (
              <Button
                key={option}
                variant={filter === option ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilter(option)}
                className={cn(
                  "px-3 text-xs font-medium transition",
                  "rounded-none first:rounded-l-md last:rounded-r-md",
                  index > 0 && "-ml-px"
                )}
              >
                {FILTER_LABELS[option]}
              </Button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
          {isDiscovering && tasks.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <div className="animate-spin text-3xl">⟳</div>
              <p className="text-sm font-medium text-foreground/80">
                Discovering tasks...
              </p>
              <p className="text-xs text-muted-foreground">
                Scanning SDR system
              </p>
            </div>
          ) : sortedTasks.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <div className="text-4xl">📡</div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                No {filter !== "all" ? filter.toUpperCase() : ""} tasks
              </div>
              <div className="max-w-[220px] text-xs text-muted-foreground/90">
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
            <div className="flex flex-col gap-1.5">
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
    </div>
  );
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
