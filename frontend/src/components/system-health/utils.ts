import { BitTest, BitTreeNode } from "../../services/api";

export function buildNodeLookup(tree: BitTreeNode): Record<string, BitTreeNode> {
  const map: Record<string, BitTreeNode> = {};

  const traverse = (node: BitTreeNode) => {
    map[node.id] = node;
    node.children?.forEach(traverse);
  };

  traverse(tree);
  return map;
}

export interface RollupDisplayNode extends BitTreeNode {
  kind: "group" | "test";
  name: string;
  status: BitTreeNode["status"];
  description?: string;
  tests?: string[];
  testId?: string;
  lastRun?: number;
  durationMs?: number;
  children?: RollupDisplayNode[];
}

export function createDisplayTree(
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

export function findNodePath(
  node: BitTreeNode,
  targetId: string
): string[] | null {
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

export function getTerminalNodeIds(nodeIds: string[], tree: BitTreeNode): string[] {
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

export function formatRelativeTimestamp(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  // For timestamps older than 1 hour, show absolute date/time in local timezone
  return new Date(timestamp).toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
