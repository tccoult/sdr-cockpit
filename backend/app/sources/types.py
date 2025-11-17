"""Type definitions for data sources."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class SourceType(str, Enum):
    """Type of data source."""

    RAW = "raw"  # Raw IQ from RX task
    DETECTOR = "detector"  # Detector output (energy, matched filter, etc.)
    DEMODULATOR = "demodulator"  # Demodulated data (FM, BPSK, etc.)
    EXTERNAL = "external"  # External stream


class SourceStatus(str, Enum):
    """Status of a data source."""

    IDLE = "idle"  # Registered but not attached
    ACTIVE = "active"  # Attached and producing data
    ERROR = "error"  # Error state


class DataSourceInfo(BaseModel):
    """Information about an available data source."""

    id: str
    name: str
    type: SourceType
    type_label: str  # Short label for UI (e.g., "Raw", "Det", "Demod")
    center_frequency: float  # Hz
    sample_rate: float  # Hz
    status: SourceStatus
    parent_task_id: Optional[str] = None  # If this is a task output
    subscriber_count: int = 0  # Number of active subscribers
