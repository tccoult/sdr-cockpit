import { Activity, AlertTriangle, Wifi, Radio, CheckCircle2, ExternalLink } from 'lucide-react'
import { Task } from '../../types/sdr'
import { HealthStatus } from '../layout/CompactHeader'
import { DataStreamStatus } from '../../api'
import { Button } from '../common/Button'
import { panelChrome } from '../../styles/panelStyles'

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
    <div className="flex flex-col gap-6 p-4 text-foreground">
      <section className={[panelChrome, 'p-4'].join(' ')}>
        <div className="flex items-center gap-3">
          {healthStatus === 'healthy' ? (
            <CheckCircle2 className="h-5 w-5 text-status-success" />
          ) : healthStatus === 'warning' ? (
            <AlertTriangle className="h-5 w-5 text-status-warning" />
          ) : healthStatus === 'error' ? (
            <AlertTriangle className="h-5 w-5 text-status-error" />
          ) : (
            <Activity className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              System Status
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {healthStatus === 'healthy'
                ? 'All systems operational'
                : healthStatus === 'warning'
                ? 'Minor issues detected'
                : healthStatus === 'error'
                ? 'Critical issues detected'
                : 'Status unknown'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Monitoring RF front-end, networking, and telemetry cadence.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader icon={<Activity size={16} />} title="Performance" />
        <MetricGroup>
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
          <MetricRow
            label="Latency"
            value="—"
            status="unknown"
            note="Not instrumented"
          />
        </MetricGroup>
      </section>

      <section className="space-y-4">
        <SectionHeader icon={<Wifi size={16} />} title="Network" />
        <MetricGroup>
          <MetricRow
            label="WebSocket"
            value={
              streamStatus === 'connected'
                ? 'Connected'
                : streamStatus === 'connecting'
                ? 'Connecting…'
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
            <div className="rounded-md border border-status-error/50 bg-status-error/10 px-3 py-2 text-[11px] text-status-error dark:border-status-error/40 dark:bg-status-error/15">
              {streamError}
            </div>
          )}
          <MetricRow label="Backend" value="—" status="unknown" note="Not instrumented" />
          <MetricRow label="Ping" value="—" status="unknown" note="Not instrumented" />
        </MetricGroup>
      </section>

      <section className="space-y-4">
        <SectionHeader icon={<Radio size={16} />} title="Tasks" />
        <MetricGroup>
          <MetricRow label="Total Tasks" value={totalTasks.toString()} status="healthy" />
          <MetricRow label="Operator Tasks" value={operatorTasks.toString()} status="healthy" />
          <MetricRow
            label="Active Task"
            value={selectedTask ? selectedTask.name : 'None'}
            status={selectedTask ? 'healthy' : 'unknown'}
            note={selectedTask ? undefined : 'Select a task to drive visualizations'}
          />
        </MetricGroup>
      </section>

      <section>
        <Button
          onClick={handleOpenGrafana}
          variant="secondary"
          className="w-full justify-center gap-2 text-[11px] uppercase tracking-[0.2em]"
        >
          <ExternalLink size={14} />
          Open Grafana Dashboard
        </Button>
      </section>
    </div>
  )
}

interface SectionHeaderProps {
  icon: React.ReactNode
  title: string
}

function SectionHeader({ icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-card/80 text-[11px] text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:border-border/50 dark:bg-card/25">
        {icon}
      </span>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em]">{title}</h3>
    </div>
  )
}

function MetricGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2">{children}</div>
}

interface MetricRowProps {
  label: string
  value: string
  status: 'healthy' | 'warning' | 'error' | 'unknown'
  note?: string
}

function MetricRow({ label, value, status, note }: MetricRowProps) {
  const statusColor = {
    healthy: 'text-status-success',
    warning: 'text-status-warning',
    error: 'text-status-error',
    unknown: 'text-muted-foreground',
  }[status]

  return (
    <div className="rounded-md border border-border/60 bg-card/90 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:border-border/50 dark:bg-card/25">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <span className={`text-sm font-semibold ${statusColor}`}>{value}</span>
      </div>
      {note && (
        <p className="mt-1 text-[10px] text-muted-foreground">{note}</p>
      )}
    </div>
  )
}
