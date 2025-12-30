"""
Unit tests for BIT proto mapper.

Tests the conversion from proto dataclasses to internal BitResult model.
"""

from app.handlers.bit_mapper import (
    map_proto_status,
    map_to_bit_result,
)
from app.models.bit_proto import (
    BitTestState,
    FunctionStatusTree,
    ReportRollupMsg,
    TestResults,
    TestStatus,
)
from app.models.generated import BitStatus


class TestMapProtoStatus:
    """Tests for status enum mapping."""

    def test_fully_operational_maps_to_ok(self):
        assert map_proto_status(BitTestState.FULLY_OPERATIONAL) == BitStatus.ok

    def test_degraded_operational_maps_to_warn(self):
        assert map_proto_status(BitTestState.DEGRADED_OPERATIONAL) == BitStatus.warn

    def test_non_operational_maps_to_fail(self):
        assert map_proto_status(BitTestState.NON_OPERATIONAL) == BitStatus.fail

    def test_unknown_maps_to_unknown(self):
        assert map_proto_status(BitTestState.UNKNOWN) == BitStatus.unknown

    def test_in_progress_maps_to_unknown(self):
        """IN_PROGRESS tests don't have results yet, so map to unknown."""
        assert map_proto_status(BitTestState.IN_PROGRESS) == BitStatus.unknown


