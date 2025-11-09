import { Menu, ChevronDown } from 'lucide-react'
import { ThemeToggle } from '../app/ThemeToggle'
import { SettingsMenu, SettingsMenuItem } from '../settings/SettingsMenu'
import { Task } from '../../types/sdr'
import { formatFrequency, formatSampleRate } from '../../utils/formatters'
import { getTaskStatusLabel } from '../tasks/ActiveTaskPanel/taskStatus'
import { getHealthIndicator } from '../../styles/themeColors'

export type HealthStatus = 'healthy' | 'warning' | 'error' | 'unknown'

export interface CompactHeaderProps {
  selectedTask: Task | null
  dataFps: number
  renderFps: number
  totalTasks: number
  healthStatus: HealthStatus
  isStatusPanelOpen?: boolean
  isMobile?: boolean
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
  isStatusPanelOpen = false,
  isMobile = false,
  onToggleTaskDrawer,
  onToggleStatusPanel,
  onOpenSettings,
}: CompactHeaderProps) {
  const taskStatusLabel = getTaskStatusLabel(selectedTask)

  const healthIndicator = getHealthIndicator(healthStatus)

  return (
    <header className="relative z-[60] flex h-12 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-slate-900/95">
      {/* Left: Menu + Title + Task Info */}
      <div className="flex items-center gap-3 overflow-hidden">
        <button
          type="button"
          onClick={onToggleTaskDrawer}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
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
        {/* FPS Badge - hidden on mobile */}
        <div className="hidden items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-slate-800/50 lg:flex">
          <span className="font-semibold text-slate-900 dark:text-white">
            {dataFps}
          </span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {renderFps > 0 ? renderFps.toFixed(0) : '—'}
          </span>
          <span className="text-slate-500 dark:text-slate-400">FPS</span>
        </div>

        {/* Task Count Badge - hidden on mobile */}
        <button
          type="button"
          onClick={onToggleTaskDrawer}
          className="hidden items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800 lg:flex"
          title="View tasks"
        >
          <span className="font-semibold text-slate-900 dark:text-white">
            {totalTasks}
          </span>
          <span className="text-slate-500 dark:text-slate-400">Tasks</span>
        </button>

        {/* Settings Menu - hidden on mobile */}
        <div className="hidden lg:block">
          <SettingsMenu onSelectItem={onOpenSettings} />
        </div>

        {/* Theme Toggle - hidden on mobile */}
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>

        {/* Divider - hidden on mobile */}
        <div className="hidden h-6 w-px bg-slate-200 dark:bg-white/20 lg:block" />

        {/* Status - Button on desktop, Bubble only on mobile */}
        <button
          type="button"
          onClick={onToggleStatusPanel}
          className={`flex h-8 items-center gap-1 rounded-md border px-3 transition-all duration-150 ease-in-out hover:brightness-110 lg:gap-1 lg:px-3`}
          style={{
            borderColor: isStatusPanelOpen && !isMobile
              ? healthIndicator.dotColor
              : healthIndicator.borderColor,
            backgroundColor: healthIndicator.bgColor,
            boxShadow: isStatusPanelOpen && !isMobile
              ? `0 0 0 2px ${healthIndicator.dotColor}40`
              : undefined,
          }}
          title={`System status: ${healthStatus}`}
          aria-label={`System status: ${healthStatus}`}
        >
          <span className="hidden text-xs font-medium text-slate-700 dark:text-slate-300 lg:inline">
            Status
          </span>
          <ChevronDown
            size={12}
            className={`hidden text-slate-500 transition-transform duration-150 ease-in-out dark:text-slate-400 lg:inline ${
              isStatusPanelOpen ? 'rotate-180' : ''
            }`}
          />
          <span
            className="h-2.5 w-2.5 rounded-full transition-all duration-150"
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
      return 'text-status-success dark:text-status-success'
    case 'transmitting':
      return 'text-status-transmit dark:text-status-transmit'
    case 'paused':
      return 'text-status-warning dark:text-status-warning'
    case 'stopped':
      return 'text-status-stopped dark:text-status-stopped'
    default:
      return 'text-slate-600 dark:text-slate-400'
  }
}
