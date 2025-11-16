import { MoreVertical } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  BitResult,
  BitStatus,
  BitSummary,
  BitTest,
  BitTreeNode,
} from "../../api/health";
import { Button } from "../common/Button";
import { TreeNodeData, TreeView } from "../common/TreeView";

export interface SystemHealthPanelProps {
  bitResult: BitResult | null;
}

type PanelView = "tests" | "function" | "hardware";

interface HighlightState {
  function: string[];
  hardware: string[];
}

interface RollupDisplayNode extends TreeNodeData {
  kind: "group" | "test";
  name: string;
  status: BitStatus;
  description?: string;
  tests?: string[];
  testId?: string;
  lastRun?: number;
  durationMs?: number;
}

const STATUS_PRIORITY: Record<BitStatus, number> = {
  'fail': 3,
  'warn': 2,
  'ok': 1,
  'unknown': 0,
};

const STATUS_TOKENS: Record<
  BitStatus,
  { dot: string; text: string; badge: string; tint: string }
> = {
  'fail': {
    dot: "bg-status-error",
    text: "text-status-error",
    badge: "text-status-error",
    tint: "bg-status-error/10",
  },
  'warn': {
    dot: "bg-status-warning",
    text: "text-status-warning",
    badge: "text-status-warning",
    tint: "bg-status-warning/10",
  },
  'ok': {
    dot: "bg-status-success",
    text: "text-status-success",
    badge: "text-status-success",
    tint: "bg-status-success/10",
  },
  'unknown': {
    dot: "bg-muted-foreground/50",
    text: "text-muted-foreground",
    badge: "text-muted-foreground",
    tint: "bg-muted/40",
  },
};

