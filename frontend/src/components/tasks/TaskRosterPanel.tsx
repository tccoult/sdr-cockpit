import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Task, TaskType } from "../../types/sdr";
import { panelSurface } from "../../styles/panelStyles";
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
    <div className={[panelSurface, "flex min-h-0 flex-1 flex-col overflow-hidden"].join(" ")}>
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Tasks
        </h2>
        <Button
          onClick={onCreateTask}
          variant="ghost"
          size="sm"
          title="Create new task"
          aria-label="Create new task"
          className="gap-1 text-xs"
        >
          <Plus size={14} />
          New
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 px-4 pb-3 pt-2">
        {FILTER_OPTIONS.map((option) => {
          const isActive = option === filter;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={[
                "rounded-full border border-transparent px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors",
                isActive
                  ? "bg-accent/15 text-foreground shadow-sm ring-1 ring-accent/30 dark:bg-white/15 dark:text-white"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:bg-white/5 dark:hover:bg-white/10",
              ].join(" ")}
            >
              {option}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {isDiscovering && tasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <div className="animate-spin text-3xl">⟳</div>
            <p className="text-sm font-medium">Discovering tasks…</p>
            <p className="text-xs text-muted-foreground/80">Scanning SDR system</p>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <div className="text-4xl">📡</div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
              No {filter !== "all" ? filter.toUpperCase() : ""} tasks
            </div>
            <div className="max-w-[220px] text-xs text-muted-foreground/80">
              {filter === "all"
                ? "Create a receive task to start monitoring RF spectrum"
                : `No ${filter.toUpperCase()} tasks available`}
            </div>
            {filter === "all" && (
              <Button onClick={onCreateTask} variant="ghost" size="sm">
                + Create Task
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-2">
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
