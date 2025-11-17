"""Base class for data sources that produce streaming data."""

import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Dict, Optional, Set

logger = logging.getLogger(__name__)

# Configuration
CLIENT_QUEUE_SIZE = 5  # Number of frames to buffer per client


class DataSource(ABC):
    """
    Abstract base class for any source that produces streaming data.

    Handles subscriber management, attachment lifecycle, and data multiplexing.
    Subclasses implement _produce_loop() to generate data.
    """

    def __init__(self, source_id: str, name: str, metadata: Dict):
        """
        Initialize a data source.

        Args:
            source_id: Unique identifier for this source
            name: Human-readable name
            metadata: Dict with centerFrequency, sampleRate, type, etc.
        """
        self.id = source_id
        self.name = name
        self.metadata = metadata

        # Subscriber management
        self._subscribers: Set[asyncio.Queue] = set()
        self._lock = asyncio.Lock()

        # Production state
        self._attached = False
        self._task: Optional[asyncio.Task] = None

    @property
    def is_attached(self) -> bool:
        """Whether this source is currently attached and producing data."""
        return self._attached

    @property
    def subscriber_count(self) -> int:
        """Number of active subscribers."""
        return len(self._subscribers)

    async def subscribe(self, queue: asyncio.Queue) -> None:
        """
        Add a subscriber queue.

        Auto-attaches if this is the first subscriber.

        Args:
            queue: Asyncio queue to receive serialized data
        """
        async with self._lock:
            self._subscribers.add(queue)
            subscriber_count = len(self._subscribers)

        logger.info(f"Source {self.id}: Added subscriber (total: {subscriber_count})")

        # Auto-attach on first subscriber
        if subscriber_count == 1:
            await self._attach()

    async def unsubscribe(self, queue: asyncio.Queue) -> None:
        """
        Remove a subscriber queue.

        Auto-detaches if this is the last subscriber.

        Args:
            queue: Queue to remove
        """
        async with self._lock:
            self._subscribers.discard(queue)
            subscriber_count = len(self._subscribers)

        logger.info(f"Source {self.id}: Removed subscriber (remaining: {subscriber_count})")

        # Auto-detach when no subscribers left
        if subscriber_count == 0:
            await self._detach()

    async def publish(self, data: bytes) -> None:
        """
        Send serialized data to all subscribers (non-blocking).

        Handles backpressure by dropping old frames from full queues.

        Args:
            data: Serialized/compressed data to send
        """
        async with self._lock:
            dead_queues = set()

            for queue in self._subscribers:
                try:
                    # Non-blocking put
                    queue.put_nowait(data)
                except asyncio.QueueFull:
                    # Queue is full - drop oldest frame and push new one
                    try:
                        queue.get_nowait()  # Drop old frame
                        queue.put_nowait(data)  # Push new frame
                        logger.debug(f"Source {self.id}: Queue overflow, dropped old frame")
                    except (asyncio.QueueEmpty, asyncio.QueueFull):
                        # Queue is dead or still can't fit - mark for removal
                        dead_queues.add(queue)
                        logger.warning(f"Source {self.id}: Marking dead queue for removal")

            # Remove dead clients
            if dead_queues:
                self._subscribers -= dead_queues
                logger.warning(f"Source {self.id}: Removed {len(dead_queues)} dead queues")

    async def _attach(self) -> None:
        """Attach to data provider and start producing."""
        if self._attached:
            return

        logger.info(f"Source {self.id}: Attaching...")
        self._attached = True
        self._task = asyncio.create_task(self._produce_loop())
        logger.info(f"Source {self.id}: Attached and producing")

    async def _detach(self) -> None:
        """Detach from data provider and stop producing."""
        if not self._attached:
            return

        logger.info(f"Source {self.id}: Detaching...")
        self._attached = False

        # Cancel production task
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

        logger.info(f"Source {self.id}: Detached")

    @abstractmethod
    async def _produce_loop(self) -> None:
        """
        Override this to generate and publish data.

        Should loop while self._attached is True, calling self.publish(data)
        with serialized/compressed data.

        Example:
            while self._attached:
                data = await self._generate_data()
                serialized = self._serialize(data)
                await self.publish(serialized)
                await asyncio.sleep(1.0 / fps)
        """
        pass
