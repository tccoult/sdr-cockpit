import { Activity, AlertTriangle, Wifi, Radio, CheckCircle2, ExternalLink } from 'lucide-react'
import { cloneElement } from 'react'

import { DataStreamStatus } from '../../api'
import { panelSubtle, panelSurface } from '../../styles/panelStyles'
import { Task } from '../../types/sdr'
import { Button } from '../common/Button'
import { HealthStatus } from '../layout/CompactHeader'

export interface OverviewTabProps {
  dataFps: number
  renderFps: number
  totalTasks: number
  operatorTasks: number
  selectedTask: Task | null
  streamStatus: DataStreamStatus
  streamError: string | null
  healthStatus: HealthStatus
}

/**
 * Overview tab showing system health, performance metrics, and quick stats.
 */
export function OverviewTab({
  dataFps,
  renderFps,
  totalTasks,
  operatorTasks,
  selectedTask,
  streamStatus,
  streamError,
  healthStatus,
}: OverviewTabProps) {
  const handleOpenGrafana = () => {
    // Open Grafana dashboard in new tab
    const grafanaUrl = `http://${window.location.hostname}:3000`
    window.open(grafanaUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-6 text-sm text-foreground">
      {/* Overall Status */}
      <section className={[panelSurface, 'flex items-center justify-between gap-4 p-4'].join(' ')}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-accent dark:bg-white/10">
            {healthStatus === 'healthy' ? (
              <CheckCircle2 className="h-5 w-5 text-status-success" />
            ) : healthStatus === 'warning' ? (
              <AlertTriangle className="h-5 w-5 text-status-warning" />
            ) : healthStatus === 'error' ? (
              <AlertTriangle className="h-5 w-5 text-status-error" />
            ) : (
              <Activity className="h-5 w-5 text-muted-foreground" />
            )}
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              System Status
            </p>
            <h3 className="mt-1 text-base font-semibold">
              {healthStatus === 'healthy'
                ? 'All systems operational'
                : healthStatus === 'warning'
                ? 'Minor issues detected'
                : healthStatus === 'error'
                ? 'Critical issues detected'
                : 'Status unknown'}
            </h3>
          </div>
        </div>
        {selectedTask && (
          <div className="hidden text-right md:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Active Task
            </p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {selectedTask.name}
            </p>
          </div>
        )}
      </section>

      {/* Performance */}
      <section>
        <SectionHeader icon={<Activity size={16} />} title="Performance" />
        <div className="space-y-2.5">
          <MetricRow
            label="Data Rate"
            value={`${dataFps} FPS`}
            status={dataFps === 0 ? 'error' : dataFps < 30 ? 'warning' : 'healthy'}
          />
          <MetricRow
            label="Render Rate"
            value={renderFps > 0 ? `${renderFps.toFixed(1)} FPS` : '—'}
            status={
              renderFps === 0
                ? 'unknown'
                : renderFps < 30
                ? 'warning'
                : renderFps < 45
                ? 'healthy'
                : 'healthy'
            }
          />
          <MetricRow label="Latency" value="—" status="unknown" note="Not implemented" />
        </div>
      </section>

      {/* Network */}
      <section>
        <SectionHeader icon={<Wifi size={16} />} title="Network" />
        <div className="space-y-2.5">
          <MetricRow
            label="WebSocket"
            value={
              streamStatus === 'connected'
                ? 'Connected'
                : streamStatus === 'connecting'
                ? 'Connecting...'
                : streamStatus === 'error'
                ? 'Error'
                : 'Disconnected'
            }
            status={
              streamStatus === 'connected'
                ? 'healthy'
                : streamStatus === 'connecting'
                ? 'warning'
                : streamStatus === 'error'
                ? 'error'
                : 'unknown'
            }
          />
          {streamError && (
            <div className="rounded-lg border border-status-error/30 bg-status-error/10 px-3 py-2 text-xs font-medium text-status-error shadow-sm dark:border-status-error/40 dark:bg-status-error/15">
              {streamError}
            </div>
          )}
          <MetricRow label="Backend" value="—" status="unknown" note="Not implemented" />
          <MetricRow label="Ping" value="—" status="unknown" note="Not implemented" />
        </div>
      </section>

      {/* Tasks */}
      <section>
        <SectionHeader icon={<Radio size={16} />} title="Tasks" />
        <div className="space-y-2.5">
          <MetricRow label="Total Tasks" value={totalTasks.toString()} status="healthy" />
          <MetricRow label="Your Tasks" value={operatorTasks.toString()} status="healthy" />
          <MetricRow
            label="Active Task"
            value={selectedTask ? selectedTask.name : 'None'}
            status={selectedTask ? 'healthy' : 'unknown'}
          />
        </div>
      </section>

      {/* Grafana Dashboard Link */}
      <section className="mt-2">
        <Button
          onClick={handleOpenGrafana}
          variant="ghost"
          className="w-full justify-center gap-2"
        >
          <ExternalLink size={14} />
          Open Grafana Dashboard
        </Button>
      </section>
    </div>
  )
}

interface SectionHeaderProps {
  icon: React.ReactElement
  title: string
}

function SectionHeader({ icon, title }: SectionHeaderProps) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-accent shadow-sm dark:bg-white/10">
        {cloneElement(icon, { className: 'h-4 w-4' })}
      </span>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h3>
    </div>
  )
}

interface MetricRowProps {
  label: string
  value: string
  status: 'healthy' | 'warning' | 'error' | 'unknown'
  note?: string
}

const STATUS_TOKENS = {
  healthy: {
    badge: 'bg-status-success/15 text-status-success dark:bg-status-success/20',
    dot: 'bg-status-success',
  },
  warning: {
    badge: 'bg-status-warning/20 text-status-warning dark:bg-status-warning/20',
    dot: 'bg-status-warning',
  },
  error: {
    badge: 'bg-status-error/15 text-status-error dark:bg-status-error/20',
    dot: 'bg-status-error',
  },
  unknown: {
    badge: 'bg-muted/70 text-muted-foreground dark:bg-white/10 dark:text-muted-foreground',
    dot: 'bg-muted-foreground/60 dark:bg-white/50',
  },
} as const

function MetricRow({ label, value, status, note }: MetricRowProps) {
  const tokens = STATUS_TOKENS[status]

  return (
    <div className={[panelSubtle, 'flex items-center justify-between gap-4 border-transparent bg-muted/40 px-3 py-3 text-sm dark:bg-white/5'].join(' ')}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        {note && (
          <p className="mt-1 text-[11px] text-muted-foreground/80 dark:text-muted-foreground/70">{note}</p>
        )}
      </div>
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${tokens.badge}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${tokens.dot}`} />
        {value}
      </span>
    </div>
  )
}
