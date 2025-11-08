import { Activity, AlertTriangle, Wifi, Radio, CheckCircle2, ExternalLink } from 'lucide-react'
import { Task } from '../../types/sdr'
import { HealthStatus } from '../layout/CompactHeader'
import { DataStreamStatus } from '../../api'
import { Button } from '../common/Button'

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
    <div className="flex flex-col gap-4 p-4">
      {/* Overall Status */}
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          {healthStatus === 'healthy' ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          ) : healthStatus === 'warning' ? (
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          ) : healthStatus === 'error' ? (
            <AlertTriangle className="h-6 w-6 text-red-500" />
          ) : (
            <Activity className="h-6 w-6 text-slate-500" />
          )}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              System Status
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
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

      {/* Performance */}
      <section>
        <SectionHeader icon={<Activity size={16} />} title="Performance" />
        <div className="space-y-2">
          <MetricRow label="Data Rate" value={`${dataFps} FPS`} status="healthy" />
          <MetricRow
            label="Render Rate"
            value={renderFps > 0 ? `${renderFps.toFixed(1)} FPS` : '—'}
            status={renderFps > 0 && renderFps < 30 ? 'warning' : 'healthy'}
          />
          <MetricRow label="Latency" value="—" status="unknown" note="Not implemented" />
        </div>
      </section>

      {/* Network */}
      <section>
        <SectionHeader icon={<Wifi size={16} />} title="Network" />
        <div className="space-y-2">
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
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300">
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
        <div className="space-y-2">
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
          variant="secondary"
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
  icon: React.ReactNode
  title: string
}

function SectionHeader({ icon, title }: SectionHeaderProps) {
  return (
    <div className="mb-2 flex items-center gap-2 text-slate-900 dark:text-white">
      {icon}
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  )
}

interface MetricRowProps {
  label: string
  value: string
  status: 'healthy' | 'warning' | 'error' | 'unknown'
  note?: string
}

function MetricRow({ label, value, status, note }: MetricRowProps) {
  const statusColor = {
    healthy: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    error: 'text-red-600 dark:text-red-400',
    unknown: 'text-slate-500 dark:text-slate-400',
  }[status]

  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-900/50">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        {note && (
          <span className="text-[10px] italic text-slate-400 dark:text-slate-600">{note}</span>
        )}
        <span className={`text-xs font-semibold ${statusColor}`}>{value}</span>
      </div>
    </div>
  )
}