class TestMapToResult:
    """Tests for the main mapping function."""

    def test_converts_timestamp_seconds_to_ms(self):
        """Proto uses seconds, internal uses milliseconds."""
        test_results = TestResults(
            node_id=1,
            tests=[
                TestStatus(
                    name="Test A",
                    test_id=1,
                    status=BitTestState.FULLY_OPERATIONAL,
                    timestamp_sec=1000,
                    verbose_info=[],
                )
            ],
        )
        rollup = ReportRollupMsg(functions=None)

        result = map_to_bit_result(test_results, rollup)

        assert result.tests[0].last_run == 1000 * 1000  # 1000 sec = 1000000 ms

    def test_uses_test_name_as_id(self):
        """Test name is used as unique ID (not test_id from proto)."""
        test_results = TestResults(
            node_id=1,
            tests=[
                TestStatus(
                    name="My Unique Test",
                    test_id=42,
                    status=BitTestState.FULLY_OPERATIONAL,
                    timestamp_sec=1000,
                    verbose_info=[],
                )
            ],
        )
        rollup = ReportRollupMsg(functions=None)

        result = map_to_bit_result(test_results, rollup)

        assert result.tests[0].id == "My Unique Test"
        assert result.tests[0].name == "My Unique Test"

    def test_verbose_info_becomes_extra_result_info(self):
        """Proto verbose_info maps to extraResultInfo."""
        test_results = TestResults(
            node_id=1,
            tests=[
                TestStatus(
                    name="Test A",
                    test_id=1,
                    status=BitTestState.NON_OPERATIONAL,
                    timestamp_sec=1000,
                    verbose_info=["FAULT: Something broke", "Details here"],
                )
            ],
        )
        rollup = ReportRollupMsg(functions=None)

        result = map_to_bit_result(test_results, rollup)

        assert result.tests[0].extra_result_info == ["FAULT: Something broke", "Details here"]

    def test_calculates_summary_correctly(self):
        """Summary counts should match test statuses."""
        test_results = TestResults(
            node_id=1,
            tests=[
                TestStatus(
                    name="Test OK",
                    test_id=1,
                    status=BitTestState.FULLY_OPERATIONAL,
                    timestamp_sec=1000,
                ),
                TestStatus(
                    name="Test Warn",
                    test_id=2,
                    status=BitTestState.DEGRADED_OPERATIONAL,
                    timestamp_sec=1000,
                ),
                TestStatus(
                    name="Test Fail",
                    test_id=3,
                    status=BitTestState.NON_OPERATIONAL,
                    timestamp_sec=1000,
                ),
            ],
        )
        rollup = ReportRollupMsg(functions=None)

        result = map_to_bit_result(test_results, rollup)

        assert result.summary.total == 3
        assert result.summary.ok == 1
        assert result.summary.warn == 1
        assert result.summary.fail == 1

    def test_empty_hardware_tree(self):
        """Hardware tree should be empty (not yet supported)."""
        test_results = TestResults(node_id=1, tests=[])
        rollup = ReportRollupMsg(functions=None)

        result = map_to_bit_result(test_results, rollup)

        assert result.hardware_tree.id == "hardware-root"
        assert result.hardware_tree.name == "Hardware"
        assert result.hardware_tree.children == []

    def test_function_node_mapping(self):
        """Tests should have functionNodes derived from tree position."""
        test_results = TestResults(
            node_id=1,
            tests=[
                TestStatus(
                    name="Leaf Test",
                    test_id=1,
                    status=BitTestState.FULLY_OPERATIONAL,
                    timestamp_sec=1000,
                )
            ],
        )
        rollup = ReportRollupMsg(
            functions=FunctionStatusTree(
                name="Root",
                status=BitTestState.FULLY_OPERATIONAL,
                nodes=[
                    FunctionStatusTree(
                        name="Branch",
                        status=BitTestState.FULLY_OPERATIONAL,
                        nodes=[
                            FunctionStatusTree(
                                name="Leaf Test",
                                status=BitTestState.FULLY_OPERATIONAL,
                                nodes=[],
                            )
                        ],
                    )
                ],
            )
        )

        result = map_to_bit_result(test_results, rollup)

        # Should have all node IDs from root to leaf (sorted alphabetically)
        assert result.tests[0].function_nodes == ["branch", "leaf-test", "root"]

    def test_leaf_nodes_become_test_references_not_children(self):
        """Leaf proto nodes should become test IDs in parent, not tree children.

        This prevents duplicates where a test appears both as a tree node
        and as a test listed within that node.
        """
        test_results = TestResults(
            node_id=1,
            tests=[
                TestStatus(
                    name="Test A",
                    test_id=1,
                    status=BitTestState.DEGRADED_OPERATIONAL,
                    timestamp_sec=1000,
                ),
                TestStatus(
                    name="Test B",
                    test_id=2,
                    status=BitTestState.FULLY_OPERATIONAL,
                    timestamp_sec=1000,
                ),
            ],
        )
        rollup = ReportRollupMsg(
            functions=FunctionStatusTree(
                name="Parent",
                status=BitTestState.DEGRADED_OPERATIONAL,
                nodes=[
                    FunctionStatusTree(
                        name="Test A",
                        status=BitTestState.FULLY_OPERATIONAL,  # Stale
                        nodes=[],  # Leaf
                    ),
                    FunctionStatusTree(
                        name="Test B",
                        status=BitTestState.FULLY_OPERATIONAL,
                        nodes=[],  # Leaf
                    ),
                ],
            )
        )

        result = map_to_bit_result(test_results, rollup)

        # Parent should have no children (leaf nodes aren't children)
        assert result.function_tree.children is None
        # Parent should reference tests by ID
        assert result.function_tree.tests == ["Test A", "Test B"]

    def test_uses_rollup_status_for_non_leaf_nodes(self):
        """Non-leaf nodes should use status from the rollup tree."""
        test_results = TestResults(
            node_id=1,
            tests=[
                TestStatus(
                    name="Leaf",
                    test_id=1,
                    status=BitTestState.FULLY_OPERATIONAL,
                    timestamp_sec=1000,
                )
            ],
        )
        rollup = ReportRollupMsg(
            functions=FunctionStatusTree(
                name="Parent",
                status=BitTestState.DEGRADED_OPERATIONAL,  # Rollup says warn
                nodes=[
                    FunctionStatusTree(
                        name="Leaf",
                        status=BitTestState.FULLY_OPERATIONAL,
                        nodes=[],
                    )
                ],
            )
        )

        result = map_to_bit_result(test_results, rollup)

        # Parent should use rollup status (warn), not recalculated
        assert result.function_tree.status == BitStatus.warn

    def test_timestamp_override(self):
        """Explicit timestamp_ms should override derived timestamp."""
        test_results = TestResults(
            node_id=1,
            tests=[
                TestStatus(
                    name="Test",
                    test_id=1,
                    status=BitTestState.FULLY_OPERATIONAL,
                    timestamp_sec=1000,
                )
            ],
        )
        rollup = ReportRollupMsg(functions=None)

        result = map_to_bit_result(test_results, rollup, timestamp_ms=9999)

        assert result.timestamp == 9999

    def test_empty_tests_uses_zero_timestamp(self):
        """With no tests, timestamp should be 0 (or provided)."""
        test_results = TestResults(node_id=1, tests=[])
        rollup = ReportRollupMsg(functions=None)

        result = map_to_bit_result(test_results, rollup)

        assert result.timestamp == 0


