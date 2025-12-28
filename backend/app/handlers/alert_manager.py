"""Alert detection for BIT status transitions"""

import logging
from dataclasses import dataclass, field
from typing import Optional

from app.core.event_bus import EventBus, Topic
from app.models.generated import BitAlert, BitAlertSeverity, BitResult, BitStatus

logger = logging.getLogger(__name__)

# Cooldown period after emitting a degradation alert (in milliseconds)
# During cooldown, only severity escalations (warn -> fail) trigger new alerts
COOLDOWN_MS = 60_000  # 1 minute

SEVERITY_PRIORITY = {
    BitAlertSeverity.failed: 3,
    BitAlertSeverity.degraded: 2,
    BitAlertSeverity.recovered: 1,
}


@dataclass
class TestState:
    """Tracked state for a single test"""

    status: BitStatus
    # Severity of the last emitted degradation alert (None if no active cooldown)
    last_emitted_severity: Optional[BitAlertSeverity] = field(default=None)
    # Timestamp when cooldown expires (0 = no active cooldown)
    cooldown_until: int = field(default=0)


class AlertManager:
    """Detects BIT status transitions and generates alerts.

    Alerting scheme:
    - On degradation (ok -> warn/fail): emit immediately, start 1-minute cooldown
    - During cooldown: only emit if severity escalates (warn -> fail), reset cooldown
    - Recovery alerts: always emitted (for DB storage) but don't affect cooldown
    """

    def __init__(self) -> None:
        self._test_states: dict[str, TestState] = {}
        self._test_names: dict[str, str] = {}  # test_id -> name cache
        self._event_bus: Optional[EventBus] = None

    def set_event_bus(self, event_bus: EventBus) -> None:
        """Set the event bus for publishing alerts"""
        self._event_bus = event_bus

    async def handle_result(self, result: BitResult) -> None:
        """Process BIT result and detect status transitions"""
        now = result.timestamp

        for test in result.tests:
            # Cache test name
            self._test_names[test.id] = test.name

            state = self._test_states.get(test.id)

            if state is None:
                # First time seeing this test
                state = TestState(status=test.status)
                self._test_states[test.id] = state

                # If starting in a degraded/failed state, treat as if transitioning from OK
                if test.status in (BitStatus.warn, BitStatus.fail):
                    alert = self._create_alert(
                        test_id=test.id,
                        test_name=test.name,
                        prev_status=BitStatus.ok,
                        new_status=test.status,
                        timestamp=now,
                    )
                    if alert:
                        await self._emit_alert(alert)
                        state.last_emitted_severity = alert.severity
                        state.cooldown_until = now + COOLDOWN_MS
                continue

            # Status unchanged - nothing to do
            if test.status == state.status:
                continue

            # Status changed - create alert
            old_status = state.status
            state.status = test.status

            alert = self._create_alert(
                test_id=test.id,
                test_name=test.name,
                prev_status=old_status,
                new_status=test.status,
                timestamp=now,
            )

            if alert is None:
                continue

            if alert.severity == BitAlertSeverity.recovered:
                # Recovery: always emit (for DB analysis) but don't affect cooldown
                await self._emit_alert(alert)
            else:
                # Degradation (warn or fail)
                in_cooldown = now < state.cooldown_until

                should_emit = False
                if not in_cooldown:
                    # No active cooldown - emit immediately
                    should_emit = True
                elif self._is_more_severe(alert.severity, state.last_emitted_severity):
                    # In cooldown but severity escalated - emit and reset cooldown
                    should_emit = True

                if should_emit:
                    await self._emit_alert(alert)
                    state.last_emitted_severity = alert.severity
                    state.cooldown_until = now + COOLDOWN_MS

    def _create_alert(
        self,
        test_id: str,
        test_name: str,
        prev_status: BitStatus,
        new_status: BitStatus,
        timestamp: int,
    ) -> Optional[BitAlert]:
        """Create an alert for a status transition"""
        severity = self._determine_severity(prev_status, new_status)

        if severity is None:
            return None

        message = self._create_message(test_name, severity)

        return BitAlert(
            id=0,  # Will be set by database
            timestamp=timestamp,
            testId=test_id,
            testName=test_name,
            previousStatus=prev_status,
            newStatus=new_status,
            severity=severity,
            message=message,
        )

    def _is_more_severe(self, new: BitAlertSeverity, existing: Optional[BitAlertSeverity]) -> bool:
        """Return True if new severity is higher priority than existing"""
        if existing is None:
            return True
        return SEVERITY_PRIORITY[new] > SEVERITY_PRIORITY[existing]

    def _determine_severity(
        self, prev_status: BitStatus, new_status: BitStatus
    ) -> Optional[BitAlertSeverity]:
        """Determine alert severity based on status transition"""
        # Any status -> fail = failed
        if new_status == BitStatus.fail:
            return BitAlertSeverity.failed

        # ok -> warn = degraded
        if prev_status == BitStatus.ok and new_status == BitStatus.warn:
            return BitAlertSeverity.degraded

        # fail or warn -> ok = recovered
        if new_status == BitStatus.ok and prev_status in (BitStatus.fail, BitStatus.warn):
            return BitAlertSeverity.recovered

        return None

    def _create_message(self, test_name: str, severity: BitAlertSeverity) -> str:
        """Create human-readable alert message"""
        if severity == BitAlertSeverity.failed:
            return f"{test_name} test failed"
        elif severity == BitAlertSeverity.degraded:
            return f"{test_name} degraded to warning"
        elif severity == BitAlertSeverity.recovered:
            return f"{test_name} recovered"
        return f"{test_name} status changed"

    async def _emit_alert(self, alert: BitAlert) -> None:
        """Emit alert to event bus"""
        if self._event_bus is None:
            logger.warning("No event bus configured, cannot emit alert")
            return
        logger.info(f"Alert: [{alert.severity}] {alert.message}")
        await self._event_bus.publish(Topic.BIT_ALERT, alert)

    def clear(self) -> None:
        """Clear all state (useful for testing)"""
        self._test_states.clear()
        self._test_names.clear()
