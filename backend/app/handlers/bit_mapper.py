"""
Mapper that converts BIT proto dataclasses to internal BitResult model.

This module bridges the external proto message format from the BIT rollup
service with our internal data model. It handles:
- Enum mapping between proto and internal status values
- Timestamp conversion (seconds to milliseconds)
- Function tree construction with test assignments
- Empty hardware tree (hardware tree support not yet implemented)
"""

import re
from typing import Optional

from app.models.bit_proto import (
    BitTestState,
    FunctionStatusTree,
    ReportRollupMsg,
    TestResults,
    TestStatus,
)
from app.models.generated import (
    BitResult,
    BitStatus,
    BitSummary,
    BitTest,
    BitTreeNode,
)


def _slugify(name: str) -> str:
    """Convert a name to a URL-friendly ID."""
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def map_proto_status(proto_status: BitTestState) -> BitStatus:
    """
    Map proto BitTestState to internal BitStatus.

    IN_PROGRESS is mapped to unknown since tests that haven't completed
    yet don't have a definitive result.
    """
    mapping = {
        BitTestState.FULLY_OPERATIONAL: BitStatus.ok,
        BitTestState.DEGRADED_OPERATIONAL: BitStatus.warn,
        BitTestState.NON_OPERATIONAL: BitStatus.fail,
        BitTestState.UNKNOWN: BitStatus.unknown,
        BitTestState.IN_PROGRESS: BitStatus.unknown,
    }
    return mapping.get(proto_status, BitStatus.unknown)


def map_to_bit_result(
    test_results: TestResults,
    rollup: ReportRollupMsg,
    timestamp_ms: Optional[int] = None,
) -> BitResult:
    """
    Convert proto messages to a complete BitResult.

    The mapper uses test name as the unique identifier (not test_id from proto)
    to handle hot-reload scenarios where test IDs might be reassigned but
    names remain unique.

    Note on status values: TestResults contains the definitive test status
    values. The function tree from ReportRollupMsg may have slightly stale
    status on leaf nodes due to message timing. We use TestResults as the
    source of truth for individual test status, but use the function tree's
    structure and non-leaf status values.

    Args:
        test_results: Definitive list of tests and their status
        rollup: Function tree and rollup information
        timestamp_ms: Optional override timestamp (defaults to max test timestamp)

    Returns:
        BitResult ready for publishing to event bus
    """
    # Build test name -> function nodes mapping from the tree
    function_node_map = _build_function_node_map(rollup.functions)

    # Convert tests
    tests = [_map_test(test, function_node_map) for test in test_results.tests]
    tests_by_name = {t.name: t for t in tests}

    # Build function tree using proto structure but with test status from TestResults
    function_tree = _build_function_tree(rollup.functions, tests_by_name)

    # Empty hardware tree (not yet supported)
    hardware_tree = BitTreeNode(
        id="hardware-root",
        name="Hardware",
        status=BitStatus.ok,
        children=[],
        tests=[],
    )

    # Calculate summary
    summary = BitSummary(
        total=len(tests),
        ok=sum(1 for t in tests if t.status == BitStatus.ok),
        warn=sum(1 for t in tests if t.status == BitStatus.warn),
        fail=sum(1 for t in tests if t.status == BitStatus.fail),
    )

    # Overall status from function tree root
    overall_status = function_tree.status if function_tree else BitStatus.unknown

    # Timestamp: use provided or derive from tests
    if timestamp_ms is None:
        if tests:
            # Use the latest test timestamp
            timestamp_ms = max(t.last_run for t in tests if t.last_run is not None) or 0
        else:
            timestamp_ms = 0

    return BitResult(
        timestamp=timestamp_ms,
        overallStatus=overall_status,
        summary=summary,
        tests=tests,
        functionTree=function_tree,
        hardwareTree=hardware_tree,
    )


def _map_test(
    proto_test: TestStatus,
    function_node_map: dict[str, list[str]],
) -> BitTest:
    """Convert a proto TestStatus to internal BitTest."""
    # Use test name as the unique ID
    test_name = proto_test.name

    return BitTest(
        id=test_name,
        name=test_name,
        status=map_proto_status(proto_test.status),
        description=None,  # Not provided by proto, to be added later
        lastRun=proto_test.timestamp_sec * 1000,  # Convert to ms
        durationMs=0,  # Not provided by proto
        metrics=None,  # Not provided by proto
        extraResultInfo=list(proto_test.verbose_info),
        functionNodes=function_node_map.get(test_name, []),
        hardwareNodes=[],  # Hardware tree not supported yet
    )


def _build_function_node_map(
    tree: Optional[FunctionStatusTree],
) -> dict[str, list[str]]:
    """
    Build a mapping from test name to list of function node IDs.

    Walks the function tree and for each leaf node (no children),
    treats the node name as a test name and records the path of
    ancestor node IDs.
    """
    result: dict[str, list[str]] = {}
    if tree is None:
        return result

    def walk(node: FunctionStatusTree, path: list[str]) -> None:
        node_id = _slugify(node.name)
        current_path = path + [node_id]

        if not node.nodes:
            # Leaf node - name should match a test name
            result[node.name] = current_path
        else:
            # Non-leaf - recurse into children
            for child in node.nodes:
                walk(child, current_path)

    walk(tree, [])
    return result


def _build_function_tree(
    proto_tree: Optional[FunctionStatusTree],
    tests_by_name: dict[str, BitTest],
) -> BitTreeNode:
    """
    Build the function tree from proto, using test status from TestResults.

    Leaf proto nodes (those with no children) represent tests and should NOT
    become tree node children. Instead, their test IDs are attached to the
    parent node's `tests` field. This prevents duplicate rendering where a
    test appears both as a tree node and as a test within that node.

    For non-leaf nodes, we use the status from the proto (rollup service
    computed it).
    """
    if proto_tree is None:
        return BitTreeNode(
            id="system-functions",
            name="System Functions",
            status=BitStatus.unknown,
            children=[],
            tests=[],
        )

    def convert_node(node: FunctionStatusTree) -> BitTreeNode:
        node_id = _slugify(node.name)

        # Separate children into leaf nodes (tests) and non-leaf nodes (subtrees)
        children: list[BitTreeNode] = []
        tests_list: list[str] = []

        for child in node.nodes:
            if not child.nodes:
                # Leaf node represents a test - add to tests list, not children
                test = tests_by_name.get(child.name)
                if test:
                    tests_list.append(test.id)
            else:
                # Non-leaf node - recurse and add as child
                children.append(convert_node(child))

        # Use rollup status from proto for non-leaf nodes
        status = map_proto_status(node.status)

        return BitTreeNode(
            id=node_id,
            name=node.name,
            status=status,
            children=children if children else None,
            tests=tests_list if tests_list else None,
        )

    return convert_node(proto_tree)
