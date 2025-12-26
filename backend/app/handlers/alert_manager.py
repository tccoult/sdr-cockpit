"""Alert detection for BIT status transitions"""

import logging
from dataclasses import dataclass
from typing import Optional

from app.core.event_bus import Topic, event_bus
from app.core.bit_storage import BitAlert
from app.models.generated import BitResult, BitStatus

logger = logging.getLogger(__name__)

# Debounce window in milliseconds
DEBOUNCE_WINDOW_MS = 30_000  # 30 seconds


@dataclass
class TestState:
    """Tracked state for a single test"""

    status: BitStatus
    last_change: int  # Timestamp of last status change
    pending_alert: Optional[BitAlert]  # Alert waiting for debounce window


class AlertManager:
    """Detects BIT status transitions and generates alerts with debouncing"""

    def __init__(self) -> None:
        self._test_states: dict[str, TestState] = {}
        self._test_names: dict[str, str] = {}  # test_id -> name cache

    async def handle_result(self, result: BitResult) -> None:
        """Process BIT result and detect status transitions"""
        now = result.timestamp

        for test in result.tests:
            # Cache test name
            self._test_names[test.id] = test.name

            prev_state = self._test_states.get(test.id)

            if prev_state is None:
                # First time seeing this test - initialize state, no alert
                self._test_states[test.id] = TestState(
                    status=test.status, last_change=now, pending_alert=None
                )
                continue

            # Check if status changed
            if test.status != prev_state.status:
                alert = self._create_alert(
                    test_id=test.id,
                    test_name=test.name,
                    prev_status=prev_state.status,
                    new_status=test.status,
                    timestamp=now,
                )

                if alert:
                    # Check debounce - if there's a pending alert within window, replace it
                    if (
                        prev_state.pending_alert
                        and now - prev_state.last_change < DEBOUNCE_WINDOW_MS
                    ):
                        # Replace pending alert with new one
                        logger.debug(
                            f"Replacing pending alert for {test.id}: "
                            f"{prev_state.pending_alert.severity} -> {alert.severity}"
                        )
                        prev_state.pending_alert = alert
                        prev_state.status = test.status
                        prev_state.last_change = now
                    else:
                        # Emit any pending alert first
                        if prev_state.pending_alert:
                            await self._emit_alert(prev_state.pending_alert)

                        # Set new pending alert
                        prev_state.pending_alert = alert
                        prev_state.status = test.status
                        prev_state.last_change = now

            # Check if pending alerts have passed debounce window
            if prev_state.pending_alert and now - prev_state.last_change >= DEBOUNCE_WINDOW_MS:
                await self._emit_alert(prev_state.pending_alert)
                prev_state.pending_alert = None

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
            # No alert for this transition (e.g., unknown -> unknown)
            return None

        message = self._create_message(test_name, severity)

        return BitAlert(
            id=0,  # Will be set by database
            timestamp=timestamp,
            test_id=test_id,
            test_name=test_name,
            previous_status=prev_status.value,
            new_status=new_status.value,
            severity=severity,
            message=message,
        )

    def _determine_severity(self, prev_status: BitStatus, new_status: BitStatus) -> Optional[str]:
        """Determine alert severity based on status transition"""
        # Any status -> fail = failed
        if new_status == BitStatus.fail:
            return "failed"

        # ok -> warn = degraded
        if prev_status == BitStatus.ok and new_status == BitStatus.warn:
            return "degraded"

        # fail or warn -> ok = recovered
        if new_status == BitStatus.ok and prev_status in (BitStatus.fail, BitStatus.warn):
            return "recovered"

        # All other transitions (e.g., unknown -> ok, warn -> fail) don't generate alerts
        # Actually, warn -> fail should be "failed", which is already covered
        return None

    def _create_message(self, test_name: str, severity: str) -> str:
        """Create human-readable alert message"""
        if severity == "failed":
            return f"{test_name} test failed"
        elif severity == "degraded":
            return f"{test_name} degraded to warning"
        elif severity == "recovered":
            return f"{test_name} recovered"
        return f"{test_name} status changed"

    async def _emit_alert(self, alert: BitAlert) -> None:
        """Emit alert to event bus"""
        logger.info(f"Alert: [{alert.severity}] {alert.message}")
        await event_bus.publish(Topic.BIT_ALERT, alert)

    async def flush_pending(self) -> None:
        """Flush all pending alerts (useful for shutdown)"""
        for state in self._test_states.values():
            if state.pending_alert:
                await self._emit_alert(state.pending_alert)
                state.pending_alert = None

    def clear(self) -> None:
        """Clear all state (useful for testing)"""
        self._test_states.clear()
        self._test_names.clear()


# Module-level instance
alert_manager: Optional[AlertManager] = None


def get_alert_manager() -> AlertManager:
    """Get the alert manager instance"""
    if alert_manager is None:
        raise RuntimeError("AlertManager not initialized")
    return alert_manager


async def init_alert_manager() -> AlertManager:
    """Initialize the alert manager and subscribe to events"""
    global alert_manager
    alert_manager = AlertManager()

    # Subscribe to BIT results
    event_bus.subscribe(Topic.BIT_RESULT, alert_manager.handle_result)

    logger.info("AlertManager initialized and subscribed to events")
    return alert_manager
