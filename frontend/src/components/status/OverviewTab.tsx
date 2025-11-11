import { Activity, ExternalLink, Radio, Wifi } from 'lucide-react'
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
    label: string
    description: string
  }
> = {
  healthy: {
    label: 'Operational',
    description: 'All systems stable',
  },
  warning: {
    label: 'Degraded',
    description: 'Minor issues detected',
  },
  error: {
    label: 'Critical Fault',
    description: 'Critical issues detected',
  },
  unknown: {
    label: 'Unknown',
    description: 'Awaiting telemetry',
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
    <div className="flex h-full flex-col px-5 py-5">
      <div className="flex flex-col gap-5">
        <SystemStatusSummary healthStatus={healthStatus} />

        <OverviewSection
          icon={<Activity className="h-4 w-4" />}
          eyebrow="Telemetry"
          title="Performance"
          action={
            <Button
              onClick={handleOpenGrafana}
              variant="secondary"
              size="sm"
              className="gap-2"
            >
              <ExternalLink size={14} />
              Open Grafana
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

        <OverviewSection
          icon={<Wifi className="h-4 w-4" />}
          eyebrow="Connectivity"
          title="Network"
        >
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
            <p className="text-[11px] font-medium text-status-error">
              {streamError}
            </p>
          )}
        </OverviewSection>

        <OverviewSection
          icon={<Radio className="h-4 w-4" />}
          eyebrow="Operations"
          title="Tasks"
        >
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
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <div className="flex items-center gap-2">
        <span
          className={cn('h-1.5 w-1.5 rounded-full', STATUS_TOKENS[status].dot)}
        />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/90">
          {label}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1 text-right">
        <span className={cn('text-sm font-semibold leading-5', STATUS_TOKENS[status].text)}>
          {value}
        </span>
        {note && (
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
            {note}
          </span>
        )}
      </div>
    </div>
  )
}

interface MetricGroupProps {
  children: React.ReactNode
}

function MetricGroup({ children }: MetricGroupProps) {
  return <div className="space-y-2.5">{children}</div>
}

interface OverviewSectionProps {
  icon: React.ReactNode
  title: string
  eyebrow?: string
  children: React.ReactNode
  action?: React.ReactNode
}

function OverviewSection({ icon, title, eyebrow, children, action }: OverviewSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-muted/70 text-muted-foreground/90">
            {icon}
          </div>
          <div>
            {eyebrow && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/90">
                {eyebrow}
              </p>
            )}
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

interface SystemStatusSummaryProps {
  healthStatus: HealthStatus
}

function SystemStatusSummary({ healthStatus }: SystemStatusSummaryProps) {
  const tokens = HEALTH_TOKENS[healthStatus]
  const badgeStatus: MetricStatus =
    healthStatus === 'healthy'
      ? 'healthy'
      : healthStatus === 'warning'
      ? 'warning'
      : healthStatus === 'error'
      ? 'error'
      : 'unknown'

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/90">
            System Status
          </p>
          <p className="text-sm font-semibold text-foreground">{tokens.description}</p>
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
