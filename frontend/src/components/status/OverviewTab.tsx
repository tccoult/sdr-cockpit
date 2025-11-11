import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Radio,
  Wifi,
} from 'lucide-react'
import { Task } from '../../types/sdr'
import { HealthStatus } from '../layout/CompactHeader'
import { DataStreamStatus } from '../../api'
import { Button } from '../common/Button'

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')

type MetricStatus = 'healthy' | 'warning' | 'error' | 'unknown'

const STATUS_TOKENS: Record<
  MetricStatus,
  { dot: string; text: string; badge: string }
> = {
  healthy: {
    dot: 'bg-status-success',
    text: 'text-status-success',
    badge:
      'border-status-success/40 bg-status-success/12 text-status-success',
  },
  warning: {
    dot: 'bg-status-warning',
    text: 'text-status-warning',
    badge:
      'border-status-warning/40 bg-status-warning/12 text-status-warning',
  },
  error: {
    dot: 'bg-status-error',
    text: 'text-status-error',
    badge: 'border-status-error/40 bg-status-error/12 text-status-error',
  },
  unknown: {
    dot: 'bg-muted-foreground/60',
    text: 'text-muted-foreground',
    badge: 'border-border/60 bg-muted/70 text-muted-foreground',
  },
}

const HEALTH_TOKENS: Record<
  HealthStatus,
  {
    icon: typeof CheckCircle2
    tone: string
    label: string
    description: string
  }
> = {
  healthy: {
    icon: CheckCircle2,
    tone: 'text-status-success',
    label: 'Operational',
    description: 'All systems operational',
  },
  warning: {
    icon: AlertTriangle,
    tone: 'text-status-warning',
    label: 'Degraded',
    description: 'Minor issues detected',
  },
  error: {
    icon: AlertTriangle,
    tone: 'text-status-error',
    label: 'Critical Fault',
    description: 'Critical issues detected',
  },
  unknown: {
    icon: Activity,
    tone: 'text-muted-foreground',
    label: 'Unknown',
    description: 'Status unknown',
  },
}

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
    <div className="flex h-full flex-col gap-4 p-4">
      <SystemStatusCard healthStatus={healthStatus} />

      <OverviewSection
        icon={<Activity className="h-4 w-4" />}
        title="Performance"
        eyebrow="Telemetry"
        footer={
          <Button
            onClick={handleOpenGrafana}
            variant="secondary"
            size="sm"
            className="w-full justify-center gap-2"
          >
            <ExternalLink size={14} />
            Open Grafana Dashboard
          </Button>
        }
      >
        <MetricGroup>
          <MetricRow
            label="Data Rate"
            value={`${dataFps} FPS`}
            status={
              dataFps === 0 ? 'error' : dataFps < 30 ? 'warning' : 'healthy'
            }
          />
          <MetricRow
            label="Render Rate"
            value={renderFps > 0 ? `${renderFps.toFixed(1)} FPS` : '—'}
            status={
              renderFps === 0
                ? 'unknown'
                : renderFps < 30
                ? 'warning'
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
      </OverviewSection>

      <OverviewSection icon={<Wifi className="h-4 w-4" />} title="Network" eyebrow="Connectivity">
        <MetricGroup>
          <MetricRow
            label="WebSocket"
            value={
              streamStatus === 'connected'
                ? 'Connected'
                : streamStatus === 'connecting'
                ? 'Connecting'
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
          <MetricRow
            label="Backend"
            value="—"
            status="unknown"
            note="Telemetry pending"
          />
          <MetricRow
            label="Ping"
            value="—"
            status="unknown"
            note="Telemetry pending"
          />
        </MetricGroup>
        {streamError && (
          <div className="border-t border-border/70 bg-status-error/10 px-4 py-2 text-[11px] font-medium text-status-error">
            {streamError}
          </div>
        )}
      </OverviewSection>

      <OverviewSection icon={<Radio className="h-4 w-4" />} title="Tasks" eyebrow="Operations">
        <MetricGroup>
          <MetricRow
            label="Total Tasks"
            value={totalTasks.toString()}
            status={totalTasks > 0 ? 'healthy' : 'unknown'}
          />
          <MetricRow
            label="Your Tasks"
            value={operatorTasks.toString()}
            status={operatorTasks > 0 ? 'healthy' : 'unknown'}
          />
          <MetricRow
            label="Active Task"
            value={selectedTask ? selectedTask.name : 'None'}
            status={selectedTask ? 'healthy' : 'unknown'}
          />
        </MetricGroup>
      </OverviewSection>
    </div>
  )
}

interface MetricRowProps {
  label: string
  value: string
  status: MetricStatus
  note?: string
}

function MetricRow({ label, value, status, note }: MetricRowProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span
          className={cn('h-1.5 w-1.5 rounded-full', STATUS_TOKENS[status].dot)}
        />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {note && (
          <span className="text-[10px] text-muted-foreground">{note}</span>
        )}
        <span className={cn('text-sm font-semibold', STATUS_TOKENS[status].text)}>
          {value}
        </span>
      </div>
    </div>
  )
}

interface MetricGroupProps {
  children: React.ReactNode
}

function MetricGroup({ children }: MetricGroupProps) {
  return <div className="divide-y divide-border/70">{children}</div>
}

interface OverviewSectionProps {
  icon: React.ReactNode
  title: string
  eyebrow?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

function OverviewSection({ icon, title, eyebrow, children, footer }: OverviewSectionProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/70 text-muted-foreground">
          {icon}
        </div>
        <div>
          {eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
      </div>
      <div className="border-t border-border/70" />
      <div className="py-1">{children}</div>
      {footer && (
        <>
          <div className="border-t border-border/70" />
          <div className="px-4 py-3">{footer}</div>
        </>
      )}
    </section>
  )
}

interface SystemStatusCardProps {
  healthStatus: HealthStatus
}

function SystemStatusCard({ healthStatus }: SystemStatusCardProps) {
  const tokens = HEALTH_TOKENS[healthStatus]
  const Icon = tokens.icon
  const badgeStatus: MetricStatus =
    healthStatus === 'healthy'
      ? 'healthy'
      : healthStatus === 'warning'
      ? 'warning'
      : healthStatus === 'error'
      ? 'error'
      : 'unknown'

  return (
    <section className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted/70 text-muted-foreground">
            <Icon className={cn('h-5 w-5', tokens.tone)} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              System Status
            </p>
            <p className="text-sm font-semibold text-foreground">{tokens.label}</p>
            <p className="text-xs text-muted-foreground">{tokens.description}</p>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
            STATUS_TOKENS[badgeStatus].badge
          )}
        >
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              STATUS_TOKENS[badgeStatus].dot
            )}
          />
          {tokens.label}
        </span>
      </div>
    </section>
  )
}
