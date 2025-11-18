"""Global registry for data sources."""

import asyncio
import logging
from typing import Dict, List, Optional

from app.models.generated import DataSource as DataSourceModel
from app.models.generated import Status
from app.sources.base import DataSource

logger = logging.getLogger(__name__)


class SourceManager:
    """
    Global registry of all data sources.

    Manages source lifecycle and client subscriptions.
    """

    def __init__(self) -> None:
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

    async def list_all(self) -> List[DataSourceModel]:
        """
        List all available sources.

        Returns:
            List of source information models
        """
        async with self._lock:
            return [
                DataSourceModel(
                    id=source.id,
                    name=source.name,
                    type=source.metadata.get("type", "spectral"),
                    typeLabel=source.metadata.get("type_label", "Spectral"),
                    centerFrequency=source.metadata.get("centerFrequency", 0),
                    sampleRate=source.metadata.get("sampleRate", 0),
                    status=(Status.active if source.is_attached else Status.idle),
                    parentTaskId=source.metadata.get("parentTaskId"),
                    subscriberCount=source.subscriber_count,
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
