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

        # Should have path from root to leaf
        assert result.tests[0].function_nodes == ["root", "branch", "leaf-test"]

    def test_uses_test_status_for_leaf_nodes(self):
        """Leaf nodes should use status from TestResults, not tree."""
        # Tree says FULLY_OPERATIONAL, but test says DEGRADED
        test_results = TestResults(
            node_id=1,
            tests=[
                TestStatus(
                    name="Test A",
                    test_id=1,
                    status=BitTestState.DEGRADED_OPERATIONAL,
                    timestamp_sec=1000,
                )
            ],
        )
        rollup = ReportRollupMsg(
            functions=FunctionStatusTree(
                name="Test A",
                status=BitTestState.FULLY_OPERATIONAL,  # Stale status
                nodes=[],
            )
        )

        result = map_to_bit_result(test_results, rollup)

        # Should use test status, not tree status
        assert result.function_tree.status == BitStatus.warn

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
