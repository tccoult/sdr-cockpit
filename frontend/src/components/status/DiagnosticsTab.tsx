import { Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  BistResult,
  BistStatus,
  BistSummary,
  BistTest,
  BistTreeNode,
} from '../../types/diagnostics'
import { Button } from '../common/Button'
import { TreeNodeData, TreeView } from '../common/TreeView'

export interface DiagnosticsTabProps {
  bistResult: BistResult | null
}

type PanelView = 'tests' | 'function' | 'hardware'

interface HighlightState {
  function: string[]
  hardware: string[]
}

interface RollupDisplayNode extends TreeNodeData {
  kind: 'group' | 'test'
  name: string
  status: BistStatus
  description?: string
  tests?: string[]
  testId?: string
  lastRun?: number
  durationMs?: number
}

const STATUS_PRIORITY: Record<BistStatus, number> = {
  [BistStatus.FAIL]: 3,
  [BistStatus.WARN]: 2,
  [BistStatus.OK]: 1,
  [BistStatus.UNKNOWN]: 0,
}

const STATUS_TOKENS: Record<
  BistStatus,
  { dot: string; text: string; badge: string; tint: string }
> = {
  [BistStatus.FAIL]: {
    dot: 'bg-status-error',
    text: 'text-status-error',
    badge: 'text-status-error',
    tint: 'bg-status-error/10',
  },
  [BistStatus.WARN]: {
    dot: 'bg-status-warning',
    text: 'text-status-warning',
    badge: 'text-status-warning',
    tint: 'bg-status-warning/10',
  },
  [BistStatus.OK]: {
    dot: 'bg-status-success',
    text: 'text-status-success',
    badge: 'text-status-success',
    tint: 'bg-status-success/10',
  },
  [BistStatus.UNKNOWN]: {
    dot: 'bg-muted-foreground/50',
    text: 'text-muted-foreground',
    badge: 'text-muted-foreground',
    tint: 'bg-muted/40',
  },
}

