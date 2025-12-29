"""
Unit tests for BIT infrastructure components.

Tests BitStorage and AlertManager.
"""

import tempfile
import time

import pytest

from app.config.settings import Settings
from app.core.bit_storage import BitStorage
from app.core.event_bus import EventBus, Topic
from app.handlers.alert_manager import AlertManager, COOLDOWN_MS
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

    # Determine overall status based on worst case
    if fail > 0:
        overall_status = BitStatus.fail
    elif warn > 0:
        overall_status = BitStatus.warn
    else:
        overall_status = BitStatus.ok

    return BitResult(
        timestamp=timestamp,
        overallStatus=overall_status,
        summary=BitSummary(total=len(tests), ok=ok, warn=warn, fail=fail),
        tests=tests,
        functionTree=BitTreeNode(id="root", name="Root", status=overall_status),
        hardwareTree=BitTreeNode(id="root", name="Root", status=overall_status),
    )


@pytest.fixture
def temp_storage():
    """Create a BitStorage with a temporary database"""
    with tempfile.TemporaryDirectory() as tmpdir:
        settings = Settings(
            bit_db_path=tmpdir,
            bit_rotation_hours=24,
            bit_max_file_size_mb=100,
            bit_max_files=7,
        )
        storage = BitStorage(settings)
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
    """Verify metrics are calculated correctly from time-weighted rollups"""
    # Use current time so snapshots fall within the metrics window
    now = int(time.time() * 1000)

    # Store snapshots: 3 ok intervals, 1 degraded interval, then a final fail snapshot
    for i, (ok, warn, fail) in enumerate([(5, 0, 0), (5, 0, 0), (5, 0, 0), (4, 1, 0), (4, 0, 1)]):
        result = create_test_result(timestamp=now + i * 1000, ok=ok, warn=warn, fail=fail)
        await temp_storage.handle_result(result)

    metrics = temp_storage.get_metrics(window_minutes=60)

    assert metrics.snapshot_count == 5
    # Time-weighted: 3s ok, 1s warn, 0s fail -> 75% ok
    assert metrics.operational_percent == 75.0


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
        overallStatus=status,
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
async def test_alert_manager_emits_failure_immediately():
    """Verify AlertManager emits failure alert immediately (no debounce delay)"""
    manager = AlertManager()
    bus = EventBus()
    manager.set_event_bus(bus)

    alerts: list[BitAlert] = []

    async def alert_handler(alert: BitAlert) -> None:
        alerts.append(alert)

    bus.subscribe(Topic.BIT_ALERT, alert_handler)

    now = 1000000

    # First result: ok
    await manager.handle_result(create_simple_result("test-1", BitStatus.ok, now))
    assert len(alerts) == 0  # First observation at ok, no alert

    # Second result: fail - should emit immediately
    await manager.handle_result(create_simple_result("test-1", BitStatus.fail, now + 1000))
    assert len(alerts) == 1
    assert alerts[0].severity == BitAlertSeverity.failed


@pytest.mark.asyncio
async def test_alert_manager_emits_degradation_immediately():
    """Verify AlertManager emits degradation alert immediately"""
    manager = AlertManager()
    bus = EventBus()
    manager.set_event_bus(bus)

    alerts: list[BitAlert] = []

    async def alert_handler(alert: BitAlert) -> None:
        alerts.append(alert)

    bus.subscribe(Topic.BIT_ALERT, alert_handler)

    now = 1000000

    await manager.handle_result(create_simple_result("test-1", BitStatus.ok, now))
    await manager.handle_result(create_simple_result("test-1", BitStatus.warn, now + 1000))

    assert len(alerts) == 1
    assert alerts[0].severity == BitAlertSeverity.degraded


@pytest.mark.asyncio
async def test_alert_manager_emits_recovery():
    """Verify AlertManager emits recovery alert for DB storage"""
    manager = AlertManager()
    bus = EventBus()
    manager.set_event_bus(bus)

    alerts: list[BitAlert] = []

    async def alert_handler(alert: BitAlert) -> None:
        alerts.append(alert)

    bus.subscribe(Topic.BIT_ALERT, alert_handler)

    now = 1000000

    # Start in failed state (first observation)
    await manager.handle_result(create_simple_result("test-1", BitStatus.fail, now))
    assert len(alerts) == 1  # Immediate failure alert

    # Recover
    await manager.handle_result(create_simple_result("test-1", BitStatus.ok, now + 1000))

    assert len(alerts) == 2
    assert [alert.severity for alert in alerts] == [
        BitAlertSeverity.failed,
        BitAlertSeverity.recovered,
    ]


@pytest.mark.asyncio
async def test_alert_manager_cooldown_suppresses_same_severity():
    """Verify repeated failures within cooldown are suppressed"""
    manager = AlertManager()
    bus = EventBus()
    manager.set_event_bus(bus)

    alerts: list[BitAlert] = []

    async def alert_handler(alert: BitAlert) -> None:
        alerts.append(alert)

    bus.subscribe(Topic.BIT_ALERT, alert_handler)

    now = 1000000

    # ok -> fail -> ok -> fail within cooldown
    await manager.handle_result(create_simple_result("test-1", BitStatus.ok, now))
    await manager.handle_result(create_simple_result("test-1", BitStatus.fail, now + 1000))
    await manager.handle_result(create_simple_result("test-1", BitStatus.ok, now + 2000))
    await manager.handle_result(create_simple_result("test-1", BitStatus.fail, now + 3000))

    # Should have: 1 failure (first), 1 recovery, no second failure (cooldown)
    assert len(alerts) == 2
    assert [alert.severity for alert in alerts] == [
        BitAlertSeverity.failed,
        BitAlertSeverity.recovered,
    ]


