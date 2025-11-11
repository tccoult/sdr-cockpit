import {
  Activity,
  AlertTriangle,
  Wifi,
  Radio,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { Task } from '../../types/sdr'
import { HealthStatus } from '../layout/CompactHeader'
import { DataStreamStatus } from '../../api'
import { Button } from '../common/Button'
import { dataLabel, dataValue, moduleLabel, panelChromeMuted } from '../../styles/panelStyles'

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
    <div className="flex flex-col gap-6 p-4">
      {/* Overall Status */}
      <section className={[panelChromeMuted, 'space-y-4 p-4'].join(' ')}>
        <p className={moduleLabel}>Overall</p>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border/40 bg-muted/60 text-muted-foreground">
            {healthStatus === 'healthy' ? (
              <CheckCircle2 className="h-5 w-5 text-status-success" />
            ) : healthStatus === 'warning' ? (
              <AlertTriangle className="h-5 w-5 text-status-warning" />
            ) : healthStatus === 'error' ? (
              <AlertTriangle className="h-5 w-5 text-status-error" />
            ) : (
              <Activity className="h-5 w-5" />
            )}
          </span>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">System Status</h3>
            <p className="text-xs text-muted-foreground">
              {healthStatus === 'healthy'
                ? 'All systems operational'
                : healthStatus === 'warning'
                ? 'Minor issues detected'
                : healthStatus === 'error'
                ? 'Critical issues detected'
                : 'Status unknown'}
            </p>
          </div>
        </div>
      </section>

      <MetricGroup
        icon={<Activity size={14} />}
        title="Performance"
        metrics={[
          {
            label: 'Data Rate',
            value: `${dataFps} FPS`,
            status: dataFps === 0 ? 'error' : dataFps < 30 ? 'warning' : 'healthy',
          },
          {
            label: 'Render Rate',
            value: renderFps > 0 ? `${renderFps.toFixed(1)} FPS` : '—',
            status:
              renderFps === 0
                ? 'unknown'
                : renderFps < 30
                ? 'warning'
                : 'healthy',
          },
          {
            label: 'Latency',
            value: '—',
            status: 'unknown',
            note: 'Not instrumented',
          },
        ]}
      />

      <MetricGroup
        icon={<Wifi size={14} />}
        title="Network"
        metrics={[
          {
            label: 'WebSocket',
            value:
              streamStatus === 'connected'
                ? 'Connected'
                : streamStatus === 'connecting'
                ? 'Connecting'
                : streamStatus === 'error'
                ? 'Error'
                : 'Disconnected',
            status:
              streamStatus === 'connected'
                ? 'healthy'
                : streamStatus === 'connecting'
                ? 'warning'
                : streamStatus === 'error'
                ? 'error'
                : 'unknown',
          },
          {
            label: 'Backend',
            value: '—',
            status: 'unknown',
            note: 'Not instrumented',
          },
          {
            label: 'Ping',
            value: '—',
            status: 'unknown',
            note: 'Not instrumented',
          },
        ]}
        footer={
          streamError ? (
            <div className="rounded-md border border-status-error/50 bg-status-error/10 px-3 py-2 text-[11px] font-medium text-status-error">
              {streamError}
            </div>
          ) : null
        }
      />

      <MetricGroup
        icon={<Radio size={14} />}
        title="Tasks"
        metrics={[
          { label: 'Total Tasks', value: totalTasks.toString(), status: 'healthy' },
          { label: 'Your Tasks', value: operatorTasks.toString(), status: 'healthy' },
          {
            label: 'Active Task',
            value: selectedTask ? selectedTask.name : 'None',
            status: selectedTask ? 'healthy' : 'unknown',
          },
        ]}
      />

      <section className={[panelChromeMuted, 'space-y-4 p-4'].join(' ')}>
        <p className={moduleLabel}>Telemetry</p>
        <Button
          onClick={handleOpenGrafana}
          variant="secondary"
          className="w-full justify-center gap-2 text-xs"
        >
          <ExternalLink size={14} />
          Open Grafana Dashboard
        </Button>
      </section>
    </div>
  )
}

type MetricStatus = 'healthy' | 'warning' | 'error' | 'unknown'

interface MetricDefinition {
  label: string
  value: string
  status: MetricStatus
  note?: string
}

interface MetricGroupProps {
  icon: React.ReactNode
  title: string
  metrics: MetricDefinition[]
  footer?: React.ReactNode
}

function MetricGroup({ icon, title, metrics, footer }: MetricGroupProps) {
  return (
    <section className={[panelChromeMuted, 'space-y-4 p-4'].join(' ')}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border/40 bg-muted/60 text-muted-foreground">
          {icon}
        </span>
        <p className={moduleLabel}>{title}</p>
      </div>
      <div className="space-y-2">
        {metrics.map((metric) => (
          <MetricRow key={metric.label} {...metric} />
        ))}
      </div>
      {footer && <div className="pt-1">{footer}</div>}
    </section>
  )
}

function MetricRow({ label, value, status, note }: MetricDefinition) {
  const tone = {
    healthy: 'text-status-success',
    warning: 'text-status-warning',
    error: 'text-status-error',
    unknown: 'text-muted-foreground',
  }[status]

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 rounded-md border border-border/40 bg-card/90 px-3 py-2 shadow-sm">
      <span className={dataLabel}>{label}</span>
      <div className="flex items-baseline gap-2">
        {note && (
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{note}</span>
        )}
        <span className={[dataValue, tone].join(' ')}>{value}</span>
      </div>
    </div>
  )
}
