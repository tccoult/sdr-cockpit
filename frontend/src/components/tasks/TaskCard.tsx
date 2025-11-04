import { Task } from '../../types/sdr'
import { formatDuration, formatFrequency } from '../../utils/formatters'

type TaskCardProps = {
  task: Task
  isSelected: boolean
  onSelect: (taskId: string) => void
}

const STATUS_STYLES: Record<Task['status'], { dot: string; badge: string; label: string }> = {
  live: {
    dot: 'bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.35)] dark:bg-emerald-400',
    badge:
      'border border-emerald-300 bg-emerald-100 text-emerald-700 shadow-inner shadow-emerald-200/40 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-200 dark:shadow-inner dark:shadow-emerald-500/20',
    label: 'Live',
  },
  transmitting: {
    dot: 'bg-sky-500 shadow-[0_0_10px_rgba(56,189,248,0.35)] dark:bg-sky-400',
    badge:
      'border border-sky-300 bg-sky-100 text-sky-700 shadow-inner shadow-sky-200/40 dark:border-sky-400/40 dark:bg-sky-500/10 dark:text-sky-200 dark:shadow-inner dark:shadow-sky-500/20',
    label: 'Transmitting',
  },
  paused: {
    dot: 'bg-amber-400',
    badge:
      'border border-amber-300 bg-amber-100 text-amber-700 shadow-inner shadow-amber-200/40 dark:border-amber-300/40 dark:bg-amber-200/10 dark:text-amber-100 dark:shadow-inner dark:shadow-amber-200/20',
    label: 'Paused',
  },
  stopped: {
    dot: 'bg-slate-500',
    badge:
      'border border-slate-300 bg-slate-100 text-slate-600 shadow-inner shadow-slate-200/40 dark:border-slate-500/40 dark:bg-slate-600/10 dark:text-slate-200 dark:shadow-inner dark:shadow-slate-900/10',
    label: 'Stopped',
  },
}

const RECORDING_BADGE =
  'border border-rose-300 bg-rose-100 text-rose-700 shadow-inner shadow-rose-200/40 dark:border-rose-400/50 dark:bg-rose-500/10 dark:text-rose-100 dark:shadow-inner dark:shadow-rose-500/25'

export function TaskCard({
  task,
  isSelected,
  onSelect,
}: TaskCardProps) {
  const statusStyles = STATUS_STYLES[task.status]
  const isRecording = task.recording?.isRecording ?? false

  const handleSelect = () => {
    onSelect(task.id)
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleSelect()
        }
      }}
      className={[
        'group rounded-xl border px-3 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cockpit-accent/60',
        'backdrop-blur-sm bg-white text-slate-900 hover:bg-cockpit-accent/5 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-slate-900/55',
        isSelected
          ? 'border-cockpit-accent/60 shadow-md shadow-cockpit-glow/40 ring-1 ring-cockpit-accent/40 dark:border-white/30 dark:shadow-lg dark:shadow-black/40 dark:ring-white/30'
          : 'border-slate-200 hover:border-cockpit-accent/40 dark:border-white/10 dark:hover:border-white/20',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <span
          className={[
            'h-2.5 w-2.5 flex-shrink-0 rounded-full',
            isRecording ? 'animate-pulse' : '',
            statusStyles.dot,
          ].join(' ')}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {task.name}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {formatFrequency(task.frequency)} · {task.type.toUpperCase()}
          </p>
        </div>
        <span
          className={[
            'whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            statusStyles.badge,
          ].join(' ')}
        >
          {isRecording ? 'Recording' : statusStyles.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <span className="font-medium text-slate-600 dark:text-slate-400">Owner</span>
          <span className="text-slate-700 dark:text-slate-300">{task.ownerName}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="font-medium text-slate-600 dark:text-slate-400">Uptime</span>
          <span className="text-slate-700 dark:text-slate-300">{formatDuration(task.uptime)}</span>
        </span>
        {task.recording && (
          <span
            className={[
              'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
              RECORDING_BADGE,
            ].join(' ')}
          >
            {task.recording.filename}
          </span>
        )}
      </div>
    </article>
  )
}
