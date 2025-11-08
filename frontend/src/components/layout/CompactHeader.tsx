import { Menu, ChevronDown } from 'lucide-react'
import { ThemeToggle } from '../app/ThemeToggle'
import { SettingsMenu, SettingsMenuItem } from '../settings/SettingsMenu'
import { Task } from '../../types/sdr'
import { formatFrequency, formatSampleRate } from '../../utils/formatters'
import { getTaskStatusLabel } from '../tasks/ActiveTaskPanel/taskStatus'

export type HealthStatus = 'healthy' | 'warning' | 'error' | 'unknown'

export interface CompactHeaderProps {
  selectedTask: Task | null
  dataFps: number
  renderFps: number
  totalTasks: number
  healthStatus: HealthStatus
  onToggleTaskDrawer: () => void
  onToggleStatusPanel: () => void
  onOpenSettings: (item: SettingsMenuItem) => void
}

/**
 * Compact single-line header for display-first cockpit layout.
 * Shows critical info: task, FPS, health status.
 */
export function CompactHeader({
  selectedTask,
  dataFps,
  renderFps,
  totalTasks,
  healthStatus,
  onToggleTaskDrawer,
  onToggleStatusPanel,
  onOpenSettings,
}: CompactHeaderProps) {
  const taskStatusLabel = getTaskStatusLabel(selectedTask)

  const healthIndicator = getHealthIndicator(healthStatus)

  return (
    <header className="relative z-40 flex h-12 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/95">
      {/* Left: Menu + Title + Task Info */}
      <div className="flex items-center gap-3 overflow-hidden">
        <button
          type="button"
          onClick={onToggleTaskDrawer}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          aria-label="Toggle task drawer"
          title="Toggle task drawer"
        >
          <Menu size={16} />
        </button>

        <div className="flex items-center gap-2 overflow-hidden">
          <h1 className="whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-white">
            SDR Cockpit
          </h1>

          {selectedTask && (
            <>
              <span className="text-slate-400 dark:text-slate-600">|</span>
              <div className="flex items-center gap-2 overflow-hidden text-xs">
                <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                  {selectedTask.name}
                </span>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <span className="whitespace-nowrap text-slate-600 dark:text-slate-400">
                  {formatFrequency(selectedTask.frequency)} @ {formatSampleRate(selectedTask.sampleRate)}
                </span>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <span
                  className={`whitespace-nowrap font-medium ${getStatusColor(selectedTask.status)}`}
                >
                  {taskStatusLabel}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Telemetry + Settings + Theme + Divider + Status */}
      <div className="flex items-center gap-3">
        {/* FPS Badge */}
        <div className="hidden items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs dark:border-white/10 dark:bg-slate-800/50 sm:flex">
          <span className="font-semibold text-slate-900 dark:text-white">
            {dataFps}
          </span>
          <span className="text-slate-400 dark:text-slate-600">/</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {renderFps > 0 ? renderFps.toFixed(0) : '—'}
          </span>
          <span className="text-slate-500 dark:text-slate-400">FPS</span>
        </div>

        {/* Task Count Badge */}
        <button
          type="button"
          onClick={onToggleTaskDrawer}
          className="hidden items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800 sm:flex"
          title="View tasks"
        >
          <span className="font-semibold text-slate-900 dark:text-white">
            {totalTasks}
          </span>
          <span className="text-slate-500 dark:text-slate-400">Tasks</span>
        </button>

        {/* Settings Menu */}
        <SettingsMenu onSelectItem={onOpenSettings} />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Divider */}
        <div className="h-6 w-px bg-slate-300 dark:bg-white/20" />

        {/* Status Panel Button (wider with label) */}
        <button
          type="button"
          onClick={onToggleStatusPanel}
          className="flex h-8 items-center gap-2 rounded-md border px-3 transition-all hover:brightness-110"
          style={{
            borderColor: healthIndicator.borderColor,
            backgroundColor: healthIndicator.bgColor,
          }}
          title={`System status: ${healthStatus}`}
          aria-label={`System status: ${healthStatus}`}
        >
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Status
          </span>
          <ChevronDown size={12} className="text-slate-500 dark:text-slate-400" />
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor: healthIndicator.dotColor,
              boxShadow: healthIndicator.glow,
            }}
          />
        </button>
      </div>
    </header>
  )
}

function getStatusColor(status: Task['status']): string {
  switch (status) {
    case 'live':
    case 'transmitting':
      return 'text-emerald-600 dark:text-emerald-400'
    case 'paused':
      return 'text-amber-600 dark:text-amber-400'
    case 'stopped':
      return 'text-slate-500 dark:text-slate-400'
    default:
      return 'text-slate-600 dark:text-slate-400'
  }
}

function getHealthIndicator(status: HealthStatus) {
  switch (status) {
    case 'healthy':
      return {
        dotColor: '#10b981', // emerald-500
        bgColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: 'rgba(16, 185, 129, 0.3)',
        glow: '0 0 8px rgba(16, 185, 129, 0.4)',
      }
    case 'warning':
      return {
        dotColor: '#f59e0b', // amber-500
        bgColor: 'rgba(245, 158, 11, 0.1)',
        borderColor: 'rgba(245, 158, 11, 0.3)',
        glow: '0 0 8px rgba(245, 158, 11, 0.4)',
      }
    case 'error':
      return {
        dotColor: '#ef4444', // red-500
        bgColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
        glow: '0 0 8px rgba(239, 68, 68, 0.4)',
      }
    case 'unknown':
    default:
      return {
        dotColor: '#64748b', // slate-500
        bgColor: 'rgba(100, 116, 139, 0.1)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        glow: 'none',
      }
  }
}
