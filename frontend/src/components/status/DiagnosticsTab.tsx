import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Maximize2,
  Minimize2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { BistNode, BistResult, BistStatus } from "../../types/diagnostics";
import { Button } from "../common/Button";
import { TreeView } from "../common/TreeView";

export interface DiagnosticsTabProps {
  bistResult: BistResult | null;
}

/**
 * Diagnostics tab showing BIST (Built-In Self Test) results in a tree view.
 */
export function DiagnosticsTab({ bistResult }: DiagnosticsTabProps) {
  const [expandAll, setExpandAll] = useState<boolean | null>(null); // null = auto, true = expand all, false = collapse all

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
    );
  }

  const { summary, tree } = bistResult;

  return (
    <div className="p-4">
      <div className="rounded-lg border border-slate-300 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/50">
        {/* Summary Header */}
        <div className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
            Diagnostics Summary
          </h3>
          <div className="flex flex-wrap items-center gap-6 text-xs">
            {summary.fail > 0 && (
              <div className="flex items-center gap-1.5">
                <XCircle size={14} className="text-status-error" />
                <span className="font-semibold text-status-error dark:text-status-error">
                  {summary.fail}
                </span>
                <span className="font-semibold text-status-error dark:text-status-error ml-0.5">
                  FAIL
                </span>
              </div>
            )}
            {summary.warn > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-status-warning" />
                <span className="font-semibold text-status-warning dark:text-status-warning">
                  {summary.warn}
                </span>
                <span className="font-semibold text-status-warning dark:text-status-warning ml-0.5">
                  WARN
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-status-success" />
              <span className="font-semibold text-status-success dark:text-status-success">
                {summary.ok}
              </span>
              <span className="font-semibold text-status-success dark:text-status-success ml-0.5">
                OK
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-300 dark:border-white/10" />

        {/* Expand/Collapse Controls */}
        <div className="flex items-center justify-center gap-3 border-b border-slate-300 px-4 py-3 dark:border-white/10">
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

        {/* BIST Tree */}
        <div className="p-3">
          <TreeView<BistNode>
            key={
              expandAll === null ? "auto" : expandAll ? "expanded" : "collapsed"
            }
            data={tree}
            renderNode={(node) => <BistNodeContent node={node} />}
            defaultExpanded={expandAll === true}
            autoExpandCondition={
              expandAll === null
                ? (node) =>
                    node.status === BistStatus.FAIL ||
                    node.status === BistStatus.WARN
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}

interface BistNodeContentProps {
  node: BistNode;
}

function BistNodeContent({ node }: BistNodeContentProps) {
  const [showDetails, setShowDetails] = useState(false);
  const hasDetails = !!(node.details || node.metrics);
  const hasChildren = node.children && node.children.length > 0;

  // Background tint based on status - subtle highlight
  const getBgTint = () => {
    switch (node.status) {
      case BistStatus.FAIL:
        return "bg-status-error/8 dark:bg-status-error/8";
      case BistStatus.WARN:
        return "bg-status-warning/8 dark:bg-status-warning/8";
      default:
        return "";
    }
  };

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
            <div className="rounded-md bg-white/80 p-2 font-mono text-[10px] text-slate-700 border border-slate-200/60 dark:bg-slate-800/70 dark:text-slate-300 dark:border-white/10">
              {node.metrics.expected && (
                <div>
                  Expected: {node.metrics.expected} {node.metrics.unit || ""}
                </div>
              )}
              {node.metrics.actual && (
                <div>
                  Actual: {node.metrics.actual} {node.metrics.unit || ""}
                </div>
              )}
              {node.metrics.threshold && (
                <div>
                  Threshold: {node.metrics.threshold} {node.metrics.unit || ""}
                </div>
              )}
            </div>
          )}

          {/* View Full Detail Toggle */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-[10px] font-medium text-status-success transition hover:text-status-success dark:text-status-success dark:hover:text-status-success"
          >
            <ChevronRight
              size={10}
              className={`transition ${showDetails ? "rotate-90" : ""}`}
            />
            {showDetails ? "Hide" : "View"} full detail
          </button>

          {showDetails && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150 rounded-md border border-slate-200 bg-white p-2 text-[10px] text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
              <p className="font-semibold">
                Additional diagnostic information:
              </p>
              <p className="mt-1">Timestamp: {new Date().toISOString()}</p>
              <p>Node ID: {node.id}</p>
              <p>Status: {node.status}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: BistStatus }) {
  switch (status) {
    case BistStatus.OK:
      return <CheckCircle2 size={14} className="text-status-success" />;
    case BistStatus.WARN:
      return <AlertTriangle size={14} className="text-status-warning" />;
    case BistStatus.FAIL:
      return <XCircle size={14} className="text-status-error" />;
    case BistStatus.UNKNOWN:
    default:
      return <HelpCircle size={14} className="text-slate-400" />;
  }
}

function getStatusBadge(status: BistStatus) {
  switch (status) {
    case BistStatus.OK:
      return (
        <span className="text-status-success dark:text-status-success">[OK]</span>
      );
    case BistStatus.WARN:
      return <span className="text-status-warning dark:text-status-warning">[WARN]</span>;
    case BistStatus.FAIL:
      return <span className="text-status-error dark:text-status-error">[FAIL]</span>;
    case BistStatus.UNKNOWN:
    default:
      return <span className="text-slate-500 dark:text-slate-400">[?]</span>;
  }
}
