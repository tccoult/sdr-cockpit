"""Mock BIT subscriber that simulates receiving BIT updates via ZMQ"""

import asyncio
import logging
import random
import time
from typing import Optional, TypedDict

from app.core.event_bus import EventBus, Topic
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
    recover_prob: float
    metrics: Optional[dict[str, str]]
    function_nodes: list[str]
    hardware_nodes: list[str]


logger = logging.getLogger(__name__)


class MockBitSubscriber:
    """
    Mock ZMQ subscriber that generates BIT updates every 2-3 seconds.

    In production, this would be replaced with an actual ZMQ subscriber
    that receives rollup messages from the BIT rollup service.
    """

    def __init__(self) -> None:
        self._running = False
        self._task: Optional[asyncio.Task[None]] = None
        self._test_states: dict[str, BitStatus] = {}  # Persist states for continuity
        self._event_bus: Optional[EventBus] = None

    def set_event_bus(self, event_bus: EventBus) -> None:
        """Set the event bus for publishing BIT results"""
        self._event_bus = event_bus

    async def start(self) -> None:
        """Start generating mock BIT updates"""
        if self._running:
            return

        self._running = True
        self._task = asyncio.create_task(self._run())
        logger.info("MockBitSubscriber started")

    async def stop(self) -> None:
        """Stop generating updates"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("MockBitSubscriber stopped")

    async def _run(self) -> None:
        """Main loop - generate and publish BIT results"""
        while self._running:
            try:
                if self._event_bus is None:
                    logger.warning("No event bus configured, cannot publish BIT result")
                    await asyncio.sleep(1.0)
                    continue

                result = self._generate_bit_result()
                await self._event_bus.publish(Topic.BIT_RESULT, result)

                # Random interval between 2-3 seconds
                await asyncio.sleep(random.uniform(2.0, 3.0))
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.exception(f"Error in MockBitSubscriber: {e}")
                await asyncio.sleep(1.0)

    def _generate_bit_result(self) -> BitResult:
        """Generate a complete BIT result with tests and trees"""
        now = int(time.time() * 1000)

        tests = self._generate_tests(now)
        tests_by_id = {t.id: t for t in tests}

        function_assignments = self._build_assignments(tests, "function")
        hardware_assignments = self._build_assignments(tests, "hardware")

        function_tree = self._rollup_tree(
            self._create_function_tree(), function_assignments, tests_by_id
        )
        hardware_tree = self._rollup_tree(
            self._create_hardware_tree(), hardware_assignments, tests_by_id
        )

        summary = BitSummary(
            total=len(tests),
            ok=sum(1 for t in tests if t.status == BitStatus.ok),
            warn=sum(1 for t in tests if t.status == BitStatus.warn),
            fail=sum(1 for t in tests if t.status == BitStatus.fail),
        )

        # Overall status is derived from function tree root rollup
        overall_status = function_tree.status

        return BitResult(
            timestamp=now,
            overallStatus=overall_status,
            summary=summary,
            tests=tests,
            functionTree=function_tree,
            hardwareTree=hardware_tree,
        )

    def _generate_tests(self, now: int) -> list[BitTest]:
        """Generate test results with state continuity"""
        configs: list[TestConfig] = [
            {
                "id": "rf-if-linearity",
                "name": "IF Output Linearity",
                "description": "Mixer IF output amplitude check",
                "fail_prob": 0.03,
                "warn_prob": 0.08,
                "recover_prob": 0.15,
                "metrics": {"expected": "1.0", "actual": "0.85", "threshold": "0.8", "unit": "V"},
                "function_nodes": ["signal-flow", "rf-path", "conversion-stage"],
                "hardware_nodes": ["rf-frontend", "mixer-stage", "if-output"],
            },
            {
                "id": "clock-discipline",
                "name": "Clock PLL Discipline",
                "description": "PLL lock acquisition check",
                "fail_prob": 0.02,
                "warn_prob": 0.06,
                "recover_prob": 0.20,
                "metrics": {"expected": "12", "actual": "15", "threshold": "15", "unit": "ms"},
                "function_nodes": ["timing-chain", "sync-control"],
                "hardware_nodes": ["clocking", "pll-unit"],
            },
            {
                "id": "gps-holdover",
                "name": "GPS Holdover Stability",
                "description": "Oscillator drift in holdover mode",
                "fail_prob": 0.02,
                "warn_prob": 0.10,
                "recover_prob": 0.12,
                "metrics": {
                    "expected": "0.25",
                    "actual": "0.35",
                    "threshold": "0.35",
                    "unit": "ppm",
                },
                "function_nodes": ["timing-chain", "frequency-distribution"],
                "hardware_nodes": ["clocking", "oscillator-board"],
            },
            {
                "id": "dsp-integrity",
                "name": "DSP Pipeline Integrity",
                "description": "FFT and decimation stage verification",
                "fail_prob": 0.01,
                "warn_prob": 0.03,
                "recover_prob": 0.25,
                "metrics": None,
                "function_nodes": ["signal-flow", "baseband-processing", "dsp-pipeline"],
                "hardware_nodes": ["processing-blade", "dsp-complex"],
            },
            {
                "id": "memory-margin",
                "name": "Memory Margin Test",
                "description": "DDR burst transfer verification",
                "fail_prob": 0.01,
                "warn_prob": 0.02,
                "recover_prob": 0.30,
                "metrics": None,
                "function_nodes": ["signal-flow", "baseband-processing", "memory-buffering"],
                "hardware_nodes": ["processing-blade", "ddr-bank"],
            },
            {
                "id": "telemetry-link",
                "name": "Telemetry Channel Verification",
                "description": "Downlink telemetry frame check",
                "fail_prob": 0.005,
                "warn_prob": 0.02,
                "recover_prob": 0.35,
                "metrics": None,
                "function_nodes": ["system-services", "telemetry"],
                "hardware_nodes": ["processing-blade", "fpga"],
            },
            {
                "id": "firmware-handshake",
                "name": "Firmware Interface Handshake",
                "description": "Control plane firmware sync check",
                "fail_prob": 0.005,
                "warn_prob": 0.02,
                "recover_prob": 0.35,
                "metrics": None,
                "function_nodes": ["system-services", "firmware-interfaces"],
                "hardware_nodes": ["processing-blade", "fpga"],
            },
        ]

        tests: list[BitTest] = []
        for config in configs:
            test_id = config["id"]
            current_status = self._test_states.get(test_id, BitStatus.ok)

            # Determine new status based on transition probabilities
            new_status = self._transition_status(
                current_status,
                config["fail_prob"],
                config["warn_prob"],
                config["recover_prob"],
            )
            self._test_states[test_id] = new_status

            # Build metrics if present
            metrics: Optional[BitMetrics] = None
            if config["metrics"]:
                metrics_data = config["metrics"].copy()
                if new_status == BitStatus.fail:
                    metrics_data["actual"] = str(float(metrics_data["threshold"]) * 0.7)
                elif new_status == BitStatus.warn:
                    metrics_data["actual"] = str(float(metrics_data["threshold"]) * 0.95)
                metrics = BitMetrics(**metrics_data)

            last_run = now - random.randint(1000, 5000)
            duration = random.randint(500, 1500)

            test = BitTest(
                id=test_id,
                name=config["name"],
                status=new_status,
                description=config["description"],
                lastRun=last_run,
                durationMs=duration,
                metrics=metrics,
                functionNodes=config["function_nodes"],
                hardwareNodes=config["hardware_nodes"],
            )
            tests.append(test)

        return tests

    def _transition_status(
        self,
        current: BitStatus,
        fail_prob: float,
        warn_prob: float,
        recover_prob: float,
    ) -> BitStatus:
        """Determine new status based on current status and probabilities"""
        rand = random.random()

        if current == BitStatus.ok:
            if rand < fail_prob:
                return BitStatus.fail
            elif rand < fail_prob + warn_prob:
                return BitStatus.warn
            return BitStatus.ok

        elif current == BitStatus.warn:
            if rand < fail_prob * 2:  # More likely to fail from warn
                return BitStatus.fail
            elif rand < fail_prob * 2 + recover_prob:
                return BitStatus.ok
            return BitStatus.warn

        elif current == BitStatus.fail:
            if rand < recover_prob:
                return BitStatus.ok
            elif rand < recover_prob + warn_prob:
                return BitStatus.warn
            return BitStatus.fail

        return current

    def _build_assignments(self, tests: list[BitTest], key: str) -> dict[str, list[str]]:
        """Build node -> test_id assignments"""
        assignments: dict[str, list[str]] = {}
        for test in tests:
            nodes = test.function_nodes if key == "function" else test.hardware_nodes
            if nodes:
                for node_id in nodes:
                    if node_id not in assignments:
                        assignments[node_id] = []
                    assignments[node_id].append(test.id)
        return assignments

    def _get_most_severe(self, a: BitStatus, b: BitStatus) -> BitStatus:
        """Return the more severe status"""
        order = {BitStatus.unknown: 0, BitStatus.ok: 1, BitStatus.warn: 2, BitStatus.fail: 3}
        return a if order[a] >= order[b] else b

    def _rollup_tree(
        self,
        node: BitTreeNode,
        assignments: dict[str, list[str]],
        tests_by_id: dict[str, BitTest],
    ) -> BitTreeNode:
        """Recursively roll up status from children and assigned tests"""
        children = None
        if node.children:
            children = [
                self._rollup_tree(child, assignments, tests_by_id) for child in node.children
            ]

        assigned_tests = assignments.get(node.id, [])
        status = BitStatus.ok if assigned_tests else BitStatus.unknown

        for test_id in assigned_tests:
            test = tests_by_id.get(test_id)
            if test:
                status = self._get_most_severe(status, test.status)

        if children:
            for child in children:
                status = self._get_most_severe(status, child.status)

        return BitTreeNode(
            id=node.id,
            name=node.name,
            status=status,
            description=node.description,
            children=children,
            tests=assigned_tests if assigned_tests else None,
        )

    def _create_function_tree(self) -> BitTreeNode:
        """Create function hierarchy structure"""
        return BitTreeNode(
            id="system-functions",
            name="System Functions",
            status=BitStatus.unknown,
            children=[
                BitTreeNode(
                    id="signal-flow",
                    name="Signal Flow",
                    status=BitStatus.unknown,
                    children=[
                        BitTreeNode(
                            id="rf-path",
                            name="RF Path",
                            status=BitStatus.unknown,
                            children=[
                                BitTreeNode(
                                    id="conversion-stage",
                                    name="Conversion Stage",
                                    status=BitStatus.unknown,
                                ),
                                BitTreeNode(
                                    id="gain-stabilization",
                                    name="Gain Stabilization",
                                    status=BitStatus.unknown,
                                ),
                            ],
                        ),
                        BitTreeNode(
                            id="baseband-processing",
                            name="Baseband Processing",
                            status=BitStatus.unknown,
                            children=[
                                BitTreeNode(
                                    id="dsp-pipeline", name="DSP Pipeline", status=BitStatus.unknown
                                ),
                                BitTreeNode(
                                    id="memory-buffering",
                                    name="Memory Buffering",
                                    status=BitStatus.unknown,
                                ),
                            ],
                        ),
                    ],
                ),
                BitTreeNode(
                    id="timing-chain",
                    name="Timing Chain",
                    status=BitStatus.unknown,
                    children=[
                        BitTreeNode(
                            id="sync-control", name="Sync Control", status=BitStatus.unknown
                        ),
                        BitTreeNode(
                            id="frequency-distribution",
                            name="Frequency Distribution",
                            status=BitStatus.unknown,
                        ),
                    ],
                ),
                BitTreeNode(
                    id="system-services",
                    name="System Services",
                    status=BitStatus.unknown,
                    children=[
                        BitTreeNode(
                            id="firmware-interfaces",
                            name="Firmware Interfaces",
                            status=BitStatus.unknown,
                        ),
                        BitTreeNode(
                            id="telemetry", name="Telemetry Streams", status=BitStatus.unknown
                        ),
                    ],
                ),
            ],
        )

    def _create_hardware_tree(self) -> BitTreeNode:
        """Create hardware hierarchy structure"""
        return BitTreeNode(
            id="chassis",
            name="Chassis",
            status=BitStatus.unknown,
            children=[
                BitTreeNode(
                    id="rf-frontend",
                    name="RF Frontend",
                    status=BitStatus.unknown,
                    children=[
                        BitTreeNode(id="lna-module", name="LNA Module", status=BitStatus.unknown),
                        BitTreeNode(
                            id="attenuator-bank", name="Attenuator Bank", status=BitStatus.unknown
                        ),
                        BitTreeNode(
                            id="mixer-stage",
                            name="Mixer Stage",
                            status=BitStatus.unknown,
                            children=[
                                BitTreeNode(
                                    id="if-output",
                                    name="IF Output Network",
                                    status=BitStatus.unknown,
                                ),
                            ],
                        ),
                    ],
                ),
                BitTreeNode(
                    id="clocking",
                    name="Clocking",
                    status=BitStatus.unknown,
                    children=[
                        BitTreeNode(id="pll-unit", name="PLL Unit", status=BitStatus.unknown),
                        BitTreeNode(
                            id="oscillator-board", name="Oscillator Board", status=BitStatus.unknown
                        ),
                        BitTreeNode(
                            id="distribution-amplifier",
                            name="Distribution Amplifier",
                            status=BitStatus.unknown,
                        ),
                    ],
                ),
                BitTreeNode(
                    id="processing-blade",
                    name="Processing Blade",
                    status=BitStatus.unknown,
                    children=[
                        BitTreeNode(id="fpga", name="FPGA Fabric", status=BitStatus.unknown),
                        BitTreeNode(id="dsp-complex", name="DSP Complex", status=BitStatus.unknown),
                        BitTreeNode(id="ddr-bank", name="DDR Bank", status=BitStatus.unknown),
                    ],
                ),
            ],
        )
