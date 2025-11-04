import { MouseEvent } from 'react'
import { Task } from '../../types/sdr'
import { formatDuration, formatFrequency } from '../../utils/formatters'

type TaskCardProps = {
  task: Task
  isSelected: boolean
  onSelect: (taskId: string) => void
  onPause?: (taskId: string) => void
  onStop?: (taskId: string) => void
  onSettings?: (taskId: string) => void
  onRecord?: (taskId: string) => void
  onStopRecording?: (taskId: string) => void
}

const STATUS_STYLES: Record<
  Task['status'],
  { dot: string; badge: string; label: string }
> = {
  live: {
    dot: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.45)]',
    badge:
      'border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 shadow-inner shadow-emerald-500/20',
    label: 'Live',
  },
  transmitting: {
    dot: 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.45)]',
    badge:
      'border border-sky-400/40 bg-sky-500/10 text-sky-200 shadow-inner shadow-sky-500/20',
    label: 'Transmitting',
  },
  paused: {
    dot: 'bg-amber-300',
    badge:
      'border border-amber-300/40 bg-amber-200/10 text-amber-100 shadow-inner shadow-amber-200/20',
    label: 'Paused',
  },
  stopped: {
    dot: 'bg-slate-500',
    badge:
      'border border-slate-500/40 bg-slate-600/10 text-slate-200 shadow-inner shadow-slate-900/10',
    label: 'Stopped',
  },
}

const RECORDING_BADGE =
  'border border-rose-400/50 bg-rose-500/10 text-rose-100 shadow-inner shadow-rose-500/25'

const CONTROL_BUTTON_CLASSES =
  'rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-white/60'

export function TaskCard({
  task,
  isSelected,
  onSelect,
  onPause,
  onStop,
  onSettings,
  onRecord,
  onStopRecording,
}: TaskCardProps) {
  const statusStyles = STATUS_STYLES[task.status]
  const isOperatorTask = task.owner === 'self'
  const isRecording = task.recording?.isRecording ?? false

  const handleSelect = () => {
    onSelect(task.id)
  }

  const handleAction = (
    event: MouseEvent<HTMLButtonElement>,
    callback?: (taskId: string) => void
  ) => {
    event.stopPropagation()
    callback?.(task.id)
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
        'group rounded-xl border px-3 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
        'bg-slate-900/40 backdrop-blur-sm',
        isSelected
          ? 'border-white/30 shadow-lg shadow-black/40 ring-1 ring-white/30'
          : 'border-white/10 hover:border-white/20 hover:bg-slate-900/55',
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
          <p className="truncate text-sm font-medium text-slate-100">
            {task.name}
          </p>
          <p className="truncate text-xs text-slate-400">
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

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <span className="font-medium text-slate-500">Owner</span>
          <span className="text-slate-300">{task.ownerName}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="font-medium text-slate-500">Uptime</span>
          <span className="text-slate-300">{formatDuration(task.uptime)}</span>
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

      {isOperatorTask && isSelected && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={CONTROL_BUTTON_CLASSES}
            onClick={(event) =>
              handleAction(event, onPause)
            }
          >
            {task.status === 'paused' ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            className={CONTROL_BUTTON_CLASSES}
            onClick={(event) => handleAction(event, onStop)}
          >
            Stop
          </button>
          {onSettings && (
            <button
              type="button"
              className={CONTROL_BUTTON_CLASSES}
              onClick={(event) => handleAction(event, onSettings)}
            >
              Settings
            </button>
          )}
          {task.type === 'rx' && (
            <button
              type="button"
              className={CONTROL_BUTTON_CLASSES}
              onClick={(event) =>
                handleAction(event, isRecording ? onStopRecording : onRecord)
              }
            >
              {isRecording ? 'Stop Rec' : 'Record'}
            </button>
          )}
        </div>
      )}
    </article>
  )
}
