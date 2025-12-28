import { useCallback, useEffect, useRef, useState } from "react";

import {
  BitSummary,
  BitTest,
  BitTreeNode,
  BitStatus,
} from "../../services/api";
import { SummaryBanner, StatusBadge } from "./StatusIndicators";
import { STATUS_TOKENS } from "./statusTokens";
import {
  getTerminalNodeIds,
  formatRelativeTimestamp,
} from "./utils";
import { cn } from "@/lib/utils";

interface HighlightState {
  function: string[];
  hardware: string[];
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
  isMobile?: boolean;
}

export function TestsView({
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
  isMobile = false,
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
    <div className={cn("flex flex-col", !isMobile && "h-full overflow-hidden")}>
      <div className="px-4 pb-3 pt-3">
        <SummaryBanner summary={summary} />
      </div>
      <div
        className={cn("px-2 pb-4", !isMobile && "flex-1 overflow-y-auto")}
        ref={listRef}
      >
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
                    <StatusBadge status={test.status as BitStatus} />
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
                        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground/90">
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
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                "inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-xs font-medium transition",
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
