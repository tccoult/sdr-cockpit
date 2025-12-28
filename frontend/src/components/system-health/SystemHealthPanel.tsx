import { ChevronDown, MoreVertical } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BitAlertList, BitHealthMetrics, BitResult, BitTest } from "../../services/api";
import { Button } from "@/components/ui/button";
import { TestsView } from "./TestsView";
import { RollupTreeView } from "./RollupTreeView";
import { STATUS_PRIORITY } from "./statusTokens";
import { AlertsSection } from "./AlertsSection";
import { MetricsSummary } from "./MetricsSummary";
import {
  buildNodeLookup,
  createDisplayTree,
  findNodePath,
  formatRelativeTimestamp,
  getTerminalNodeIds,
} from "./utils";
import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/useMobile";

export interface SystemHealthPanelProps {
  bitResult: BitResult | null;
  alerts: BitAlertList;
  metrics: BitHealthMetrics;
}

type PanelView = "tests" | "function" | "hardware";

interface HighlightState {
  function: string[];
  hardware: string[];
}

export function SystemHealthPanel({
  bitResult,
  alerts,
  metrics,
}: SystemHealthPanelProps) {
  const isMobile = useMobile();
  const [metricsExpanded, setMetricsExpanded] = useState(false);
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
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-sm font-semibold text-foreground">Built-In Test</h3>
          <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Last updated {formatRelativeTimestamp(bitResult.timestamp)}</span>
            <button
              type="button"
              className="group inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
              onClick={() => setMetricsExpanded((prev) => !prev)}
              aria-expanded={metricsExpanded}
              aria-label="Toggle metrics details"
              title="Metrics"
            >
              <span className="text-[10px] uppercase tracking-wide opacity-0 transition-opacity group-hover:opacity-100">
                Metrics
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  metricsExpanded && "rotate-180"
                )}
              />
            </button>
          </div>
        </div>
        <MetricsSummary metrics={metrics} isExpanded={metricsExpanded} />
        <div className="border-t border-border/70" />
        <AlertsSection alerts={alerts.alerts} isMobile={isMobile} />
        <div className="border-t border-border/70" />
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3">
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
