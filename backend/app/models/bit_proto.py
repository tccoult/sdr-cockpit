"""
Dataclasses representing the BIT protobuf messages from the rollup service.

These classes mirror the proto definitions without requiring protobuf dependencies.
When real ZMQ/protobuf integration is added, the protobuf messages will be
deserialized into these dataclasses.

Note: Some fields from the proto are intentionally omitted (e.g., criticality,
BitStates) as they are not currently used by our system.
"""

from dataclasses import dataclass, field
from enum import IntEnum


class BitTestState(IntEnum):
    """
    Status of a BIT test or component.

    Maps to bit.enums.BitTestState in the proto.
    """

    UNKNOWN = 0
    DEGRADED_OPERATIONAL = 1
    NON_OPERATIONAL = 2
    IN_PROGRESS = 3
    FULLY_OPERATIONAL = 4


class HardwareComponentType(IntEnum):
    """
    Type of hardware component, indicating replaceability level.

    Maps to bit.enums.HardwareComponentType in the proto.
    """

    # Line Replaceable Unit - can be replaced in the field
    LRU = 0
    # Shop Replaceable Unit - replaced at next-level maintenance station
    SRU = 1
    # Cannot be replaced on its own - parent component must be replaced
    NON_REPLACEABLE = 2


@dataclass
class TestStatus:
    """
    Individual test result from the BIT system.

    This is the definitive source of truth for test status. The function tree
    may have slightly stale status values due to message timing between
    TestResults and ReportRollupMsg.
    """

    # The name of the test - used as unique identifier
    name: str
    # Numeric test ID (unique within node, but we use name as primary ID)
    test_id: int
    # Current status of the test
    status: BitTestState
    # Timestamp of when the test was run (seconds since epoch, UTC)
    # Note: Proto field is named "time_of_failure_sec" but it's actually
    # the test run timestamp, not just failure time
    timestamp_sec: int
    # Additional information about the test result
    verbose_info: list[str] = field(default_factory=list)


@dataclass
class TestResults:
    """
    Complete list of test results from a node.

    This message provides the definitive list of all tests and their current
    status. Results can be requested more frequently than tests run, so
    timestamps should be used to detect new results.
    """

    # ID of the node that collected these results (ignored - single node assumed)
    node_id: int
    # List of individual test results
    tests: list[TestStatus] = field(default_factory=list)


@dataclass
class HardwareComponentStatusTree:
    """
    Tree node representing a hardware component and its status.

    Note: Currently not used for building hardware trees in our system.
    Hardware tree support may be added in the future.
    """

    # Name of the hardware component
    name: str
    # Status of this hardware component
    status: BitTestState
    # Type indicating replaceability (LRU/SRU/NON_REPLACEABLE)
    component_type: HardwareComponentType
    # Tests associated with this hardware component
    tests: list[TestStatus] = field(default_factory=list)
    # Lower-level subcomponents
    sub_components: list["HardwareComponentStatusTree"] = field(default_factory=list)


@dataclass
class FunctionStatusTree:
    """
    Tree node representing a system function and its status.

    The tree is hierarchical where leaf nodes correspond to individual tests.
    Leaf node names should match test names from TestResults.

    Note: The status on tree nodes comes from the rollup service. Due to
    message timing, there may be minor desync between tree node status and
    the corresponding test status from TestResults. We use TestResults as
    the source of truth for individual test status.
    """

    # Name of the function (leaf nodes match test names)
    name: str
    # Status of the function (rolled up from children/tests by rollup service)
    status: BitTestState
    # Hardware components whose failures affect this function (currently unused)
    hardware_components: list[HardwareComponentStatusTree] = field(default_factory=list)
    # Subfunctions of this function
    nodes: list["FunctionStatusTree"] = field(default_factory=list)


@dataclass
class ReportRollupMsg:
    """
    Main rollup report containing function tree and failed hardware info.

    This message is received alongside TestResults. The function tree provides
    hierarchical organization of tests, while TestResults provides the
    definitive test status values.
    """

    # Catch-all info not tied to specific tests (currently unused)
    verbose_info: list[str] = field(default_factory=list)
    # Failed hardware components sorted by failure likelihood (currently unused)
    failed_hardware_components: list[HardwareComponentStatusTree] = field(default_factory=list)
    # Hierarchical tree of system functions
    functions: FunctionStatusTree | None = None
