"""
Unit tests for EventBus pub/sub system.
"""

import pytest

from app.core.event_bus import EventBus, Topic


@pytest.mark.asyncio
async def test_event_bus_subscribe_and_publish():
    """Verify handlers receive published events"""
    bus = EventBus()
    received = []

    async def handler(event: str) -> None:
        received.append(event)

    bus.subscribe(Topic.BIT_RESULT, handler)
    await bus.publish(Topic.BIT_RESULT, "test-event")

    assert received == ["test-event"]


@pytest.mark.asyncio
async def test_event_bus_multiple_subscribers():
    """Verify multiple handlers receive the same event"""
    bus = EventBus()
    received_a = []
    received_b = []

    async def handler_a(event: str) -> None:
        received_a.append(event)

    async def handler_b(event: str) -> None:
        received_b.append(event)

    bus.subscribe(Topic.BIT_ALERT, handler_a)
    bus.subscribe(Topic.BIT_ALERT, handler_b)
    await bus.publish(Topic.BIT_ALERT, "shared-event")

    assert received_a == ["shared-event"]
    assert received_b == ["shared-event"]


@pytest.mark.asyncio
async def test_event_bus_unsubscribe():
    """Verify unsubscribe stops event delivery"""
    bus = EventBus()
    received = []

    async def handler(event: str) -> None:
        received.append(event)

    unsubscribe = bus.subscribe(Topic.BIT_RESULT, handler)
    await bus.publish(Topic.BIT_RESULT, "first")

    unsubscribe()
    await bus.publish(Topic.BIT_RESULT, "second")

    assert received == ["first"]


@pytest.mark.asyncio
async def test_event_bus_topic_isolation():
    """Verify events only reach handlers subscribed to that topic"""
    bus = EventBus()
    result_events = []
    alert_events = []

    async def result_handler(event: str) -> None:
        result_events.append(event)

    async def alert_handler(event: str) -> None:
        alert_events.append(event)

    bus.subscribe(Topic.BIT_RESULT, result_handler)
    bus.subscribe(Topic.BIT_ALERT, alert_handler)

    await bus.publish(Topic.BIT_RESULT, "result-only")
    await bus.publish(Topic.BIT_ALERT, "alert-only")

    assert result_events == ["result-only"]
    assert alert_events == ["alert-only"]


@pytest.mark.asyncio
async def test_event_bus_handler_exception_does_not_stop_others():
    """Verify one handler throwing doesn't prevent other handlers"""
    bus = EventBus()
    received = []

    async def failing_handler(event: str) -> None:
        raise ValueError("intentional failure")

    async def working_handler(event: str) -> None:
        received.append(event)

    bus.subscribe(Topic.BIT_RESULT, failing_handler)
    bus.subscribe(Topic.BIT_RESULT, working_handler)

    # Should not raise, should still call working handler
    await bus.publish(Topic.BIT_RESULT, "test")

    assert received == ["test"]
