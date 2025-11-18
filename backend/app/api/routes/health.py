"""Health (BIT) REST API routes"""

import random
import time
from typing import Dict, List, Optional, TypedDict

from fastapi import APIRouter

from app.models.generated import (
    BitMetrics,
    BitResult,
    BitStatus,
    BitSummary,
    BitTest,
    BitTreeNode,
)


class TestConfig(TypedDict):
    """Type definition for test configuration"""

    id: str
    name: str
    description: str
    fail_prob: float
    warn_prob: float
    metrics: Optional[Dict[str, str]]
    functionNodes: List[str]
    hardwareNodes: List[str]


router = APIRouter(prefix="/api/health", tags=["health"])

# Status severity order for rollup calculations
STATUS_ORDER = {
    BitStatus.unknown: 0,
    BitStatus.ok: 1,
    BitStatus.warn: 2,
    BitStatus.fail: 3,
}


def get_most_severe(a: BitStatus, b: BitStatus) -> BitStatus:
    """Return the more severe status"""
    return a if STATUS_ORDER[a] >= STATUS_ORDER[b] else b


def generate_random_tests() -> List[BitTest]:
    """Generate randomized BIT tests with some random failures"""
    now = int(time.time() * 1000)

    # Base tests with varying probabilities of failure
    tests_config: List[TestConfig] = [
        {
            "id": "rf-if-linearity",
            "name": "IF Output Linearity",
            "description": "Mixer IF output amplitude dropped below the minimum threshold.",
            "fail_prob": 0.15,  # 15% chance of failure
            "warn_prob": 0.25,  # 25% chance of warning
            "metrics": {"expected": "1.0", "actual": "0.85", "threshold": "0.8", "unit": "V"},
            "functionNodes": ["signal-flow", "rf-path", "conversion-stage"],
            "hardwareNodes": ["rf-frontend", "mixer-stage", "if-output"],
        },
        {
            "id": "clock-discipline",
            "name": "Clock PLL Discipline",
            "description": "PLL lock acquisition exceeded nominal settling time.",
            "fail_prob": 0.05,
            "warn_prob": 0.20,
            "metrics": {"expected": "12", "actual": "15", "threshold": "15", "unit": "ms"},
            "functionNodes": ["timing-chain", "sync-control"],
            "hardwareNodes": ["clocking", "pll-unit"],
        },
        {
            "id": "gps-holdover",
            "name": "GPS Holdover Stability",
            "description": "Oscillator drift is elevated while operating in holdover mode.",
            "fail_prob": 0.05,
            "warn_prob": 0.30,
            "metrics": {"expected": "0.25", "actual": "0.35", "threshold": "0.35", "unit": "ppm"},
            "functionNodes": ["timing-chain", "frequency-distribution"],
            "hardwareNodes": ["clocking", "oscillator-board"],
        },
        {
            "id": "dsp-integrity",
            "name": "DSP Pipeline Integrity",
            "description": "FFT and decimation stages produced expected reference signatures.",
            "fail_prob": 0.02,
            "warn_prob": 0.10,
            "metrics": None,
            "functionNodes": ["signal-flow", "baseband-processing", "dsp-pipeline"],
            "hardwareNodes": ["processing-blade", "dsp-complex"],
        },
        {
            "id": "memory-margin",
            "name": "Memory Margin Test",
            "description": "DDR burst transfers completed without error at operational temperature.",
            "fail_prob": 0.02,
            "warn_prob": 0.08,
            "metrics": None,
            "functionNodes": ["signal-flow", "baseband-processing", "memory-buffering"],
            "hardwareNodes": ["processing-blade", "ddr-bank"],
        },
        {
            "id": "telemetry-link",
            "name": "Telemetry Channel Verification",
            "description": "Downlink telemetry frames were acknowledged across all priority queues.",
            "fail_prob": 0.01,
            "warn_prob": 0.05,
            "metrics": None,
            "functionNodes": ["system-services", "telemetry"],
            "hardwareNodes": ["processing-blade", "fpga"],
        },
        {
            "id": "firmware-handshake",
            "name": "Firmware Interface Handshake",
            "description": "Control plane firmware responded with synchronized sequence IDs.",
            "fail_prob": 0.01,
            "warn_prob": 0.05,
            "metrics": None,
            "functionNodes": ["system-services", "firmware-interfaces"],
            "hardwareNodes": ["processing-blade", "fpga"],
        },
    ]

    tests: List[BitTest] = []
    for config in tests_config:
        # Randomly determine status based on probabilities
        rand = random.random()
        fail_prob: float = config["fail_prob"]
        warn_prob: float = config["warn_prob"]

        if rand < fail_prob:
            status = BitStatus.fail
        elif rand < fail_prob + warn_prob:
            status = BitStatus.warn
        else:
            status = BitStatus.ok

        # Adjust metrics based on status if metrics exist
        metrics: Optional[BitMetrics] = None
        config_metrics = config["metrics"]
        if config_metrics:
            metrics_data = config_metrics.copy()
            if status == BitStatus.fail:
                # Make actual worse than threshold
                metrics_data["actual"] = str(float(metrics_data["threshold"]) * 0.7)
            elif status == BitStatus.warn:
                # Make actual close to threshold
                metrics_data["actual"] = str(float(metrics_data["threshold"]) * 0.95)
            metrics = BitMetrics(**metrics_data)

        # Random last run time (within last 15 minutes)
        last_run_offset = random.randint(60, 900) * 1000  # 1-15 minutes in ms

        test = BitTest(
            id=config["id"],
            name=config["name"],
            status=status,
            description=config["description"],
            lastRun=now - last_run_offset,
            durationMs=random.randint(500, 1500),
            metrics=metrics,
            functionNodes=config["functionNodes"],
            hardwareNodes=config["hardwareNodes"],
        )
        tests.append(test)

    return tests


