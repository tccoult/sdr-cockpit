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
    <header className="relative z-[60] flex h-12 items-center justify-between gap-4 border-b border-border/60 bg-muted/70 px-4 text-foreground backdrop-blur-md dark:bg-muted/20">
      {/* Left: Menu + Title + Task Info */}
      <div className="flex items-center gap-3 overflow-hidden">
        <button
          type="button"
          onClick={onToggleTaskDrawer}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-card/80 text-muted-foreground transition hover:bg-card/70 hover:text-foreground dark:border-border/50 dark:bg-card/30 dark:hover:bg-card/40"
          aria-label="Toggle task drawer"
          title="Toggle task drawer"
        >
          <Menu size={16} />
        </button>

        <div className="flex items-center gap-2 overflow-hidden">
          <h1 className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            SDR Cockpit
          </h1>

          {selectedTask && (
            <>
              <span className="text-border/70">|</span>
              <div className="flex items-center gap-2 overflow-hidden text-[11px] text-muted-foreground">
                <span className="truncate font-semibold uppercase tracking-[0.18em] text-foreground">
                  {selectedTask.name}
                </span>
                <span className="text-border/70">•</span>
                <span className="whitespace-nowrap text-muted-foreground">
                  {formatFrequency(selectedTask.frequency)} @ {formatSampleRate(selectedTask.sampleRate)}
                </span>
                <span className="text-border/70">•</span>
                <span
                  className={`whitespace-nowrap font-semibold ${getStatusColor(selectedTask.status)}`}
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
        <div className="hidden items-center gap-1.5 rounded-md border border-border/60 bg-card/80 px-2.5 py-1.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:border-border/50 dark:bg-card/30 lg:flex">
          <span className="font-semibold text-foreground">
            {dataFps}
          </span>
          <span className="text-border/70">/</span>
          <span className="font-semibold text-foreground">
            {renderFps > 0 ? renderFps.toFixed(0) : '—'}
          </span>
          <span>FPS</span>
        </div>

        {/* Task Count Badge - hidden on mobile */}
        <button
          type="button"
          onClick={onToggleTaskDrawer}
          className="hidden items-center gap-1.5 rounded-md border border-border/60 bg-card/80 px-2.5 py-1.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition hover:bg-card/70 hover:text-foreground dark:border-border/50 dark:bg-card/30 dark:hover:bg-card/40 lg:flex"
          title="View tasks"
        >
          <span className="font-semibold text-foreground">
            {totalTasks}
          </span>
          <span>Tasks</span>
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
        <div className="hidden h-6 w-px bg-border/70 lg:block" />

        {/* Status - Button on desktop, Bubble only on mobile */}
        <button
          type="button"
          onClick={onToggleStatusPanel}
          className={`flex h-8 items-center gap-1 rounded-md border px-3 text-[11px] uppercase tracking-[0.16em] transition-all duration-150 ease-in-out lg:gap-1 lg:px-3`}
          style={{
            borderColor: isStatusPanelOpen && !isMobile
              ? healthIndicator.dotColor
              : healthIndicator.borderColor,
            backgroundColor: healthIndicator.bgColor,
            boxShadow: isStatusPanelOpen && !isMobile
              ? `0 0 0 2px ${healthIndicator.dotColor}33`
              : 'inset 0 1px 0 rgba(255,255,255,0.45)',
            color: isStatusPanelOpen ? healthIndicator.dotColor : undefined,
          }}
          title={`System status: ${healthStatus}`}
          aria-label={`System status: ${healthStatus}`}
        >
          <span className="hidden font-semibold lg:inline">Status</span>
          <ChevronDown
            size={12}
            className={`hidden text-muted-foreground transition-transform duration-150 ease-in-out lg:inline ${
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
