import { Menu, ChevronDown } from 'lucide-react'
import { ThemeToggle } from '../app/ThemeToggle'
import { SettingsMenu, SettingsMenuItem } from '../settings/SettingsMenu'
import { getHealthIndicator } from '../../styles/theme'

export type HealthStatus = 'operational' | 'degraded' | 'non-operational' | 'unknown'

const HEALTH_STATUS_LABELS: Record<HealthStatus, string> = {
  'operational': 'Operational',
  'degraded': 'Degraded',
  'non-operational': 'Non-Operational',
  'unknown': 'Unknown',
}

export interface CompactHeaderProps {
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
 * Shows critical info: FPS, health status, task count.
 */
export function CompactHeader({
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
          title={`System health: ${HEALTH_STATUS_LABELS[healthStatus]}`}
          aria-label={`System health: ${HEALTH_STATUS_LABELS[healthStatus]}`}
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