export function SystemHealthPanel({ bitResult }: SystemHealthPanelProps) {
  const [view, setView] = useState<PanelView>("tests");
  const [expandState, setExpandState] = useState<"auto" | "all" | "none">(
    "auto"
  );
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<HighlightState>({
    function: [],
    hardware: [],
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [forcedExpand, setForcedExpand] = useState<{
    scope: keyof HighlightState;
    ids: string[];
  } | null>(null);
  const [focusRequest, setFocusRequest] = useState<{
    scope: keyof HighlightState;
    nodeId: string;
  } | null>(null);
  const [testFocusRequest, setTestFocusRequest] = useState<{
    testId: string;
    token: number;
  } | null>(null);

  useEffect(() => {
    setActiveTestId(null);
    setHighlighted({ function: [], hardware: [] });
    setForcedExpand(null);
    setFocusRequest(null);
    setTestFocusRequest(null);
  }, [bitResult?.timestamp]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const testsById = useMemo(() => {
    if (!bitResult) return new Map<string, BitTest>();
    return new Map(bitResult.tests.map((test) => [test.id, test]));
  }, [bitResult]);

  const functionLookup = useMemo(() => {
    if (!bitResult) return {};
    return buildNodeLookup(bitResult.functionTree);
  }, [bitResult]);

  const hardwareLookup = useMemo(() => {
    if (!bitResult) return {};
    return buildNodeLookup(bitResult.hardwareTree);
  }, [bitResult]);

  const functionTree = useMemo(() => {
    if (!bitResult) return null;
    return createDisplayTree(bitResult.functionTree, testsById);
  }, [bitResult, testsById]);

  const hardwareTree = useMemo(() => {
    if (!bitResult) return null;
    return createDisplayTree(bitResult.hardwareTree, testsById);
  }, [bitResult, testsById]);

  const consumeTestFocusRequest = useCallback(
    () => setTestFocusRequest(null),
    []
  );

  const handleSelectTest = (testId: string, focusTestsView = false) => {
    const test = testsById.get(testId);
    if (!test) return;

    const directFunctionNodes = bitResult
      ? getTerminalNodeIds(test.functionNodes || [], bitResult.functionTree)
      : [];
    const directHardwareNodes = bitResult
      ? getTerminalNodeIds(test.hardwareNodes || [], bitResult.hardwareTree)
      : [];

    const functionHighlight = bitResult
      ? directFunctionNodes.flatMap(
          (nodeId) => findNodePath(bitResult.functionTree, nodeId) ?? [nodeId]
        )
      : directFunctionNodes;
    const hardwareHighlight = bitResult
      ? directHardwareNodes.flatMap(
          (nodeId) => findNodePath(bitResult.hardwareTree, nodeId) ?? [nodeId]
        )
      : directHardwareNodes;

    setActiveTestId(testId);
    setHighlighted({
      function: Array.from(new Set(functionHighlight)),
      hardware: Array.from(new Set(hardwareHighlight)),
    });

    if (focusTestsView) {
      setView("tests");
      setTestFocusRequest({ testId, token: Date.now() });
    }
  };

  const handleFocusNode = (scope: keyof HighlightState, nodeId: string) => {
    if (!bitResult) return;

    const tree =
      scope === "function" ? bitResult.functionTree : bitResult.hardwareTree;
    const path = findNodePath(tree, nodeId) ?? [nodeId];

    setHighlighted((prev) => {
      const current = new Set(prev[scope]);
      path.forEach((id) => current.add(id));
      return {
        ...prev,
        [scope]: Array.from(current),
      };
    });

    const nextView = scope === "function" ? "function" : "hardware";
    setView(nextView);
    setExpandState("auto");

    if (path) {
      setForcedExpand({ scope, ids: path });
      setFocusRequest({ scope, nodeId });
    }
  };

  const sortedTests = useMemo(() => {
    if (!bitResult) return [];
    return [...bitResult.tests].sort((a, b) => {
      const diff = STATUS_PRIORITY[b.status] - STATUS_PRIORITY[a.status];
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  }, [bitResult]);

  if (!bitResult) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-sm rounded-lg border border-border/60 bg-card p-6 text-center shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">
            No health data available
          </h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Run system health tests to view Built-In Test results.
          </p>
        </div>
      </div>
    );
  }

  const currentTree = view === "function" ? functionTree : hardwareTree;
  const highlightedNodes =
    view === "function" ? highlighted.function : highlighted.hardware;

  return (
    <div className="flex h-full flex-col p-3">
      <div className="flex h-full flex-col overflow-hidden rounded-sm border border-border/70 bg-card shadow-lg shadow-black/15">
        <div className="px-4 pt-4">
          <h3 className="text-sm font-semibold text-foreground">
            Built-In Test
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Last updated {formatRelativeTimestamp(bitResult.timestamp)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-2">
          <div className="inline-flex rounded-md border border-border/80 bg-muted/60 p-0.5 shadow-sm">
            {(["tests", "function", "hardware"] as PanelView[]).map(
              (mode, index) => (
                <Button
                  key={mode}
                  variant={view === mode ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setView(mode)}
                  className={cn(
                    "px-3 text-xs font-medium transition",
                    "rounded-none first:rounded-l-md last:rounded-r-md",
                    index > 0 && "-ml-px"
                  )}
                >
                  {mode === "tests"
                    ? "Tests"
                    : mode === "function"
                    ? "Function"
                    : "Hardware"}
                </Button>
              )
            )}
          </div>
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-10 p-0"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <MoreVertical className="h-5 w-5" />
              <span className="sr-only">Built-In Test actions</span>
            </Button>
            {menuOpen && (
              <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-md border border-border/70 bg-card shadow-lg">
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground transition",
                    view === "tests"
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-muted/70 hover:text-foreground"
                  )}
                  onClick={() => {
                    if (view === "tests") return;
                    setExpandState("all");
                    setForcedExpand(null);
                    setFocusRequest(null);
                    setMenuOpen(false);
                  }}
                  aria-disabled={view === "tests"}
                >
                  Expand all
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    ⇲
                  </span>
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground transition",
                    view === "tests"
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-muted/70 hover:text-foreground"
                  )}
                  onClick={() => {
                    if (view === "tests") return;
                    setExpandState("none");
                    setForcedExpand(null);
                    setFocusRequest(null);
                    setMenuOpen(false);
                  }}
                  aria-disabled={view === "tests"}
                >
                  Collapse all
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    ⇱
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-border/70" />
        <div className="flex-1 overflow-hidden">
          {view === "tests" && (
            <TestsView
              tests={sortedTests}
              summary={bitResult.summary}
              activeTestId={activeTestId}
              functionLookup={functionLookup}
              hardwareLookup={hardwareLookup}
              functionTree={bitResult.functionTree}
              hardwareTree={bitResult.hardwareTree}
              highlighted={highlighted}
              onSelectTest={handleSelectTest}
              onFocusNode={handleFocusNode}
              focusRequest={testFocusRequest}
              onConsumeFocusRequest={consumeTestFocusRequest}
            />
          )}
          {view !== "tests" && currentTree && (
            <RollupTreeView
              tree={currentTree}
              summary={bitResult.summary}
              expandState={expandState}
              highlightedNodeIds={highlightedNodes}
              activeTestId={activeTestId}
              testsById={testsById}
              onFocusTest={(testId) => handleSelectTest(testId, true)}
              forcedExpandIds={
                forcedExpand && forcedExpand.scope === view
                  ? forcedExpand.ids
                  : []
              }
              focusNodeId={
                focusRequest && focusRequest.scope === view
                  ? focusRequest.nodeId
                  : null
              }
              onClearFocus={() => {
                if (focusRequest && focusRequest.scope === view) {
                  setFocusRequest(null);
                }
                if (forcedExpand && forcedExpand.scope === view) {
                  setForcedExpand(null);
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface TestsViewProps {
  tests: BitTest[];
  summary: BitSummary;
  activeTestId: string | null;
  functionLookup: Record<string, BitTreeNode>;
  hardwareLookup: Record<string, BitTreeNode>;
  functionTree: BitTreeNode;
  hardwareTree: BitTreeNode;
  highlighted: HighlightState;
  onSelectTest: (testId: string) => void;
  onFocusNode: (scope: keyof HighlightState, nodeId: string) => void;
  focusRequest: { testId: string; token: number } | null;
  onConsumeFocusRequest: () => void;
}

function TestsView({
  tests,
  summary,
  activeTestId,
  functionLookup,
  hardwareLookup,
  functionTree,
  hardwareTree,
  highlighted,
  onSelectTest,
  onFocusNode,
  focusRequest,
  onConsumeFocusRequest,
}: TestsViewProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [openTestId, setOpenTestId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusRequest) return;

    const { testId } = focusRequest;
    const target = listRef.current?.querySelector<HTMLElement>(
      `[data-test-row-id="${testId}"]`
    );

    setOpenTestId(testId);

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.focus({ preventScroll: true });
    }

    onConsumeFocusRequest();
  }, [focusRequest, onConsumeFocusRequest]);

  const handleToggleTest = useCallback(
    (testId: string) => {
      setOpenTestId((current) => (current === testId ? null : testId));
      onSelectTest(testId);
    },
    [onSelectTest]
  );

  const handleOpenFromTag = useCallback(
    (testId: string, scope: keyof HighlightState, nodeId: string) => {
      setOpenTestId(testId);
      onSelectTest(testId);
      onFocusNode(scope, nodeId);
    },
    [onFocusNode, onSelectTest]
  );

  useEffect(() => {
    if (!openTestId) return;
    if (!tests.some((test) => test.id === openTestId)) {
      setOpenTestId(null);
    }
  }, [openTestId, tests]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="px-4 pb-3 pt-4">
        <SummaryBanner summary={summary} />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4" ref={listRef}>
        <div className="overflow-hidden rounded-md border border-border/60 bg-card/40">
          <div className="divide-y divide-border/70">
            {tests.map((test) => {
              const isActive = test.id === activeTestId;
              const isOpen = openTestId === test.id;
              const statusTokens = STATUS_TOKENS[test.status];
              const lastRunLabel =
                typeof test.lastRun === "number"
                  ? `Last run ${formatRelativeTimestamp(test.lastRun)}`
                  : null;
              const durationLabel =
                typeof test.durationMs === "number"
                  ? `Duration ${(test.durationMs / 1000).toFixed(1)}s`
                  : null;

              const metadata = [lastRunLabel, durationLabel]
                .filter(Boolean)
                .join(" · ");
              const directFunctionNodes = getTerminalNodeIds(
                test.functionNodes || [],
                functionTree
              ).filter((nodeId) => functionLookup[nodeId]);
              const directHardwareNodes = getTerminalNodeIds(
                test.hardwareNodes || [],
                hardwareTree
              ).filter((nodeId) => hardwareLookup[nodeId]);
              const detailPanelId = `test-${test.id}-details`;

              return (
                <div
                  key={test.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleToggleTest(test.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleToggleTest(test.id);
                    }
                  }}
                  className={cn(
                    "relative cursor-pointer px-3 py-1.5 outline-none transition-colors",
                    "focus-visible:ring-1 focus-visible:ring-accent/60 focus-visible:ring-offset-0",
                    isActive
                      ? "bg-accent/10"
                      : "hover:bg-muted/60 focus-visible:bg-muted/60"
                  )}
                  data-test-row-id={test.id}
                  aria-expanded={isOpen}
                  aria-controls={detailPanelId}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 flex-shrink-0 rounded-full",
                          statusTokens.dot
                        )}
                      />
                      <span className="text-sm font-medium text-foreground">
                        {test.name}
                      </span>
                    </div>
                    <StatusBadge status={test.status} />
                  </div>
                  <div
                    className={cn(
                      "overflow-hidden transition-[max-height,opacity]",
                      isOpen
                        ? "max-h-48 opacity-100 duration-200 ease-out"
                        : "max-h-0 opacity-0 duration-150 ease-in"
                    )}
                    id={detailPanelId}
                  >
                    <div className="pt-2 text-xs text-muted-foreground">
                      {test.description && (
                        <p className="leading-snug text-muted-foreground">
                          {test.description}
                        </p>
                      )}
                      {metadata && (
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground/90">
                          {metadata}
                        </p>
                      )}
                      <TagGroup
                        label="Function"
                        scope="function"
                        testId={test.id}
                        nodeIds={directFunctionNodes}
                        lookup={functionLookup}
                        highlighted={highlighted.function}
                        onTagSelect={handleOpenFromTag}
                      />
                      <TagGroup
                        label="Hardware"
                        scope="hardware"
                        testId={test.id}
                        nodeIds={directHardwareNodes}
                        lookup={hardwareLookup}
                        highlighted={highlighted.hardware}
                        onTagSelect={handleOpenFromTag}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface RollupTreeViewProps {
  tree: RollupDisplayNode;
  summary: BitSummary;
  expandState: "auto" | "all" | "none";
  highlightedNodeIds: string[];
  activeTestId: string | null;
  testsById: Map<string, BitTest>;
  onFocusTest: (testId: string) => void;
  forcedExpandIds: string[];
  focusNodeId: string | null;
  onClearFocus: () => void;
}

function RollupTreeView({
  tree,
  summary,
  expandState,
  highlightedNodeIds,
  activeTestId,
  testsById,
  onFocusTest,
  forcedExpandIds,
  focusNodeId,
  onClearFocus,
}: RollupTreeViewProps) {
  const autoExpandCondition = useMemo(() => {
    if (expandState !== "auto") return undefined;
    return (node: RollupDisplayNode) =>
      node.kind === "group" &&
      (node.status === "fail" || node.status === "warn");
  }, [expandState]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const focusClearTimerRef = useRef<ReturnType<
    typeof window.setTimeout
  > | null>(null);

  useEffect(() => {
    if (!focusNodeId) return;
    const frame = requestAnimationFrame(() => {
      if (!containerRef.current) {
        onClearFocus();
        return;
      }
      const target = containerRef.current.querySelector<HTMLElement>(
        `[data-tree-node-id="${focusNodeId}"]`
      );
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        if (focusClearTimerRef.current) {
          window.clearTimeout(focusClearTimerRef.current);
        }
        focusClearTimerRef.current = window.setTimeout(() => {
          focusClearTimerRef.current = null;
          onClearFocus();
        }, 800);
      } else {
        onClearFocus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [focusNodeId, onClearFocus]);

  useEffect(
    () => () => {
      if (focusClearTimerRef.current) {
        window.clearTimeout(focusClearTimerRef.current);
      }
    },
    []
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="px-4 pb-3 pt-4">
        <SummaryBanner summary={summary} />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4" ref={containerRef}>
        <TreeView<RollupDisplayNode>
          key={`${tree.id}-${expandState}`}
          data={tree}
          defaultExpanded={expandState === "all"}
          autoExpandCondition={autoExpandCondition}
          forcedExpandIds={forcedExpandIds}
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
  );
}

interface RollupTreeNodeProps {
  node: RollupDisplayNode;
  highlightedNodeIds: string[];
  activeTestId: string | null;
  testsById: Map<string, BitTest>;
  onFocusTest: (testId: string) => void;
}

function RollupTreeNode({
  node,
  highlightedNodeIds,
  activeTestId,
  testsById,
  onFocusTest,
}: RollupTreeNodeProps) {
  if (node.kind === "test" && node.testId) {
    const test = testsById.get(node.testId);
    const isActive = activeTestId === node.testId;
    return (
      <button
        type="button"
        onClick={() => onFocusTest(node.testId!)}
        title={test?.description ?? undefined}
        data-tree-node-id={node.testId}
        className={cn(
          "w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-left text-xs transition",
          "hover:border-border hover:bg-muted/70",
          isActive && "border-accent/40 bg-accent/10 ring-1 ring-accent/50"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 flex-shrink-0 rounded-full",
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
    );
  }

  const isHighlighted = highlightedNodeIds.includes(node.id);
  const containsActiveTest = node.tests?.includes(activeTestId ?? "");

  return (
    <div
      className={cn(
        "rounded-md px-2 py-1.5 text-xs transition",
        isHighlighted && "border border-accent/40 bg-accent/10",
        !isHighlighted && containsActiveTest && "bg-accent/10"
      )}
      data-tree-node-id={node.id}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2.5 w-2.5 flex-shrink-0 rounded-full",
              STATUS_TOKENS[node.status].dot
            )}
          />
          <span className="text-xs font-medium text-foreground">
            {node.name}
          </span>
        </div>
        <StatusBadge status={node.status} />
      </div>
    </div>
  );
}

interface TagGroupProps {
  label: string;
  scope: keyof HighlightState;
  testId: string;
  nodeIds: string[];
  lookup: Record<string, BitTreeNode>;
  highlighted: string[];
  onTagSelect: (
    testId: string,
    scope: keyof HighlightState,
    nodeId: string
  ) => void;
}

function TagGroup({
  label,
  scope,
  testId,
  nodeIds,
  lookup,
  highlighted,
  onTagSelect,
}: TagGroupProps) {
  if (!nodeIds.length) return null;

  return (
    <div className="mt-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {nodeIds.map((nodeId) => {
          const node = lookup[nodeId];
          const isHighlighted = highlighted.includes(nodeId);
          return (
            <button
              type="button"
              key={`${scope}-${nodeId}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-[11px] font-medium transition",
                "bg-muted/70 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground",
                isHighlighted &&
                  "border-accent/40 bg-accent/10 text-foreground shadow-sm"
              )}
              onClick={(event) => {
                event.stopPropagation();
                onTagSelect(testId, scope, nodeId);
              }}
              title={node ? `${label} node: ${node.name}` : nodeId}
            >
              {node ? node.name : nodeId}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SummaryBanner({ summary }: { summary: BitSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <SummaryChip label="Fail" value={summary.fail} status={"fail"} />
      <SummaryChip label="Warn" value={summary.warn} status={"warn"} />
      <SummaryChip label="Ok" value={summary.ok} status={"ok"} />
      <span className="text-[11px] text-muted-foreground">
        Total tests: {summary.total}
      </span>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: BitStatus;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
        STATUS_TOKENS[status].tint,
        STATUS_TOKENS[status].badge
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: BitStatus }) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold uppercase tracking-wide",
        STATUS_TOKENS[status].badge
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

function statusLabel(status: BitStatus) {
  switch (status) {
    case "fail":
      return "Fail";
    case "warn":
      return "Warn";
    case "ok":
      return "Ok";
    default:
      return "Unknown";
  }
}

function buildNodeLookup(tree: BitTreeNode): Record<string, BitTreeNode> {
  const map: Record<string, BitTreeNode> = {};

  const traverse = (node: BitTreeNode) => {
    map[node.id] = node;
    node.children?.forEach(traverse);
  };

  traverse(tree);
  return map;
}

function createDisplayTree(
  node: BitTreeNode,
  testsById: Map<string, BitTest>
): RollupDisplayNode {
  const children: RollupDisplayNode[] = [];

  node.children?.forEach((child) => {
    children.push(createDisplayTree(child, testsById));
  });

  node.tests?.forEach((testId) => {
    const test = testsById.get(testId);
    if (!test) return;
    children.push({
      id: `${node.id}::${test.id}`,
      kind: "test",
      name: test.name,
      status: test.status,
      description: test.description ?? undefined,
      testId: test.id,
      lastRun: test.lastRun ?? undefined,
      durationMs: test.durationMs ?? undefined,
    });
  });

  return {
    id: node.id,
    kind: "group",
    name: node.name,
    status: node.status,
    description: node.description ?? undefined,
    tests: node.tests ?? undefined,
    children: children.length > 0 ? children : undefined,
  };
}

function findNodePath(node: BitTreeNode, targetId: string): string[] | null {
  if (node.id === targetId) {
    return [node.id];
  }

  for (const child of node.children ?? []) {
    const childPath = findNodePath(child, targetId);
    if (childPath) {
      return [node.id, ...childPath];
    }
  }

  return null;
}

function getTerminalNodeIds(nodeIds: string[], tree: BitTreeNode): string[] {
  if (!nodeIds.length) return [];
  const unique = Array.from(new Set(nodeIds));
  const paths = unique.map((id) => ({ id, path: findNodePath(tree, id) }));
  const terminals = new Set<string>();

  paths.forEach(({ id, path }) => {
    if (!path) {
      terminals.add(id);
      return;
    }
    const isAncestor = paths.some(({ id: otherId, path: otherPath }) => {
      if (otherId === id || !otherPath) return false;
      return otherPath.includes(id);
    });
    if (!isAncestor) {
      terminals.add(id);
    }
  });

  return Array.from(terminals);
}

function formatRelativeTimestamp(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return new Date(timestamp).toLocaleDateString();
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
