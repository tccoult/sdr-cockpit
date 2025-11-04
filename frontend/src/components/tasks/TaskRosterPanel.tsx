import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../common/Button'
import { Task } from '../../types/sdr'
import { TaskCard } from './TaskCard'

type FilterType = 'all' | 'rx' | 'tx'

export interface TaskRosterPanelProps {
  tasks: Task[]
  selectedTaskId: string | null
  isDiscovering: boolean
  onSelectTask: (taskId: string) => void
  onCreateTask: () => void
  onPauseTask?: (taskId: string) => void
  onStopTask?: (taskId: string) => void
  onRecordTask?: (taskId: string) => void
  onStopRecording?: (taskId: string) => void
}

const FILTER_OPTIONS: FilterType[] = ['all', 'rx', 'tx']

export function TaskRosterPanel({
  tasks,
  selectedTaskId,
  isDiscovering,
  onSelectTask,
  onCreateTask,
  onPauseTask,
  onStopTask,
  onRecordTask,
  onStopRecording,
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
    <div className="flex h-full flex-col bg-slate-950/30 text-slate-100">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
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

      <div className="flex gap-2 border-b border-white/10 px-4 py-3">
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
                  ? 'border-white/40 bg-cockpit-accent/20 text-white shadow-sm shadow-black/40'
                  : 'border-white/10 bg-slate-900/40 text-slate-300 hover:border-white/20 hover:text-slate-100',
              ].join(' ')}
            >
              {option}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {isDiscovering && tasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-300">
            <div className="animate-spin text-3xl">⟳</div>
            <p className="text-sm font-medium">Discovering tasks...</p>
            <p className="text-xs text-slate-400">Scanning SDR system</p>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-300">
            <div className="text-4xl">📡</div>
            <div className="text-xs uppercase tracking-wide text-slate-400">
              No {filter !== 'all' ? filter.toUpperCase() : ''} tasks
            </div>
            <div className="max-w-[200px] text-xs text-slate-400">
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
                onPause={onPauseTask}
                onStop={onStopTask}
                onRecord={onRecordTask}
                onStopRecording={onStopRecording}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
