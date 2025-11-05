"""Task models matching frontend TypeScript interfaces"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class TaskType(str, Enum):
    """Task type enum"""

    RX = "rx"
    TX = "tx"


class TaskStatus(str, Enum):
    """Task status enum"""

    LIVE = "live"
    PAUSED = "paused"
    TRANSMITTING = "transmitting"
    STOPPED = "stopped"


class TaskOwner(str, Enum):
    """Task owner type"""

    SELF = "self"
    EXTERNAL = "external"


class RecordingInfo(BaseModel):
    """Recording information"""

    filename: str
    duration: float = Field(description="Recording duration in seconds")
    file_size: int = Field(description="File size in bytes", alias="fileSize")
    is_recording: bool = Field(alias="isRecording")

    class Config:
        populate_by_name = True


class PlaybackInfo(BaseModel):
    """TX playback information"""

    filename: str
    progress: float = Field(ge=0.0, le=1.0, description="Playback progress 0-1")
    is_looping: bool = Field(alias="isLooping")
    duration: float = Field(description="Total duration in seconds")

    class Config:
        populate_by_name = True


class Task(BaseModel):
    """SDR Task"""

    id: str
    name: str
    type: TaskType
    frequency: float = Field(description="Center frequency in Hz")
    sample_rate: float = Field(description="Sample rate in Hz", alias="sampleRate")
    bandwidth: Optional[float] = Field(None, description="Bandwidth in Hz")
    fft_size: Optional[int] = Field(None, description="FFT size (bins)", alias="fftSize")
    owner: TaskOwner
    owner_name: str = Field(description="Owner display name", alias="ownerName")
    status: TaskStatus
    uptime: float = Field(description="Uptime in seconds")
    recording: Optional[RecordingInfo] = None
    playback: Optional[PlaybackInfo] = None
    created_at: int = Field(description="Unix timestamp in ms", alias="createdAt")
    fps: Optional[float] = Field(None, description="Current frame rate")

    class Config:
        populate_by_name = True


class CreateRxTaskParams(BaseModel):
    """Parameters for creating an RX task"""

    name: str
    frequency: float
    sample_rate: float = Field(alias="sampleRate")
    bandwidth: float
    fft_size: int = Field(alias="fftSize")

    class Config:
        populate_by_name = True


class CreateTxTaskParams(BaseModel):
    """Parameters for creating a TX task"""

    name: str
    filename: str
    frequency: Optional[float] = None
    loop: bool

    class Config:
        populate_by_name = True


class UpdateTaskParams(BaseModel):
    """Parameters for updating a task"""

    name: Optional[str] = None
    status: Optional[TaskStatus] = None
    frequency: Optional[float] = None
