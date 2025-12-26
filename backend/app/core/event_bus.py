"""Central pub/sub event bus for internal communication"""

import asyncio
import logging
from enum import StrEnum
from typing import Any, Awaitable, Callable

logger = logging.getLogger(__name__)

Handler = Callable[[Any], Awaitable[None]]


class Topic(StrEnum):
    """Event topics for the event bus"""

    BIT_RESULT = "bit.result"
    BIT_ALERT = "bit.alert"


class EventBus:
    """Simple async pub/sub event bus with topic-based routing"""

    def __init__(self) -> None:
        self._subscribers: dict[Topic, list[Handler]] = {}
        self._lock = asyncio.Lock()

    def subscribe(self, topic: Topic, handler: Handler) -> Callable[[], None]:
        """
        Subscribe a handler to a topic.

        Returns an unsubscribe function.
        """
        if topic not in self._subscribers:
            self._subscribers[topic] = []

        self._subscribers[topic].append(handler)
        logger.debug(f"Subscribed handler to {topic}")

        def unsubscribe() -> None:
            if topic in self._subscribers and handler in self._subscribers[topic]:
                self._subscribers[topic].remove(handler)
                logger.debug(f"Unsubscribed handler from {topic}")

        return unsubscribe

    async def publish(self, topic: Topic, event: Any) -> None:
        """
        Publish an event to all subscribers of a topic.

        Handlers are called concurrently. Exceptions in handlers are logged
        but don't prevent other handlers from executing.
        """
        handlers = self._subscribers.get(topic, [])
        if not handlers:
            return

        results = await asyncio.gather(
            *[self._safe_call(h, event, topic) for h in handlers],
            return_exceptions=True,
        )

        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Handler exception on {topic}: {result}")

    async def _safe_call(self, handler: Handler, event: Any, topic: Topic) -> None:
        """Call a handler with error handling"""
        try:
            await handler(event)
        except Exception as e:
            logger.exception(f"Error in handler for {topic}: {e}")
            raise

    def clear(self) -> None:
        """Remove all subscribers (useful for testing)"""
        self._subscribers.clear()


# Global singleton instance
event_bus = EventBus()
