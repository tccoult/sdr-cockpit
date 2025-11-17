"""Data source abstraction for streaming data multiplexing."""

from app.sources.base import DataSource
from app.sources.manager import SourceManager, source_manager
from app.sources.task_source import MockTaskDataSource

__all__ = [
    "DataSource",
    "SourceManager",
    "source_manager",
    "MockTaskDataSource",
]