def build_assignments(tests: List[BitTest], key: str) -> Dict[str, List[str]]:
    """Build assignment map from tests to tree nodes"""
    assignments: Dict[str, List[str]] = {}

    for test in tests:
        node_list = test.function_nodes if key == "functionNodes" else test.hardware_nodes
        if node_list:
            for node_id in node_list:
                if node_id not in assignments:
                    assignments[node_id] = []
                if test.id not in assignments[node_id]:
                    assignments[node_id].append(test.id)

    return assignments


def rollup_tree(
    node: BitTreeNode, assignments: Dict[str, List[str]], tests_by_id: Dict[str, BitTest]
) -> BitTreeNode:
    """Recursively rollup tree status from children and assigned tests"""
    # Process children recursively
    children = None
    if node.children:
        children = [rollup_tree(child, assignments, tests_by_id) for child in node.children]

    # Get assigned tests for this node
    assigned_tests = assignments.get(node.id, [])

    # Start with OK if there are assigned tests, UNKNOWN otherwise
    status = BitStatus.ok if assigned_tests else BitStatus.unknown

    # Roll up status from assigned tests
    for test_id in assigned_tests:
        test = tests_by_id.get(test_id)
        if test:
            status = get_most_severe(status, test.status)

    # Roll up status from children
    if children:
        for child in children:
            status = get_most_severe(status, child.status)

    return BitTreeNode(
        id=node.id,
        name=node.name,
        status=status,
        description=node.description,
        children=children,
        tests=assigned_tests if assigned_tests else None,
    )


def create_function_tree() -> BitTreeNode:
    """Create the function tree structure"""
    return BitTreeNode(
        id="system-functions",
        name="System Functions",
        status=BitStatus.unknown,
        tests=None,
        children=[
            BitTreeNode(
                id="signal-flow",
                name="Signal Flow",
                status=BitStatus.unknown,
                tests=None,
                children=[
                    BitTreeNode(
                        id="rf-path",
                        name="RF Path",
                        status=BitStatus.unknown,
                        tests=None,
                        children=[
                            BitTreeNode(
                                id="conversion-stage",
                                name="Conversion Stage",
                                status=BitStatus.unknown,
                                tests=None,
                            ),
                            BitTreeNode(
                                id="gain-stabilization",
                                name="Gain Stabilization",
                                status=BitStatus.unknown,
                                tests=None,
                            ),
                        ],
                    ),
                    BitTreeNode(
                        id="baseband-processing",
                        name="Baseband Processing",
                        status=BitStatus.unknown,
                        tests=None,
                        children=[
                            BitTreeNode(
                                id="dsp-pipeline",
                                name="DSP Pipeline",
                                status=BitStatus.unknown,
                                tests=None,
                            ),
                            BitTreeNode(
                                id="memory-buffering",
                                name="Memory Buffering",
                                status=BitStatus.unknown,
                                tests=None,
                            ),
                        ],
                    ),
                ],
            ),
            BitTreeNode(
                id="timing-chain",
                name="Timing Chain",
                status=BitStatus.unknown,
                tests=None,
                children=[
                    BitTreeNode(
                        id="sync-control",
                        name="Sync Control",
                        status=BitStatus.unknown,
                        tests=None,
                    ),
                    BitTreeNode(
                        id="frequency-distribution",
                        name="Frequency Distribution",
                        status=BitStatus.unknown,
                        tests=None,
                    ),
                ],
            ),
            BitTreeNode(
                id="system-services",
                name="System Services",
                status=BitStatus.unknown,
                tests=None,
                children=[
                    BitTreeNode(
                        id="firmware-interfaces",
                        name="Firmware Interfaces",
                        status=BitStatus.unknown,
                        tests=None,
                    ),
                    BitTreeNode(
                        id="telemetry",
                        name="Telemetry Streams",
                        status=BitStatus.unknown,
                        tests=None,
                    ),
                ],
            ),
        ],
    )


