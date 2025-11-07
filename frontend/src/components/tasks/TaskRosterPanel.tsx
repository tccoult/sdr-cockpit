import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../common/Button'
import { Task, TaskType } from '../../types/sdr'
import { TaskCard } from './TaskCard'

type FilterType = 'all' | TaskType

export interface TaskRosterPanelProps {
  tasks: Task[]
  selectedTaskId: string | null
  isDiscovering: boolean
  onSelectTask: (taskId: string) => void
  onCreateTask: () => void
}

const FILTER_OPTIONS: FilterType[] = ['all', TaskType.RX, TaskType.TX]

export function TaskRosterPanel({
  tasks,
  selectedTaskId,
  isDiscovering,
  onSelectTask,
  onCreateTask,
}: TaskRosterPanelProps) {
  const [filter, setFilter] = useState<FilterType>('all')

  const filteredTasks = useMemo(() => {
    if (filter === 'all') {
      return tasks
    }
    return tasks.filter((task) => task.type === filter)
  }, [filter, tasks])

  const sortedTasks = useMemo(
    () =>
      [...filteredTasks].sort((a, b) => {
        return b.createdAt - a.createdAt
      }),
    [filteredTasks]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white text-slate-900 dark:bg-slate-950/30 dark:text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
          Tasks
        </h2>
        <Button
          onClick={onCreateTask}
          variant="icon"
          title="Create new task"
          aria-label="Create new task"
        >
          <Plus size={16} />
        </Button>
      </div>

      <div className="flex gap-2 border-b border-slate-200 px-4 py-3 dark:border-white/10">
        {FILTER_OPTIONS.map((option) => {
          const isActive = option === filter
          return (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={[
                'flex-1 rounded-lg border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition',
                isActive
                  ? 'border-cockpit-accent/50 bg-cockpit-accent/10 text-slate-900 shadow-sm shadow-cockpit-glow/40 dark:border-white/40 dark:bg-cockpit-accent/20 dark:text-white'
                  : 'border-slate-200 bg-slate-100 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-slate-100',
              ].join(' ')}
            >
              {option}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {isDiscovering && tasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-300">
            <div className="animate-spin text-3xl">⟳</div>
            <p className="text-sm font-medium">Discovering tasks...</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Scanning SDR system</p>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-500 dark:text-slate-300">
            <div className="text-4xl">📡</div>
            <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              No {filter !== 'all' ? filter.toUpperCase() : ''} tasks
            </div>
            <div className="max-w-[200px] text-xs text-slate-400 dark:text-slate-500">
              {filter === 'all'
                ? 'Create a receive task to start monitoring RF spectrum'
                : `No ${filter.toUpperCase()} tasks available`}
            </div>
            {filter === 'all' && (
              <Button onClick={onCreateTask} variant="secondary" size="sm">
                + Create Task
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
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
  )
}
