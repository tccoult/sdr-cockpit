import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ChevronRight, Maximize2, Minimize2 } from 'lucide-react'
import { BistResult, BistNode, BistStatus } from '../../types/diagnostics'
import { TreeView } from '../common/TreeView'
import { useState } from 'react'
import { Button } from '../common/Button'

export interface DiagnosticsTabProps {
  bistResult: BistResult | null
}

/**
 * Diagnostics tab showing BIST (Built-In Self Test) results in a tree view.
 */
export function DiagnosticsTab({ bistResult }: DiagnosticsTabProps) {
  const [expandAll, setExpandAll] = useState<boolean | null>(null) // null = auto, true = expand all, false = collapse all

  if (!bistResult) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <HelpCircle size={48} className="text-slate-400 dark:text-slate-600" />
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            No diagnostics available
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Run system diagnostics to view results
          </p>
        </div>
      </div>
    )
  }

  const { summary, tree } = bistResult

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Summary Header */}
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-800/50">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Diagnostics Summary
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {summary.fail > 0 && (
            <div className="flex items-center gap-1.5">
              <XCircle size={14} className="text-red-500" />
              <span className="font-semibold text-red-600 dark:text-red-400">
                {summary.fail} FAIL
              </span>
            </div>
          )}
          {summary.warn > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-500" />
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {summary.warn} WARN
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {summary.ok} OK
            </span>
          </div>
          <span className="ml-auto text-slate-500 dark:text-slate-400">
            Total: {summary.total}
          </span>
        </div>
      </section>

      {/* BIST Tree */}
      <section>
        {/* Expand/Collapse Controls */}
        <div className="mb-2 flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="subtle"
            onClick={() => setExpandAll(true)}
            className="flex items-center gap-1.5"
          >
            <Maximize2 size={12} />
            Expand All
          </Button>
          <Button
            size="sm"
            variant="subtle"
            onClick={() => setExpandAll(false)}
            className="flex items-center gap-1.5"
          >
            <Minimize2 size={12} />
            Collapse All
          </Button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900/50">
          <TreeView<BistNode>
            key={expandAll === null ? 'auto' : expandAll ? 'expanded' : 'collapsed'}
            data={tree}
            renderNode={(node) => (
              <BistNodeContent node={node} />
            )}
            defaultExpanded={expandAll === true}
            autoExpandCondition={
              expandAll === null
                ? (node) => node.status === BistStatus.FAIL || node.status === BistStatus.WARN
                : undefined
            }
          />
        </div>
      </section>
    </div>
  )
}

interface BistNodeContentProps {
  node: BistNode
}

function BistNodeContent({ node }: BistNodeContentProps) {
  const [showDetails, setShowDetails] = useState(false)
  const hasDetails = !!(node.details || node.metrics)
  const hasChildren = node.children && node.children.length > 0

  // Background tint based on status
  const getBgTint = () => {
    switch (node.status) {
      case BistStatus.FAIL:
        return 'bg-red-50/50 dark:bg-red-950/20'
      case BistStatus.WARN:
        return 'bg-amber-50/50 dark:bg-amber-950/20'
      default:
        return ''
    }
  }

  return (
    <div
      className={`flex-1 space-y-2 -mx-2 px-2 py-1 rounded transition-colors duration-150 ease-in-out ${getBgTint()}`}
    >
      {/* Node Label and Status */}
      <div className="flex items-center gap-2">
        <StatusIcon status={node.status} />
        <span className="text-xs font-medium text-slate-900 dark:text-white">
          {node.name}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide">
          {getStatusBadge(node.status)}
        </span>
      </div>

      {/* Details (for leaf nodes with errors/warnings) */}
      {hasDetails && !hasChildren && (
        <div className="ml-5 space-y-1">
          {node.details && (
            <p className="text-xs text-slate-700 dark:text-slate-300">
              {node.details}
            </p>
          )}

          {node.metrics && (
            <div className="rounded-md bg-slate-50 p-2 font-mono text-[10px] text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
              {node.metrics.expected && (
                <div>Expected: {node.metrics.expected} {node.metrics.unit || ''}</div>
              )}
              {node.metrics.actual && (
                <div>Actual: {node.metrics.actual} {node.metrics.unit || ''}</div>
              )}
              {node.metrics.threshold && (
                <div>Threshold: {node.metrics.threshold} {node.metrics.unit || ''}</div>
              )}
            </div>
          )}

          {/* View Full Detail Toggle */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 transition hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            <ChevronRight size={10} className={`transition ${showDetails ? 'rotate-90' : ''}`} />
            {showDetails ? 'Hide' : 'View'} full detail
          </button>

          {showDetails && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150 rounded-md border border-slate-200 bg-white p-2 text-[10px] text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
              <p className="font-semibold">Additional diagnostic information:</p>
              <p className="mt-1">Timestamp: {new Date().toISOString()}</p>
              <p>Node ID: {node.id}</p>
              <p>Status: {node.status}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: BistStatus }) {
  switch (status) {
    case BistStatus.OK:
      return <CheckCircle2 size={14} className="text-emerald-500" />
    case BistStatus.WARN:
      return <AlertTriangle size={14} className="text-amber-500" />
    case BistStatus.FAIL:
      return <XCircle size={14} className="text-red-500" />
    case BistStatus.UNKNOWN:
    default:
      return <HelpCircle size={14} className="text-slate-400" />
  }
}

function getStatusBadge(status: BistStatus) {
  switch (status) {
    case BistStatus.OK:
      return <span className="text-emerald-600 dark:text-emerald-400">[OK]</span>
    case BistStatus.WARN:
      return <span className="text-amber-600 dark:text-amber-400">[WARN]</span>
    case BistStatus.FAIL:
      return <span className="text-red-600 dark:text-red-400">[FAIL]</span>
    case BistStatus.UNKNOWN:
    default:
      return <span className="text-slate-500 dark:text-slate-400">[?]</span>
  }
}
