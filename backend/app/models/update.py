"""System update models"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class UpdateStatus(str, Enum):
    """System update status"""

    IDLE = "idle"
    UPLOADING = "uploading"
    VALIDATING = "validating"
    INSTALLING = "installing"
    COMPLETE = "complete"
    ERROR = "error"


class UploadStatusResponse(BaseModel):
    """Upload status response"""

    model_config = ConfigDict(populate_by_name=True)

    upload_id: str = Field(alias="uploadId")
    status: UpdateStatus
    bytes_received: int = Field(alias="bytesReceived")
    total_bytes: int = Field(alias="totalBytes")
    percent_complete: int = Field(alias="percentComplete")
    validation_results: Optional[dict] = Field(None, alias="validationResults")
    error: Optional[str] = None


class LockStatusResponse(BaseModel):
    """Lock status response"""

    model_config = ConfigDict(populate_by_name=True)

    is_locked: bool = Field(alias="isLocked")
    locked_by: Optional[str] = Field(None, alias="lockedBy")
    locked_since: Optional[int] = Field(None, alias="lockedSince")
    expires_at: Optional[int] = Field(None, alias="expiresAt")


class LockAcquireResponse(BaseModel):
    """Lock acquire response"""

    model_config = ConfigDict(populate_by_name=True)

    lock_id: str = Field(alias="lockId")
    expires_at: int = Field(alias="expiresAt")


class InstallStartResponse(BaseModel):
    """Install start response"""

    model_config = ConfigDict(populate_by_name=True)

    install_id: str = Field(alias="installId")


class InstallStatusResponse(BaseModel):
    """Install status response"""

    model_config = ConfigDict(populate_by_name=True)

    install_id: str = Field(alias="installId")
    status: UpdateStatus
    percent_complete: int = Field(alias="percentComplete")
    time_remaining_seconds: Optional[int] = Field(None, alias="timeRemainingSeconds")
    current_step: Optional[str] = Field(None, alias="currentStep")
    error: Optional[str] = None
