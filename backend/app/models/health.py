"""Health (BIT) models matching frontend TypeScript interfaces"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class BitStatus(str, Enum):
    """Built-In Test (BIT) status values"""

    OK = "ok"
    WARN = "warn"
    FAIL = "fail"
    UNKNOWN = "unknown"


class BitMetrics(BaseModel):
    """Metrics for a BIT test result"""

    model_config = ConfigDict(populate_by_name=True)

    expected: Optional[str] = None
    actual: Optional[str] = None
    threshold: Optional[str] = None
    unit: Optional[str] = None


class BitTest(BaseModel):
    """Atomic BIT test definition with rollup mappings"""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    status: BitStatus
    description: Optional[str] = None
    last_run: Optional[int] = Field(None, description="Unix timestamp in ms", alias="lastRun")
    duration_ms: Optional[int] = Field(
        None, description="Duration in milliseconds", alias="durationMs"
    )
    metrics: Optional[BitMetrics] = None
    function_nodes: List[str] = Field(
        default_factory=list, description="Function node IDs", alias="functionNodes"
    )
    hardware_nodes: List[str] = Field(
        default_factory=list, description="Hardware node IDs", alias="hardwareNodes"
    )


class BitTreeNode(BaseModel):
    """Rollup node used by functional and hardware hierarchies"""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    status: BitStatus
    description: Optional[str] = None
    children: Optional[List["BitTreeNode"]] = None
    tests: Optional[List[str]] = Field(None, description="IDs of tests mapped to this node")


class BitSummary(BaseModel):
    """Summary counts for BIT test results"""

    total: int
    ok: int
    warn: int
    fail: int


class BitResult(BaseModel):
    """BIT test suite result"""

    model_config = ConfigDict(populate_by_name=True)

    timestamp: int = Field(description="Unix timestamp in ms")
    summary: BitSummary
    tests: List[BitTest]
    function_tree: BitTreeNode = Field(alias="functionTree")
    hardware_tree: BitTreeNode = Field(alias="hardwareTree")
