"""Mock BIT subscriber that simulates receiving BIT updates via ZMQ.

This mock generates data in the same format as the real BIT rollup service
would provide (proto dataclasses), then uses BitProtoMapper to convert to
our internal BitResult format.

When real ZMQ/protobuf integration is added, this class would be replaced
with one that:
1. Subscribes to ZMQ topics for TestResults and ReportRollupMsg
2. Deserializes protobuf messages to the proto dataclasses
3. Uses the same mapper to convert to BitResult
"""

import asyncio
import logging
import random
import time
from typing import Optional

from app.core.event_bus import EventBus, Topic
from app.handlers.bit_mapper import map_to_bit_result
from app.models.bit_proto import (
    BitTestState,
    FunctionStatusTree,
    ReportRollupMsg,
    TestResults,
    TestStatus,
)

logger = logging.getLogger(__name__)


class MockBitSubscriber:
    """
    Mock ZMQ subscriber that generates BIT updates every 2-3 seconds.

    Generates TestResults and ReportRollupMsg in proto dataclass format,
    then uses BitProtoMapper to convert to BitResult for publishing.

    In production, this would be replaced with an actual ZMQ subscriber
    that receives rollup messages from the BIT rollup service.
    """

    def __init__(self) -> None:
        self._running = False
        self._task: Optional[asyncio.Task[None]] = None
        self._event_bus: Optional[EventBus] = None

        # Track test states for continuity between updates
        self._test_states: dict[str, BitTestState] = {}

        # Track timestamps per test (simulates tests running at different intervals)
        self._test_timestamps: dict[str, int] = {}

        # How often each test runs (in seconds) - tests don't all run at same rate
        self._test_intervals: dict[str, float] = {}

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

                # Generate proto messages (simulating what ZMQ would provide)
                test_results = self._generate_test_results()
                rollup = self._generate_rollup(test_results)

                # Map to internal format
                now_ms = int(time.time() * 1000)
                result = map_to_bit_result(test_results, rollup, now_ms)

                await self._event_bus.publish(Topic.BIT_RESULT, result)

                # Random interval between 2-3 seconds (polling rate)
                await asyncio.sleep(random.uniform(2.0, 3.0))
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.exception(f"Error in MockBitSubscriber: {e}")
                await asyncio.sleep(1.0)

    def _generate_test_results(self) -> TestResults:
        """Generate TestResults proto message with all test statuses."""
        now_sec = int(time.time())

        # Test configurations: (name, fail_prob, warn_prob, recover_prob, interval_sec)
        test_configs = [
            ("IF Output Linearity", 0.03, 0.08, 0.15, 10.0),
            ("Clock PLL Discipline", 0.02, 0.06, 0.20, 8.0),
            ("GPS Holdover Stability", 0.02, 0.10, 0.12, 15.0),
            ("DSP Pipeline Integrity", 0.01, 0.03, 0.25, 5.0),
            ("Memory Margin Test", 0.01, 0.02, 0.30, 12.0),
            ("Telemetry Channel Verification", 0.005, 0.02, 0.35, 20.0),
            ("Firmware Interface Handshake", 0.005, 0.02, 0.35, 6.0),
        ]

        tests: list[TestStatus] = []
        for idx, (name, fail_prob, warn_prob, recover_prob, interval) in enumerate(test_configs):
            # Initialize state and interval if first time seeing this test
            if name not in self._test_states:
                self._test_states[name] = BitTestState.FULLY_OPERATIONAL
                self._test_intervals[name] = interval
                # Stagger initial timestamps so tests don't all update at once
                self._test_timestamps[name] = now_sec - random.randint(0, int(interval))

            # Check if this test should run (based on its interval)
            last_run = self._test_timestamps[name]
            if now_sec - last_run >= self._test_intervals[name]:
                # Test is running - transition state
                current_state = self._test_states[name]
                new_state = self._transition_state(
                    current_state, fail_prob, warn_prob, recover_prob
                )
                self._test_states[name] = new_state
                self._test_timestamps[name] = now_sec

            # Build verbose_info based on status
            verbose_info = self._generate_verbose_info(name, self._test_states[name])

            tests.append(
                TestStatus(
                    name=name,
                    test_id=idx + 1,
                    status=self._test_states[name],
                    timestamp_sec=self._test_timestamps[name],
                    verbose_info=verbose_info,
                )
            )

        return TestResults(node_id=1, tests=tests)

    def _transition_state(
        self,
        current: BitTestState,
        fail_prob: float,
        warn_prob: float,
        recover_prob: float,
    ) -> BitTestState:
        """Determine new state based on current state and probabilities."""
        rand = random.random()

        if current == BitTestState.FULLY_OPERATIONAL:
            if rand < fail_prob:
                return BitTestState.NON_OPERATIONAL
            elif rand < fail_prob + warn_prob:
                return BitTestState.DEGRADED_OPERATIONAL
            return BitTestState.FULLY_OPERATIONAL

        elif current == BitTestState.DEGRADED_OPERATIONAL:
            if rand < fail_prob * 2:  # More likely to fail from degraded
                return BitTestState.NON_OPERATIONAL
            elif rand < fail_prob * 2 + recover_prob:
                return BitTestState.FULLY_OPERATIONAL
            return BitTestState.DEGRADED_OPERATIONAL

        elif current == BitTestState.NON_OPERATIONAL:
            if rand < recover_prob:
                return BitTestState.FULLY_OPERATIONAL
            elif rand < recover_prob + warn_prob:
                return BitTestState.DEGRADED_OPERATIONAL
            return BitTestState.NON_OPERATIONAL

        return current

    def _generate_verbose_info(self, test_name: str, state: BitTestState) -> list[str]:
        """Generate realistic verbose_info for a test based on its state."""
        info: list[str] = []

        if state == BitTestState.FULLY_OPERATIONAL:
            # Add nominal measurements for passing tests
            if "Linearity" in test_name:
                info.append("Measured: +0.1dB from nominal")
                info.append("Within specification")
            elif "PLL" in test_name:
                info.append("Lock time: 82ms (nominal: 100ms)")
                info.append("Phase noise: -112dBc/Hz")
            elif "GPS" in test_name:
                info.append("Holdover drift: 0.05ppm (limit: 0.35ppm)")
                info.append("Satellites tracked: 12")
            elif "DSP" in test_name:
                info.append("Pipeline latency: 7.2us (nominal: 8us)")
            elif "Memory" in test_name:
                info.append("Margin: 28% (nominal: 25%)")
                info.append("ECC corrections: 0")
            elif "Telemetry" in test_name:
                info.append("Frame errors: 0 in last 1000")
                info.append("Link quality: 99.8%")
            elif "Firmware" in test_name:
                info.append("Handshake latency: 18ms (nominal: 20ms)")

        elif state == BitTestState.DEGRADED_OPERATIONAL:
            if "Linearity" in test_name:
                info.append("Measured: -1.2dB from nominal")
                info.append("Threshold: -2.0dB")
            elif "PLL" in test_name:
                info.append("Lock time: 145ms (nominal: 100ms)")
            elif "GPS" in test_name:
                info.append("Holdover drift: 0.28ppm (limit: 0.35ppm)")
            elif "DSP" in test_name:
                info.append("Pipeline latency elevated: 12us (nominal: 8us)")
            elif "Memory" in test_name:
                info.append("Margin reduced to 15% (nominal: 25%)")
            elif "Telemetry" in test_name:
                info.append("Frame errors: 2 in last 1000")
            elif "Firmware" in test_name:
                info.append("Handshake latency: 45ms (nominal: 20ms)")

        elif state == BitTestState.NON_OPERATIONAL:
            if "Linearity" in test_name:
                info.append("FAULT: IF output below threshold")
                info.append("Measured: -4.5dB from nominal")
                info.append("Threshold: -2.0dB")
            elif "PLL" in test_name:
                info.append("FAULT: PLL failed to acquire lock")
                info.append("Timeout after 500ms")
            elif "GPS" in test_name:
                info.append("FAULT: GPS receiver not responding")
                info.append("Last valid fix: 2 minutes ago")
            elif "DSP" in test_name:
                info.append("FAULT: DSP pipeline stalled")
                info.append("Watchdog timeout on stage 3")
            elif "Memory" in test_name:
                info.append("FAULT: DDR ECC errors detected")
                info.append("Uncorrectable errors: 3")
            elif "Telemetry" in test_name:
                info.append("FAULT: Telemetry link down")
                info.append("No response from downstream")
            elif "Firmware" in test_name:
                info.append("FAULT: Firmware sync lost")
                info.append("Control plane unresponsive")

        return info

    def _generate_rollup(self, test_results: TestResults) -> ReportRollupMsg:
        """Generate ReportRollupMsg with function tree matching tests."""
        # Build lookup for test status by name
        test_status_map = {t.name: t.status for t in test_results.tests}

        def get_status(name: str) -> BitTestState:
            return test_status_map.get(name, BitTestState.UNKNOWN)

        def rollup_status(*children_status: BitTestState) -> BitTestState:
            """Roll up status from children (most severe wins)."""
            severity = {
                BitTestState.UNKNOWN: 0,
                BitTestState.FULLY_OPERATIONAL: 1,
                BitTestState.IN_PROGRESS: 2,
                BitTestState.DEGRADED_OPERATIONAL: 3,
                BitTestState.NON_OPERATIONAL: 4,
            }
            if not children_status:
                return BitTestState.UNKNOWN
            return max(children_status, key=lambda s: severity.get(s, 0))

        # Build function tree matching our test structure
        # Leaf nodes have names matching test names

        # Signal Flow branch
        rf_path = FunctionStatusTree(
            name="RF Path",
            status=get_status("IF Output Linearity"),
            nodes=[
                FunctionStatusTree(
                    name="IF Output Linearity",
                    status=get_status("IF Output Linearity"),
                    nodes=[],
                ),
            ],
        )

        dsp_pipeline = FunctionStatusTree(
            name="DSP Pipeline",
            status=rollup_status(
                get_status("DSP Pipeline Integrity"),
                get_status("Memory Margin Test"),
            ),
            nodes=[
                FunctionStatusTree(
                    name="DSP Pipeline Integrity",
                    status=get_status("DSP Pipeline Integrity"),
                    nodes=[],
                ),
                FunctionStatusTree(
                    name="Memory Margin Test",
                    status=get_status("Memory Margin Test"),
                    nodes=[],
                ),
            ],
        )

        signal_flow = FunctionStatusTree(
            name="Signal Flow",
            status=rollup_status(rf_path.status, dsp_pipeline.status),
            nodes=[rf_path, dsp_pipeline],
        )

        # Timing Chain branch
        timing_chain = FunctionStatusTree(
            name="Timing Chain",
            status=rollup_status(
                get_status("Clock PLL Discipline"),
                get_status("GPS Holdover Stability"),
            ),
            nodes=[
                FunctionStatusTree(
                    name="Clock PLL Discipline",
                    status=get_status("Clock PLL Discipline"),
                    nodes=[],
                ),
                FunctionStatusTree(
                    name="GPS Holdover Stability",
                    status=get_status("GPS Holdover Stability"),
                    nodes=[],
                ),
            ],
        )

        # System Services branch
        # Note: "Memory Margin Test" appears here AND under DSP Pipeline
        # to demonstrate multi-function mapping (memory is both a DSP
        # resource and a system resource)
        system_services = FunctionStatusTree(
            name="System Services",
            status=rollup_status(
                get_status("Telemetry Channel Verification"),
                get_status("Firmware Interface Handshake"),
                get_status("Memory Margin Test"),
            ),
            nodes=[
                FunctionStatusTree(
                    name="Telemetry Channel Verification",
                    status=get_status("Telemetry Channel Verification"),
                    nodes=[],
                ),
                FunctionStatusTree(
                    name="Firmware Interface Handshake",
                    status=get_status("Firmware Interface Handshake"),
                    nodes=[],
                ),
                FunctionStatusTree(
                    name="Memory Margin Test",
                    status=get_status("Memory Margin Test"),
                    nodes=[],
                ),
            ],
        )

        # Root
        root = FunctionStatusTree(
            name="System Functions",
            status=rollup_status(signal_flow.status, timing_chain.status, system_services.status),
            nodes=[signal_flow, timing_chain, system_services],
        )

        return ReportRollupMsg(
            verbose_info=[],
            failed_hardware_components=[],
            functions=root,
        )