export function DiagnosticsTab({ bistResult }: DiagnosticsTabProps) {
  const [view, setView] = useState<PanelView>('tests')
  const [expandState, setExpandState] = useState<'auto' | 'all' | 'none'>('auto')
  const [activeTestId, setActiveTestId] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState<HighlightState>({
    function: [],
    hardware: [],
  })

  useEffect(() => {
    setView('tests')
    setActiveTestId(null)
    setHighlighted({ function: [], hardware: [] })
    setExpandState('auto')
  }, [bistResult?.timestamp])

  const testsById = useMemo(() => {
    if (!bistResult) return new Map<string, BistTest>()
    return new Map(bistResult.tests.map((test) => [test.id, test]))
  }, [bistResult])

  const functionLookup = useMemo(() => {
    if (!bistResult) return {}
    return buildNodeLookup(bistResult.functionTree)
  }, [bistResult])

  const hardwareLookup = useMemo(() => {
    if (!bistResult) return {}
    return buildNodeLookup(bistResult.hardwareTree)
  }, [bistResult])

  const functionTree = useMemo(() => {
    if (!bistResult) return null
    return createDisplayTree(bistResult.functionTree, testsById)
  }, [bistResult, testsById])

  const hardwareTree = useMemo(() => {
    if (!bistResult) return null
    return createDisplayTree(bistResult.hardwareTree, testsById)
  }, [bistResult, testsById])

  const handleSelectTest = (testId: string, focusTestsView = false) => {
    const test = testsById.get(testId)
    if (!test) return

    setActiveTestId(testId)
    setHighlighted({
      function: Array.from(new Set(test.functionNodes)),
      hardware: Array.from(new Set(test.hardwareNodes)),
    })

    if (focusTestsView) {
      setView('tests')
    }
  }

  const toggleNodeHighlight = (scope: keyof HighlightState, nodeId: string) => {
    setHighlighted((prev) => {
      const current = new Set(prev[scope])
      if (current.has(nodeId)) {
        current.delete(nodeId)
      } else {
        current.add(nodeId)
      }
      return {
        ...prev,
        [scope]: Array.from(current),
      }
    })
  }

  const sortedTests = useMemo(() => {
    if (!bistResult) return []
    return [...bistResult.tests].sort((a, b) => {
      const diff = STATUS_PRIORITY[b.status] - STATUS_PRIORITY[a.status]
      if (diff !== 0) return diff
      return a.name.localeCompare(b.name)
    })
  }, [bistResult])

  if (!bistResult) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-sm rounded-lg border border-border/60 bg-card p-6 text-center shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">No diagnostics available</h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Run system diagnostics to view Built-In Test results.
          </p>
        </div>
      </div>
    )
  }

  const currentTree = view === 'function' ? functionTree : hardwareTree
  const highlightedNodes = view === 'function' ? highlighted.function : highlighted.hardware

  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
        <div className="px-4 pt-4">
          <h3 className="text-sm font-semibold text-foreground">Built-In Test</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Last updated {formatRelativeTimestamp(bistResult.timestamp)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-2">
          <div className="inline-flex rounded-md border border-border/80 bg-muted/60 p-0.5 shadow-sm">
            {(['tests', 'function', 'hardware'] as PanelView[]).map((mode, index) => (
              <Button
                key={mode}
                variant={view === mode ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setView(mode)}
                className={cn(
                  'px-3 text-xs font-medium transition',
                  'rounded-none first:rounded-l-md last:rounded-r-md',
                  index > 0 && '-ml-px'
                )}
              >
                {mode === 'tests' ? 'Tests' : mode === 'function' ? 'Function' : 'Hardware'}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={view === 'tests'}
              onClick={() => setExpandState('all')}
              title="Expand all nodes"
              className="h-8 w-8 p-0"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={view === 'tests'}
              onClick={() => setExpandState('none')}
              title="Collapse all nodes"
              className="h-8 w-8 p-0"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="border-t border-border/70" />
        <div className="flex-1 overflow-hidden">
          {view === 'tests' && (
            <TestsView
              tests={sortedTests}
              summary={bistResult.summary}
              activeTestId={activeTestId}
              functionLookup={functionLookup}
              hardwareLookup={hardwareLookup}
              highlighted={highlighted}
              onSelectTest={(testId) => handleSelectTest(testId)}
              onToggleNodeHighlight={toggleNodeHighlight}
            />
          )}
          {view !== 'tests' && currentTree && (
            <RollupTreeView
              tree={currentTree}
              summary={bistResult.summary}
              expandState={expandState}
              highlightedNodeIds={highlightedNodes}
              activeTestId={activeTestId}
              testsById={testsById}
              onFocusTest={(testId) => handleSelectTest(testId, true)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

interface TestsViewProps {
  tests: BistTest[]
  summary: BistSummary
  activeTestId: string | null
  functionLookup: Record<string, BistTreeNode>
  hardwareLookup: Record<string, BistTreeNode>
  highlighted: HighlightState
  onSelectTest: (testId: string) => void
  onToggleNodeHighlight: (scope: keyof HighlightState, nodeId: string) => void
}

function TestsView({
  tests,
  summary,
  activeTestId,
  functionLookup,
  hardwareLookup,
  highlighted,
  onSelectTest,
  onToggleNodeHighlight,
}: TestsViewProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="px-4 pb-3 pt-4">
        <SummaryBanner summary={summary} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-3">
          {tests.map((test) => {
            const isActive = test.id === activeTestId
            return (
              <button
                key={test.id}
                type="button"
                onClick={() => onSelectTest(test.id)}
                title={test.description}
                className={cn(
                  'w-full rounded-md border border-transparent bg-card/60 p-3 text-left transition',
                  'hover:border-border hover:bg-muted/70',
                  isActive && 'border-accent/40 bg-accent/10 ring-1 ring-accent/50'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-2.5 w-2.5 flex-shrink-0 rounded-full',
                        STATUS_TOKENS[test.status].dot
                      )}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {test.name}
                    </span>
                  </div>
                  <StatusBadge status={test.status} />
                </div>
                {test.description && (
                  <p className="mt-1 text-xs text-muted-foreground">{test.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  {typeof test.lastRun === 'number' && (
                    <span>Last run {formatRelativeTimestamp(test.lastRun)}</span>
                  )}
                  {typeof test.durationMs === 'number' && (
                    <span>Duration {(test.durationMs / 1000).toFixed(1)}s</span>
                  )}
                </div>
                <TagGroup
                  label="Function"
                  scope="function"
                  nodeIds={test.functionNodes}
                  lookup={functionLookup}
                  highlighted={highlighted.function}
                  onToggle={onToggleNodeHighlight}
                />
                <TagGroup
                  label="Hardware"
                  scope="hardware"
                  nodeIds={test.hardwareNodes}
                  lookup={hardwareLookup}
                  highlighted={highlighted.hardware}
                  onToggle={onToggleNodeHighlight}
                />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface RollupTreeViewProps {
  tree: RollupDisplayNode
  summary: BistSummary
  expandState: 'auto' | 'all' | 'none'
  highlightedNodeIds: string[]
  activeTestId: string | null
  testsById: Map<string, BistTest>
  onFocusTest: (testId: string) => void
}

function RollupTreeView({
  tree,
  summary,
  expandState,
  highlightedNodeIds,
  activeTestId,
  testsById,
  onFocusTest,
}: RollupTreeViewProps) {
  const autoExpandCondition = useMemo(() => {
    if (expandState !== 'auto') return undefined
    return (node: RollupDisplayNode) =>
      node.kind === 'group' &&
      (node.status === BistStatus.FAIL || node.status === BistStatus.WARN)
  }, [expandState])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="px-4 pb-3 pt-4">
        <SummaryBanner summary={summary} />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <TreeView<RollupDisplayNode>
          key={`${tree.id}-${expandState}`}
          data={tree}
          defaultExpanded={expandState === 'all'}
          autoExpandCondition={autoExpandCondition}
          renderNode={(node) => (
            <RollupTreeNode
              node={node}
              highlightedNodeIds={highlightedNodeIds}
              activeTestId={activeTestId}
              testsById={testsById}
              onFocusTest={onFocusTest}
            />
          )}
        />
      </div>
    </div>
  )
}

interface RollupTreeNodeProps {
  node: RollupDisplayNode
  highlightedNodeIds: string[]
  activeTestId: string | null
  testsById: Map<string, BistTest>
  onFocusTest: (testId: string) => void
}

function RollupTreeNode({
  node,
  highlightedNodeIds,
  activeTestId,
  testsById,
  onFocusTest,
}: RollupTreeNodeProps) {
  if (node.kind === 'test' && node.testId) {
    const test = testsById.get(node.testId)
    const isActive = activeTestId === node.testId
    return (
      <button
        type="button"
        onClick={() => onFocusTest(node.testId!)}
        title={test?.description}
        className={cn(
          'w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-left text-xs transition',
          'hover:border-border hover:bg-muted/70',
          isActive && 'border-accent/40 bg-accent/10 ring-1 ring-accent/50'
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'h-2 w-2 flex-shrink-0 rounded-full',
                STATUS_TOKENS[node.status].dot
              )}
            />
            <span className="truncate text-xs font-medium text-foreground">
              {node.name}
            </span>
          </div>
          <StatusBadge status={node.status} />
        </div>
      </button>
    )
  }

  const isHighlighted = highlightedNodeIds.includes(node.id)
  const containsActiveTest = node.tests?.includes(activeTestId ?? '')

  return (
    <div
      className={cn(
        'rounded-md px-2 py-1.5 text-xs transition',
        isHighlighted && 'border border-accent/40 bg-accent/10',
        !isHighlighted && containsActiveTest && 'bg-accent/10'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-2.5 w-2.5 flex-shrink-0 rounded-full',
              STATUS_TOKENS[node.status].dot
            )}
          />
          <span className="text-xs font-medium text-foreground">{node.name}</span>
        </div>
        <StatusBadge status={node.status} />
      </div>
    </div>
  )
}

interface TagGroupProps {
  label: string
  scope: keyof HighlightState
  nodeIds: string[]
  lookup: Record<string, BistTreeNode>
  highlighted: string[]
  onToggle: (scope: keyof HighlightState, nodeId: string) => void
}

function TagGroup({
  label,
  scope,
  nodeIds,
  lookup,
  highlighted,
  onToggle,
}: TagGroupProps) {
  if (!nodeIds.length) return null

  return (
    <div className="mt-3">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}:
      </span>
      <div className="mt-1 flex flex-wrap gap-1">
        {nodeIds.map((nodeId) => {
          const node = lookup[nodeId]
          const isHighlighted = highlighted.includes(nodeId)
          return (
            <button
              type="button"
              key={`${scope}-${nodeId}`}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border border-transparent bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition',
                'hover:border-border hover:bg-muted/80 hover:text-foreground',
                isHighlighted && 'border-accent/40 bg-accent/10 text-foreground'
              )}
              onClick={(event) => {
                event.stopPropagation()
                onToggle(scope, nodeId)
              }}
              title={node ? `${label} node: ${node.name}` : nodeId}
            >
              {node ? node.name : nodeId}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SummaryBanner({ summary }: { summary: BistSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <SummaryChip label="Fail" value={summary.fail} status={BistStatus.FAIL} />
      <SummaryChip label="Warn" value={summary.warn} status={BistStatus.WARN} />
      <SummaryChip label="Ok" value={summary.ok} status={BistStatus.OK} />
      <span className="text-[11px] text-muted-foreground">Total tests: {summary.total}</span>
    </div>
  )
}

function SummaryChip({
  label,
  value,
  status,
}: {
  label: string
  value: number
  status: BistStatus
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide',
        STATUS_TOKENS[status].tint,
        STATUS_TOKENS[status].badge
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: BistStatus }) {
  return (
    <span
      className={cn(
        'text-[10px] font-semibold uppercase tracking-wide',
        STATUS_TOKENS[status].badge
      )}
    >
      {statusLabel(status)}
    </span>
  )
}

function statusLabel(status: BistStatus) {
  switch (status) {
    case BistStatus.FAIL:
      return 'Fail'
    case BistStatus.WARN:
      return 'Warn'
    case BistStatus.OK:
      return 'Ok'
    default:
      return 'Unknown'
  }
}

function buildNodeLookup(tree: BistTreeNode): Record<string, BistTreeNode> {
  const map: Record<string, BistTreeNode> = {}

  const traverse = (node: BistTreeNode) => {
    map[node.id] = node
    node.children?.forEach(traverse)
  }

  traverse(tree)
  return map
}

function createDisplayTree(
  node: BistTreeNode,
  testsById: Map<string, BistTest>
): RollupDisplayNode {
  const children: RollupDisplayNode[] = []

  node.children?.forEach((child) => {
    children.push(createDisplayTree(child, testsById))
  })

  node.tests?.forEach((testId) => {
    const test = testsById.get(testId)
    if (!test) return
    children.push({
      id: `${node.id}::${test.id}`,
      kind: 'test',
      name: test.name,
      status: test.status,
      description: test.description,
      testId: test.id,
      lastRun: test.lastRun,
      durationMs: test.durationMs,
    })
  })

  return {
    id: node.id,
    kind: 'group',
    name: node.name,
    status: node.status,
    description: node.description,
    tests: node.tests,
    children: children.length > 0 ? children : undefined,
  }
}

function formatRelativeTimestamp(timestamp: number) {
  const diffMs = Date.now() - timestamp
  const diffSeconds = Math.floor(diffMs / 1000)
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`
  }
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) {
    return `${diffDays}d ago`
  }
  return new Date(timestamp).toLocaleDateString()
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}