@pytest.mark.asyncio
async def test_alert_manager_cooldown_allows_escalation():
    """Verify warn -> fail escalation within cooldown still emits"""
    manager = AlertManager()
    bus = EventBus()
    manager.set_event_bus(bus)

    alerts: list[BitAlert] = []

    async def alert_handler(alert: BitAlert) -> None:
        alerts.append(alert)

    bus.subscribe(Topic.BIT_ALERT, alert_handler)

    now = 1000000

    # ok -> warn -> fail within cooldown
    await manager.handle_result(create_simple_result("test-1", BitStatus.ok, now))
    await manager.handle_result(create_simple_result("test-1", BitStatus.warn, now + 1000))
    await manager.handle_result(create_simple_result("test-1", BitStatus.fail, now + 2000))

    # Should have both: degraded (immediate), then failed (escalation)
    assert len(alerts) == 2
    assert [alert.severity for alert in alerts] == [
        BitAlertSeverity.degraded,
        BitAlertSeverity.failed,
    ]


@pytest.mark.asyncio
async def test_alert_manager_cooldown_resets_on_escalation():
    """Verify escalation resets cooldown timer"""
    manager = AlertManager()
    bus = EventBus()
    manager.set_event_bus(bus)

    alerts: list[BitAlert] = []

    async def alert_handler(alert: BitAlert) -> None:
        alerts.append(alert)

    bus.subscribe(Topic.BIT_ALERT, alert_handler)

    now = 1000000

    # warn at t=0, fail at t=30s (escalation resets cooldown)
    # ok at t=60s, fail at t=61s (within NEW cooldown from escalation)
    await manager.handle_result(create_simple_result("test-1", BitStatus.ok, now))
    await manager.handle_result(create_simple_result("test-1", BitStatus.warn, now + 1000))
    await manager.handle_result(create_simple_result("test-1", BitStatus.fail, now + 30000))
    await manager.handle_result(create_simple_result("test-1", BitStatus.ok, now + 60000))
    await manager.handle_result(create_simple_result("test-1", BitStatus.fail, now + 61000))

    # Should have: degraded, failed (escalation), recovery, NO second failure (cooldown)
    assert len(alerts) == 3
    assert [alert.severity for alert in alerts] == [
        BitAlertSeverity.degraded,
        BitAlertSeverity.failed,
        BitAlertSeverity.recovered,
    ]


@pytest.mark.asyncio
async def test_alert_manager_cooldown_expires():
    """Verify alerts emit again after cooldown expires"""
    manager = AlertManager()
    bus = EventBus()
    manager.set_event_bus(bus)

    alerts: list[BitAlert] = []

    async def alert_handler(alert: BitAlert) -> None:
        alerts.append(alert)

    bus.subscribe(Topic.BIT_ALERT, alert_handler)

    now = 1000000

    # First failure
    await manager.handle_result(create_simple_result("test-1", BitStatus.ok, now))
    await manager.handle_result(create_simple_result("test-1", BitStatus.fail, now + 1000))

    # Recovery and second failure AFTER cooldown expires
    await manager.handle_result(
        create_simple_result("test-1", BitStatus.ok, now + COOLDOWN_MS + 2000)
    )
    await manager.handle_result(
        create_simple_result("test-1", BitStatus.fail, now + COOLDOWN_MS + 3000)
    )

    # Should have all 4: failed, recovered, failed again, (no recovery yet)
    assert len(alerts) == 3
    assert [alert.severity for alert in alerts] == [
        BitAlertSeverity.failed,
        BitAlertSeverity.recovered,
        BitAlertSeverity.failed,
    ]


@pytest.mark.asyncio
async def test_alert_manager_first_observation_degraded():
    """Verify initial observation in degraded state emits immediately"""
    manager = AlertManager()
    bus = EventBus()
    manager.set_event_bus(bus)

    alerts: list[BitAlert] = []

    async def alert_handler(alert: BitAlert) -> None:
        alerts.append(alert)

    bus.subscribe(Topic.BIT_ALERT, alert_handler)

    now = 1000000

    # First observation is already failed
    await manager.handle_result(create_simple_result("test-1", BitStatus.fail, now))

    assert len(alerts) == 1
    assert alerts[0].severity == BitAlertSeverity.failed
    assert alerts[0].previous_status == BitStatus.ok  # Treated as transition from ok


@pytest.mark.asyncio
async def test_alert_manager_recovery_suppressed_without_open_alert():
    """Verify recovery is suppressed when corresponding failure was suppressed"""
    manager = AlertManager()
    bus = EventBus()
    manager.set_event_bus(bus)

    alerts: list[BitAlert] = []

    async def alert_handler(alert: BitAlert) -> None:
        alerts.append(alert)

    bus.subscribe(Topic.BIT_ALERT, alert_handler)

    now = 1000000

    # fail -> ok -> fail (suppressed) -> ok (should also be suppressed)
    await manager.handle_result(create_simple_result("test-1", BitStatus.ok, now))
    await manager.handle_result(create_simple_result("test-1", BitStatus.fail, now + 1000))
    await manager.handle_result(create_simple_result("test-1", BitStatus.ok, now + 2000))
    await manager.handle_result(create_simple_result("test-1", BitStatus.fail, now + 3000))
    await manager.handle_result(create_simple_result("test-1", BitStatus.ok, now + 4000))

    # Should have: failed, recovered (first pair), then both suppressed
    assert len(alerts) == 2
    assert [alert.severity for alert in alerts] == [
        BitAlertSeverity.failed,
        BitAlertSeverity.recovered,
    ]
