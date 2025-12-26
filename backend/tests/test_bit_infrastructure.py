"""
Unit tests for BIT infrastructure components.

Tests BitStorage and AlertManager.
"""

import tempfile
import time
from pathlib import Path

import pytest

from app.core.bit_storage import BitStorage
from app.core.event_bus import EventBus, Topic
from app.handlers.alert_manager import AlertManager, DEBOUNCE_WINDOW_MS
from app.models.generated import (
    BitAlert,
    BitAlertSeverity,
    BitResult,
    BitStatus,
    BitSummary,
    BitTest,
    BitTreeNode,
)


# --- BitStorage Tests ---


def create_test_result(timestamp: int, ok: int = 5, warn: int = 0, fail: int = 0) -> BitResult:
    """Helper to create a BitResult for testing"""
    tests = [
        BitTest(
            id=f"test-{i}",
            name=f"Test {i}",
            status=BitStatus.ok,
            lastRun=timestamp,
            durationMs=100,
        )
        for i in range(ok + warn + fail)
    ]

    # Set statuses based on counts
    for i in range(ok, ok + warn):
        tests[i] = BitTest(
            id=f"test-{i}",
            name=f"Test {i}",
            status=BitStatus.warn,
            lastRun=timestamp,
            durationMs=100,
        )
    for i in range(ok + warn, ok + warn + fail):
        tests[i] = BitTest(
            id=f"test-{i}",
            name=f"Test {i}",
            status=BitStatus.fail,
            lastRun=timestamp,
            durationMs=100,
        )

    return BitResult(
        timestamp=timestamp,
        summary=BitSummary(total=len(tests), ok=ok, warn=warn, fail=fail),
        tests=tests,
        functionTree=BitTreeNode(id="root", name="Root", status=BitStatus.ok),
        hardwareTree=BitTreeNode(id="root", name="Root", status=BitStatus.ok),
    )


@pytest.fixture
def temp_storage():
    """Create a BitStorage with a temporary database"""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test.db"
        storage = BitStorage(db_path=db_path)
        yield storage


@pytest.mark.asyncio
async def test_bit_storage_stores_result(temp_storage):
    """Verify results are stored and can be retrieved via metrics"""
    result = create_test_result(timestamp=1000000, ok=5, warn=1, fail=0)
    await temp_storage.handle_result(result)

    # latest_result should be cached
    assert temp_storage.latest_result is not None
    assert temp_storage.latest_result.timestamp == 1000000


@pytest.mark.asyncio
async def test_bit_storage_stores_and_retrieves_alerts(temp_storage):
    """Verify alerts are stored and can be retrieved"""
    alert = BitAlert(
        id=0,
        timestamp=1000000,
        testId="test-1",
        testName="Test 1",
        previousStatus=BitStatus.ok,
        newStatus=BitStatus.fail,
        severity=BitAlertSeverity.failed,
        message="Test 1 failed",
    )

    await temp_storage.handle_alert(alert)

    alerts, total = temp_storage.get_alerts(since=0, limit=10)
    assert total == 1
    assert len(alerts) == 1
    assert alerts[0].test_id == "test-1"
    assert alerts[0].severity == BitAlertSeverity.failed


@pytest.mark.asyncio
async def test_bit_storage_get_alerts_respects_since(temp_storage):
    """Verify since parameter filters alerts correctly"""
    # Create alerts at different timestamps
    for i, ts in enumerate([100, 200, 300]):
        alert = BitAlert(
            id=0,
            timestamp=ts,
            testId=f"test-{i}",
            testName=f"Test {i}",
            previousStatus=BitStatus.ok,
            newStatus=BitStatus.fail,
            severity=BitAlertSeverity.failed,
            message=f"Test {i} failed",
        )
        await temp_storage.handle_alert(alert)

    # Get alerts since 200
    alerts, total = temp_storage.get_alerts(since=200, limit=10)
    assert total == 2  # 200 and 300
    assert len(alerts) == 2


@pytest.mark.asyncio
async def test_bit_storage_metrics_calculation(temp_storage):
    """Verify metrics are calculated correctly from snapshots"""
    # Use current time so snapshots fall within the metrics window
    now = int(time.time() * 1000)

    # Store snapshots: 3 ok, 1 degraded, 1 failed
    for i, (ok, warn, fail) in enumerate([(5, 0, 0), (5, 0, 0), (5, 0, 0), (4, 1, 0), (4, 0, 1)]):
        result = create_test_result(timestamp=now + i * 1000, ok=ok, warn=warn, fail=fail)
        await temp_storage.handle_result(result)

    metrics = temp_storage.get_metrics(window_minutes=60)

    assert metrics.snapshot_count == 5
    # 3 fully ok out of 5 = 60%
    assert metrics.uptime_percent == 60.0


@pytest.mark.asyncio
async def test_bit_storage_test_history(temp_storage):
    """Verify test history retrieval works"""
    now = 1000000
    test_id = "test-0"

    # Store 3 snapshots with the same test
    for i in range(3):
        result = create_test_result(timestamp=now + i * 1000, ok=1)
        await temp_storage.handle_result(result)

    history = temp_storage.get_test_history(test_id=test_id, since=0, until=now + 10000)
    assert len(history) == 3
    assert all(p.status == BitStatus.ok for p in history)


# --- AlertManager Tests ---