class TestFunctionTreeStructure:
    """Tests for function tree structure and hierarchy."""

    def test_nested_tree_preserves_hierarchy(self):
        """Nested non-leaf nodes should become tree children.

        Structure:
          System Functions
            - Signal Flow (non-leaf)
              - RF Path (non-leaf, has test children)
                - tests: [IF Output Linearity]
              - DSP Pipeline (non-leaf, has test children)
                - tests: [DSP Integrity, Memory Test]
        """
        test_results = TestResults(
            node_id=1,
            tests=[
                TestStatus(
                    name="IF Output Linearity",
                    test_id=1,
                    status=BitTestState.FULLY_OPERATIONAL,
                    timestamp_sec=1000,
                ),
                TestStatus(
                    name="DSP Integrity",
                    test_id=2,
                    status=BitTestState.DEGRADED_OPERATIONAL,
                    timestamp_sec=1000,
                ),
                TestStatus(
                    name="Memory Test",
                    test_id=3,
                    status=BitTestState.FULLY_OPERATIONAL,
                    timestamp_sec=1000,
                ),
            ],
        )
        rollup = ReportRollupMsg(
            functions=FunctionStatusTree(
                name="System Functions",
                status=BitTestState.DEGRADED_OPERATIONAL,
                nodes=[
                    FunctionStatusTree(
                        name="Signal Flow",
                        status=BitTestState.DEGRADED_OPERATIONAL,
                        nodes=[
                            FunctionStatusTree(
                                name="RF Path",
                                status=BitTestState.FULLY_OPERATIONAL,
                                nodes=[
                                    FunctionStatusTree(
                                        name="IF Output Linearity",
                                        status=BitTestState.FULLY_OPERATIONAL,
                                        nodes=[],
                                    ),
                                ],
                            ),
                            FunctionStatusTree(
                                name="DSP Pipeline",
                                status=BitTestState.DEGRADED_OPERATIONAL,
                                nodes=[
                                    FunctionStatusTree(
                                        name="DSP Integrity",
                                        status=BitTestState.DEGRADED_OPERATIONAL,
                                        nodes=[],
                                    ),
                                    FunctionStatusTree(
                                        name="Memory Test",
                                        status=BitTestState.FULLY_OPERATIONAL,
                                        nodes=[],
                                    ),
                                ],
                            ),
                        ],
                    ),
                ],
            )
        )

        result = map_to_bit_result(test_results, rollup)
        tree = result.function_tree

        # Root level
        assert tree.name == "System Functions"
        assert tree.status == BitStatus.warn
        assert tree.tests is None  # No direct tests
        assert len(tree.children) == 1

        # Signal Flow level
        signal_flow = tree.children[0]
        assert signal_flow.name == "Signal Flow"
        assert signal_flow.status == BitStatus.warn
        assert signal_flow.tests is None
        assert len(signal_flow.children) == 2

        # RF Path level
        rf_path = signal_flow.children[0]
        assert rf_path.name == "RF Path"
        assert rf_path.status == BitStatus.ok
        assert rf_path.children is None  # No non-leaf children
        assert rf_path.tests == ["IF Output Linearity"]  # Test reference

        # DSP Pipeline level
        dsp_pipeline = signal_flow.children[1]
        assert dsp_pipeline.name == "DSP Pipeline"
        assert dsp_pipeline.status == BitStatus.warn
        assert dsp_pipeline.children is None
        assert dsp_pipeline.tests == ["DSP Integrity", "Memory Test"]

    def test_no_duplicate_test_nodes(self):
        """Leaf nodes should not appear as both children and test refs.

        This was a bug where "DSP Pipeline Integrity" would appear twice:
        once as a tree node child, and again as a test within that node.
        """
        test_results = TestResults(
            node_id=1,
            tests=[
                TestStatus(
                    name="Test Alpha",
                    test_id=1,
                    status=BitTestState.FULLY_OPERATIONAL,
                    timestamp_sec=1000,
                ),
            ],
        )
        rollup = ReportRollupMsg(
            functions=FunctionStatusTree(
                name="Category",
                status=BitTestState.FULLY_OPERATIONAL,
                nodes=[
                    FunctionStatusTree(
                        name="Test Alpha",
                        status=BitTestState.FULLY_OPERATIONAL,
                        nodes=[],
                    ),
                ],
            )
        )

        result = map_to_bit_result(test_results, rollup)

        # Category should have test reference, not child node
        assert result.function_tree.name == "Category"
        assert result.function_tree.children is None
        assert result.function_tree.tests == ["Test Alpha"]

    def test_mixed_children_and_tests(self):
        """A node can have both non-leaf children and leaf test references."""
        test_results = TestResults(
            node_id=1,
            tests=[
                TestStatus(
                    name="Nested Test",
                    test_id=1,
                    status=BitTestState.FULLY_OPERATIONAL,
                    timestamp_sec=1000,
                ),
                TestStatus(
                    name="Direct Test",
                    test_id=2,
                    status=BitTestState.FULLY_OPERATIONAL,
                    timestamp_sec=1000,
                ),
            ],
        )
        rollup = ReportRollupMsg(
            functions=FunctionStatusTree(
                name="Root",
                status=BitTestState.FULLY_OPERATIONAL,
                nodes=[
                    # Non-leaf child (has its own children)
                    FunctionStatusTree(
                        name="Subgroup",
                        status=BitTestState.FULLY_OPERATIONAL,
                        nodes=[
                            FunctionStatusTree(
                                name="Nested Test",
                                status=BitTestState.FULLY_OPERATIONAL,
                                nodes=[],
                            ),
                        ],
                    ),
                    # Leaf child (test reference)
                    FunctionStatusTree(
                        name="Direct Test",
                        status=BitTestState.FULLY_OPERATIONAL,
                        nodes=[],
                    ),
                ],
            )
        )

        result = map_to_bit_result(test_results, rollup)

        # Root has both child node and direct test
        assert len(result.function_tree.children) == 1
        assert result.function_tree.tests == ["Direct Test"]

        # Subgroup has nested test
        subgroup = result.function_tree.children[0]
        assert subgroup.name == "Subgroup"
        assert subgroup.children is None
        assert subgroup.tests == ["Nested Test"]

    def test_multi_function_mapping(self):
        """A test can appear under multiple function branches.

        When a test like "Memory Test" is relevant to both DSP Pipeline
        and System Services, it should appear in both branches and its
        functionNodes should include IDs from both paths.
        """
        test_results = TestResults(
            node_id=1,
            tests=[
                TestStatus(
                    name="Memory Test",
                    test_id=1,
                    status=BitTestState.FULLY_OPERATIONAL,
                    timestamp_sec=1000,
                ),
                TestStatus(
                    name="DSP Test",
                    test_id=2,
                    status=BitTestState.FULLY_OPERATIONAL,
                    timestamp_sec=1000,
                ),
                TestStatus(
                    name="Telemetry Test",
                    test_id=3,
                    status=BitTestState.FULLY_OPERATIONAL,
                    timestamp_sec=1000,
                ),
            ],
        )
        rollup = ReportRollupMsg(
            functions=FunctionStatusTree(
                name="Root",
                status=BitTestState.FULLY_OPERATIONAL,
                nodes=[
                    # DSP branch - has Memory Test
                    FunctionStatusTree(
                        name="DSP Pipeline",
                        status=BitTestState.FULLY_OPERATIONAL,
                        nodes=[
                            FunctionStatusTree(
                                name="DSP Test",
                                status=BitTestState.FULLY_OPERATIONAL,
                                nodes=[],
                            ),
                            FunctionStatusTree(
                                name="Memory Test",
                                status=BitTestState.FULLY_OPERATIONAL,
                                nodes=[],
                            ),
                        ],
                    ),
                    # System Services branch - also has Memory Test
                    FunctionStatusTree(
                        name="System Services",
                        status=BitTestState.FULLY_OPERATIONAL,
                        nodes=[
                            FunctionStatusTree(
                                name="Telemetry Test",
                                status=BitTestState.FULLY_OPERATIONAL,
                                nodes=[],
                            ),
                            FunctionStatusTree(
                                name="Memory Test",
                                status=BitTestState.FULLY_OPERATIONAL,
                                nodes=[],
                            ),
                        ],
                    ),
                ],
            )
        )

        result = map_to_bit_result(test_results, rollup)

        # Find Memory Test in results
        memory_test = next(t for t in result.tests if t.name == "Memory Test")

        # Memory Test should have nodes from BOTH branches
        # Sorted alphabetically: dsp-pipeline, memory-test, root, system-services
        assert "dsp-pipeline" in memory_test.function_nodes
        assert "system-services" in memory_test.function_nodes
        assert "root" in memory_test.function_nodes
        assert "memory-test" in memory_test.function_nodes

        # DSP Test should only have nodes from DSP branch
        dsp_test = next(t for t in result.tests if t.name == "DSP Test")
        assert "dsp-pipeline" in dsp_test.function_nodes
        assert "system-services" not in dsp_test.function_nodes

        # Function tree should have Memory Test in both branches
        dsp_branch = result.function_tree.children[0]
        services_branch = result.function_tree.children[1]
        assert "Memory Test" in dsp_branch.tests
        assert "Memory Test" in services_branch.tests
