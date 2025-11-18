"""API endpoints for data sources."""

import logging
from typing import List

from fastapi import APIRouter

from app.models.generated import DataSource
from app.sources import source_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sources", tags=["sources"])


@router.get("/", response_model=List[DataSource])
async def list_sources() -> List[DataSource]:
    """
    List all available data sources.

    Returns:
        List of data source information including ID, name, type, frequency, etc.
    """
    sources = await source_manager.list_all()
    logger.debug(f"Listed {len(sources)} data sources")
    return sources