def create_simple_result(test_id: str, status: BitStatus, timestamp: int) -> BitResult:
    """Helper to create a simple BitResult with one test"""
    return BitResult(
        timestamp=timestamp,
        summary=BitSummary(
            total=1,
            ok=1 if status == BitStatus.ok else 0,
            warn=1 if status == BitStatus.warn else 0,
            fail=1 if status == BitStatus.fail else 0,
        ),
        tests=[
            BitTest(
                id=test_id,
                name=f"Test {test_id}",
                status=status,
                lastRun=timestamp,
                durationMs=100,
            )
        ],
        functionTree=BitTreeNode(id="root", name="Root", status=status),
        hardwareTree=BitTreeNode(id="root", name="Root", status=status),
    )


@pytest.mark.asyncio
async def test_alert_manager_detects_failure():
    """Verify AlertManager detects ok -> fail transition after debounce"""
    manager = AlertManager()
    bus = EventBus()
    manager.set_event_bus(bus)

    alerts = []

    async def alert_handler(alert: BitAlert) -> None:
        alerts.append(alert)

    bus.subscribe(Topic.BIT_ALERT, alert_handler)

    now = 1000000

    # First result: ok
    await manager.handle_result(create_simple_result("test-1", BitStatus.ok, now))
    assert len(alerts) == 0  # First observation, no alert

    # Second result: fail (triggers pending alert)
    await manager.handle_result(create_simple_result("test-1", BitStatus.fail, now + 1000))
    assert len(alerts) == 0  # Pending, not yet emitted (within debounce window)

    # Third result: still fail, past debounce window
    await manager.handle_result(
        create_simple_result("test-1", BitStatus.fail, now + DEBOUNCE_WINDOW_MS + 1000)
    )
    assert len(alerts) == 1
    assert alerts[0].severity == BitAlertSeverity.failed


@pytest.mark.asyncio
async def test_alert_manager_detects_degradation():
    """Verify AlertManager detects ok -> warn transition"""
    manager = AlertManager()
    bus = EventBus()
    manager.set_event_bus(bus)

    alerts = []

    async def alert_handler(alert: BitAlert) -> None:
        alerts.append(alert)

    bus.subscribe(Topic.BIT_ALERT, alert_handler)

    now = 1000000

    await manager.handle_result(create_simple_result("test-1", BitStatus.ok, now))
    await manager.handle_result(create_simple_result("test-1", BitStatus.warn, now + 1000))
    await manager.handle_result(
        create_simple_result("test-1", BitStatus.warn, now + DEBOUNCE_WINDOW_MS + 1000)
    )

    assert len(alerts) == 1
    assert alerts[0].severity == BitAlertSeverity.degraded


@pytest.mark.asyncio
async def test_alert_manager_detects_recovery():
    """Verify AlertManager detects fail -> ok transition"""
    manager = AlertManager()
    bus = EventBus()
    manager.set_event_bus(bus)

    alerts = []

    async def alert_handler(alert: BitAlert) -> None:
        alerts.append(alert)

    bus.subscribe(Topic.BIT_ALERT, alert_handler)

    now = 1000000

    await manager.handle_result(create_simple_result("test-1", BitStatus.fail, now))
    await manager.handle_result(create_simple_result("test-1", BitStatus.ok, now + 1000))
    await manager.handle_result(
        create_simple_result("test-1", BitStatus.ok, now + DEBOUNCE_WINDOW_MS + 1000)
    )

    assert len(alerts) == 1
    assert alerts[0].severity == BitAlertSeverity.recovered


@pytest.mark.asyncio
async def test_alert_manager_debounce_replaces_pending():
    """Verify rapid status changes result in single alert for final state"""
    manager = AlertManager()
    bus = EventBus()
    manager.set_event_bus(bus)

    alerts = []

    async def alert_handler(alert: BitAlert) -> None:
        alerts.append(alert)

    bus.subscribe(Topic.BIT_ALERT, alert_handler)

    now = 1000000

    # ok -> fail -> ok within debounce window
    await manager.handle_result(create_simple_result("test-1", BitStatus.ok, now))
    await manager.handle_result(create_simple_result("test-1", BitStatus.fail, now + 1000))
    await manager.handle_result(create_simple_result("test-1", BitStatus.ok, now + 2000))

    # Past debounce window
    await manager.handle_result(
        create_simple_result("test-1", BitStatus.ok, now + DEBOUNCE_WINDOW_MS + 3000)
    )

    # Should only have recovery alert (the final state change)
    assert len(alerts) == 1
    assert alerts[0].severity == BitAlertSeverity.recovered


@pytest.mark.asyncio
async def test_alert_manager_flush_pending():
    """Verify flush_pending emits all pending alerts"""
    manager = AlertManager()
    bus = EventBus()
    manager.set_event_bus(bus)

    alerts = []

    async def alert_handler(alert: BitAlert) -> None:
        alerts.append(alert)

    bus.subscribe(Topic.BIT_ALERT, alert_handler)

    now = 1000000

    # Create pending alerts
    await manager.handle_result(create_simple_result("test-1", BitStatus.ok, now))
    await manager.handle_result(create_simple_result("test-1", BitStatus.fail, now + 1000))

    assert len(alerts) == 0  # Still pending

    await manager.flush_pending()

    assert len(alerts) == 1
    assert alerts[0].severity == BitAlertSeverity.failed
