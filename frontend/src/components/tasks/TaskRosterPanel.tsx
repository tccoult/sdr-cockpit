import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Task, TaskType } from "../../types/sdr";
import { moduleLabel, panelChromeMuted } from "../../styles/panelStyles";
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
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4">
      <div className={[panelChromeMuted, "flex min-h-0 flex-1 flex-col overflow-hidden"].join(" ")}>
        <div className="flex items-center justify-between border-b border-border/50 bg-muted/60 px-4 py-3">
          <h2 className={moduleLabel}>Task Roster</h2>
          <Button
            onClick={onCreateTask}
            variant="icon"
            title="Create new task"
            aria-label="Create new task"
          >
            <Plus size={16} />
          </Button>
        </div>

        <div className="flex gap-2 border-b border-border/50 bg-card/90 px-4 py-3">
          {FILTER_OPTIONS.map((option) => {
            const isActive = option === filter;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={[
                  "flex-1 rounded-md border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] transition",
                  isActive
                    ? "border-border/60 bg-muted/80 text-foreground shadow-inner"
                    : "border-border/40 bg-card text-muted-foreground hover:text-foreground",
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
              <p className="text-sm font-medium text-foreground">Discovering tasks...</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Scanning SDR system
              </p>
            </div>
          ) : sortedTasks.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <div className="text-4xl">📡</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                No {filter !== "all" ? filter.toUpperCase() : ""} tasks
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
      </div>
    </div>
  );
}
