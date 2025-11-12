import { Menu, ChevronDown } from 'lucide-react'
import { ThemeToggle } from '../app/ThemeToggle'
import { SettingsMenu, SettingsMenuItem } from '../settings/SettingsMenu'
import { Task } from '../../types/sdr'
import { formatFrequency, formatSampleRate } from '../../utils/formatters'
import { getTaskStatusLabel } from '../tasks/ActiveTaskPanel/taskStatus'
import { getHealthIndicator } from '../../styles/theme'

export type HealthStatus = 'healthy' | 'warning' | 'error' | 'unknown'

export interface CompactHeaderProps {
  selectedTask: Task | null
  dataFps: number
  renderFps: number
  totalTasks: number
  healthStatus: HealthStatus
  isHealthPanelOpen?: boolean
  isMobile?: boolean
  onToggleTaskDrawer: () => void
  onToggleHealthPanel: () => void
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
  isHealthPanelOpen = false,
  isMobile = false,
  onToggleTaskDrawer,
  onToggleHealthPanel,
  onOpenSettings,
}: CompactHeaderProps) {
  const taskStatusLabel = getTaskStatusLabel(selectedTask)

  const healthIndicator = getHealthIndicator(healthStatus)

  return (
    <header className="relative z-[60] flex h-12 items-center justify-between gap-4 border-b border-border/70 bg-card/95 px-4 text-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
      {/* Left: Menu + Title + Task Info */}
      <div className="flex items-center gap-3 overflow-hidden">
        <button
          type="button"
          onClick={onToggleTaskDrawer}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-card text-muted-foreground transition hover:border-border hover:bg-muted/70 hover:text-foreground"
          aria-label="Toggle task drawer"
          title="Toggle task drawer"
        >
          <Menu size={16} />
        </button>

        <div className="flex items-center gap-2 overflow-hidden">
          <h1 className="whitespace-nowrap text-sm font-semibold text-foreground">
            SDR Cockpit
          </h1>

          {selectedTask && (
            <>
              <span className="text-muted-foreground/70">|</span>
              <div className="flex items-center gap-2 overflow-hidden text-xs">
                <span className="truncate font-medium text-foreground/90">
                  {selectedTask.name}
                </span>
                <span className="text-muted-foreground/70">•</span>
                <span className="whitespace-nowrap text-muted-foreground">
                  {formatFrequency(selectedTask.frequency)} @ {formatSampleRate(selectedTask.sampleRate)}
                </span>
                <span className="text-muted-foreground/70">•</span>
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
        <div className="hidden items-center gap-1.5 rounded-sm border border-border/80 bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground shadow-sm lg:flex">
          <span className="font-semibold text-foreground">
            {dataFps}
          </span>
          <span className="text-muted-foreground/70">/</span>
          <span className="font-semibold text-foreground">
            {renderFps > 0 ? renderFps.toFixed(0) : '—'}
          </span>
          <span className="text-muted-foreground">FPS</span>
        </div>

        {/* Task Count Badge - hidden on mobile */}
        <button
          type="button"
          onClick={onToggleTaskDrawer}
          className="hidden items-center gap-1.5 rounded-sm border border-border/80 bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground shadow-sm transition hover:border-border hover:bg-muted/70 hover:text-foreground lg:flex"
          title="View tasks"
        >
          <span className="font-semibold text-foreground">
            {totalTasks}
          </span>
          <span className="text-muted-foreground">Tasks</span>
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

        {/* Health - Button on desktop, Bubble only on mobile */}
        <button
          type="button"
          onClick={onToggleHealthPanel}
          className={`flex h-8 items-center gap-1 rounded-md border px-3 transition-all duration-150 ease-in-out hover:brightness-110 lg:gap-1 lg:px-3`}
          style={{
            borderColor: isHealthPanelOpen && !isMobile
              ? healthIndicator.dotColor
              : healthIndicator.borderColor,
            backgroundColor: healthIndicator.bgColor,
            boxShadow: isHealthPanelOpen && !isMobile
              ? `0 0 0 2px ${healthIndicator.dotColor}40`
              : undefined,
          }}
          title={`System health: ${healthStatus}`}
          aria-label={`System health: ${healthStatus}`}
        >
          <span className="hidden text-xs font-medium text-foreground/90 lg:inline">
            Health
          </span>
          <ChevronDown
            size={12}
            className={`hidden text-muted-foreground transition-transform duration-150 ease-in-out lg:inline ${
              isHealthPanelOpen ? 'rotate-180' : ''
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
      return 'text-muted-foreground'
  }
}
