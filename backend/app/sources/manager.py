"""Global registry for data sources."""

import asyncio
import logging
from typing import Dict, List, Optional

from app.sources.base import DataSource
from app.sources.types import DataSourceInfo, SourceStatus

logger = logging.getLogger(__name__)


class SourceManager:
    """
    Global registry of all data sources.

    Manages source lifecycle and client subscriptions.
    """

    def __init__(self):
        self._sources: Dict[str, DataSource] = {}
        self._lock = asyncio.Lock()

    async def register(self, source: DataSource) -> None:
        """
        Register a new data source.

        Makes the source available for subscription.

        Args:
            source: DataSource to register
        """
        async with self._lock:
            if source.id in self._sources:
                logger.warning(f"Source {source.id} already registered, replacing")
            self._sources[source.id] = source
            logger.info(f"Registered source: {source.id} ({source.name})")

    async def unregister(self, source_id: str) -> None:
        """
        Unregister a data source.

        Detaches and removes the source from the registry.

        Args:
            source_id: ID of source to remove
        """
        async with self._lock:
            source = self._sources.pop(source_id, None)

        if source:
            # Detach if still attached
            if source.is_attached:
                await source._detach()
            logger.info(f"Unregistered source: {source_id}")
        else:
            logger.warning(f"Source {source_id} not found for unregistration")

    async def get(self, source_id: str) -> Optional[DataSource]:
        """
        Get a source by ID.

        Args:
            source_id: Source ID

        Returns:
            DataSource if found, None otherwise
        """
        async with self._lock:
            return self._sources.get(source_id)

    async def list_all(self) -> List[DataSourceInfo]:
        """
        List all available sources.

        Returns:
            List of source information dicts
        """
        async with self._lock:
            return [
                DataSourceInfo(
                    id=source.id,
                    name=source.name,
                    type=source.metadata.get("type", "raw"),
                    type_label=source.metadata.get("type_label", "Raw"),
                    center_frequency=source.metadata.get("centerFrequency", 0),
                    sample_rate=source.metadata.get("sampleRate", 0),
                    status=(SourceStatus.ACTIVE if source.is_attached else SourceStatus.IDLE),
                    parent_task_id=source.metadata.get("parentTaskId"),
                    subscriber_count=source.subscriber_count,
                )
                for source in self._sources.values()
            ]

    async def subscribe_client(self, source_id: str, client_queue: asyncio.Queue) -> bool:
        """
        Subscribe a client to a source.

        Args:
            source_id: ID of source to subscribe to
            client_queue: Queue to receive data

        Returns:
            True if successful, False if source not found
        """
        source = await self.get(source_id)
        if not source:
            logger.warning(f"Cannot subscribe to source {source_id}: not found")
            return False

        await source.subscribe(client_queue)
        return True

    async def unsubscribe_client(self, source_id: str, client_queue: asyncio.Queue) -> None:
        """
        Unsubscribe a client from a source.

        Args:
            source_id: ID of source to unsubscribe from
            client_queue: Queue to remove
        """
        source = await self.get(source_id)
        if source:
            await source.unsubscribe(client_queue)


# Global singleton instance
source_manager = SourceManager()
