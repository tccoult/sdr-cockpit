import { useEffect, useMemo, useRef } from "react";

import { TreeView } from "../common/TreeView";
import { BitSummary, BitTest } from "../../services/api";
import { SummaryBanner, StatusBadge } from "./StatusIndicators";
import { STATUS_TOKENS } from "./statusTokens";
import { RollupDisplayNode } from "./utils";
import { cn } from "@/lib/utils";

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

export function RollupTreeView({
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
  const focusClearTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(
    null
  );

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
        }, 800) as unknown as ReturnType<typeof window.setTimeout>;
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