def create_hardware_tree() -> BitTreeNode:
    """Create the hardware tree structure"""
    return BitTreeNode(
        id="chassis",
        name="Chassis",
        status=BitStatus.unknown,
        tests=None,
        children=[
            BitTreeNode(
                id="rf-frontend",
                name="RF Frontend",
                status=BitStatus.unknown,
                tests=None,
                children=[
                    BitTreeNode(
                        id="lna-module",
                        name="LNA Module",
                        status=BitStatus.unknown,
                        tests=None,
                    ),
                    BitTreeNode(
                        id="attenuator-bank",
                        name="Attenuator Bank",
                        status=BitStatus.unknown,
                        tests=None,
                    ),
                    BitTreeNode(
                        id="mixer-stage",
                        name="Mixer Stage",
                        status=BitStatus.unknown,
                        tests=None,
                        children=[
                            BitTreeNode(
                                id="if-output",
                                name="IF Output Network",
                                status=BitStatus.unknown,
                                tests=None,
                            ),
                        ],
                    ),
                ],
            ),
            BitTreeNode(
                id="clocking",
                name="Clocking",
                status=BitStatus.unknown,
                tests=None,
                children=[
                    BitTreeNode(
                        id="pll-unit",
                        name="PLL Unit",
                        status=BitStatus.unknown,
                        tests=None,
                    ),
                    BitTreeNode(
                        id="oscillator-board",
                        name="Oscillator Board",
                        status=BitStatus.unknown,
                        tests=None,
                    ),
                    BitTreeNode(
                        id="distribution-amplifier",
                        name="Distribution Amplifier",
                        status=BitStatus.unknown,
                        tests=None,
                    ),
                ],
            ),
            BitTreeNode(
                id="processing-blade",
                name="Processing Blade",
                status=BitStatus.unknown,
                tests=None,
                children=[
                    BitTreeNode(
                        id="fpga",
                        name="FPGA Fabric",
                        status=BitStatus.unknown,
                        tests=None,
                    ),
                    BitTreeNode(
                        id="dsp-complex",
                        name="DSP Complex",
                        status=BitStatus.unknown,
                        tests=None,
                    ),
                    BitTreeNode(
                        id="ddr-bank",
                        name="DDR Bank",
                        status=BitStatus.unknown,
                        tests=None,
                    ),
                ],
            ),
        ],
    )


@router.get("/bit/results", response_model=BitResult)
async def get_bit_results() -> BitResult:
    """Get latest BIT test results with function and hardware trees"""
    now = int(time.time() * 1000)

    # Generate randomized tests
    tests = generate_random_tests()
    tests_by_id = {test.id: test for test in tests}

    # Build assignments
    function_assignments = build_assignments(tests, "functionNodes")
    hardware_assignments = build_assignments(tests, "hardwareNodes")

    # Build and rollup trees
    function_tree = rollup_tree(create_function_tree(), function_assignments, tests_by_id)
    hardware_tree = rollup_tree(create_hardware_tree(), hardware_assignments, tests_by_id)

    # Calculate summary
    summary = BitSummary(
        total=len(tests),
        ok=sum(1 for t in tests if t.status == BitStatus.ok),
        warn=sum(1 for t in tests if t.status == BitStatus.warn),
        fail=sum(1 for t in tests if t.status == BitStatus.fail),
    )

    return BitResult(
        timestamp=now,
        summary=summary,
        tests=tests,
        functionTree=function_tree,
        hardwareTree=hardware_tree,
    )
