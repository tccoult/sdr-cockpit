"""System update REST API routes with lock mechanism and file upload"""

import asyncio
import time
import uuid
from pathlib import Path
from typing import Dict, Optional, TypedDict
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from pydantic import BaseModel

from app.models.update import (
    UpdateStatus,
    UploadStatusResponse,
    LockStatusResponse,
    LockAcquireResponse,
    InstallStartResponse,
    InstallStatusResponse,
)


class LockState(TypedDict):
    """Type definition for lock state"""

    client_id: str
    locked_since: int
    expires_at: int


class UploadState(TypedDict):
    """Type definition for upload state"""

    status: UpdateStatus
    bytes_received: int
    total_bytes: int
    filename: str
    path: str
    validation_results: Optional[dict]
    error: Optional[str]


class InstallState(TypedDict):
    """Type definition for install state"""

    status: UpdateStatus
    percent_complete: int
    time_remaining_seconds: int
    current_step: str
    error: Optional[str]
    upload_id: str


class StepConfig(TypedDict):
    """Type definition for installation step"""

    name: str
    duration: int
    progress_start: int
    progress_end: int


router = APIRouter(prefix="/api/system/update", tags=["system-update"])

# Lock timeout in seconds (20 minutes)
LOCK_TIMEOUT_SECONDS = 20 * 60

# In-memory state (replace with Redis/database in production)
system_lock: Optional[LockState] = None
uploads: Dict[str, UploadState] = {}
installations: Dict[str, InstallState] = {}

# Temporary upload directory
UPLOAD_DIR = Path("/tmp/sdr-updates")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class InstallStartRequest(BaseModel):
    """Request body for starting installation"""

    upload_id: str


def check_lock_expired() -> bool:
    """Check if current lock has expired"""
    global system_lock
    if system_lock is None:
        return True

    now = int(time.time() * 1000)
    if now >= system_lock["expires_at"]:
        system_lock = None
        return True

    return False


def get_lock_owner(client_id: str) -> bool:
    """Check if client owns the lock"""
    global system_lock
    if system_lock is None:
        return False
    return bool(system_lock["client_id"] == client_id)


@router.post("/lock", response_model=LockAcquireResponse)
async def acquire_lock():
    """Acquire exclusive lock for system update"""
    global system_lock

    # Check if lock exists and is not expired
    if system_lock is not None and not check_lock_expired():
        raise HTTPException(
            status_code=409, detail=f"System update is locked by {system_lock['client_id']}"
        )

    # Create new lock
    client_id = str(uuid.uuid4())
    now = int(time.time() * 1000)
    expires_at = now + (LOCK_TIMEOUT_SECONDS * 1000)

    system_lock = {
        "client_id": client_id,
        "locked_since": now,
        "expires_at": expires_at,
    }

    return LockAcquireResponse(
        lockId=client_id,
        expiresAt=expires_at,
    )


@router.get("/lock", response_model=LockStatusResponse)
async def get_lock_status():
    """Get current lock status"""
    check_lock_expired()  # Clean up expired lock

    if system_lock is None:
        return LockStatusResponse(isLocked=False)

    return LockStatusResponse(
        isLocked=True,
        lockedBy=system_lock["client_id"],
        lockedSince=system_lock["locked_since"],
        expiresAt=system_lock["expires_at"],
    )


@router.delete("/lock")
async def release_lock(client_id: Optional[str] = None):
    """Release the system update lock"""
    global system_lock

    check_lock_expired()

    if system_lock is None:
        return {"message": "No active lock"}

    # In production, verify client_id from auth token
    # For now, allow any client to release

    system_lock = None
    return {"message": "Lock released"}


@router.post("/upload")
async def upload_package(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """Upload system update package with streaming"""
    # Check lock
    if system_lock is None:
        raise HTTPException(status_code=403, detail="Lock not acquired")

    upload_id = str(uuid.uuid4())
    upload_path = UPLOAD_DIR / f"{upload_id}.pkg"

    # Initialize upload state
    uploads[upload_id] = {
        "status": UpdateStatus.UPLOADING,
        "bytes_received": 0,
        "total_bytes": 0,
        "filename": file.filename or "unknown.pkg",
        "path": str(upload_path),
        "validation_results": None,
        "error": None,
    }

    try:
        # Stream file to disk in chunks
        chunk_size = 1024 * 1024  # 1MB chunks
        total_bytes = 0

        with open(upload_path, "wb") as f:
            while chunk := await file.read(chunk_size):
                f.write(chunk)
                total_bytes += len(chunk)
                uploads[upload_id]["bytes_received"] = total_bytes
                uploads[upload_id]["total_bytes"] = total_bytes

        # Simulate validation in background
        background_tasks.add_task(validate_package, upload_id)

        return {"uploadId": upload_id}

    except Exception as e:
        uploads[upload_id]["status"] = UpdateStatus.ERROR
        uploads[upload_id]["error"] = str(e)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


async def validate_package(upload_id: str):
    """Background task to validate uploaded package"""
    await asyncio.sleep(1.5)  # Simulate validation time

    if upload_id not in uploads:
        return

    uploads[upload_id]["status"] = UpdateStatus.VALIDATING

    # Simulate validation
    await asyncio.sleep(1)

    uploads[upload_id]["status"] = UpdateStatus.IDLE
    uploads[upload_id]["validation_results"] = {
        "checksumValid": True,
        "signatureValid": True,
        "version": "1.3.0",
    }


@router.get("/upload-status/{upload_id}", response_model=UploadStatusResponse)
async def get_upload_status(upload_id: str):
    """Get upload and validation status"""
    if upload_id not in uploads:
        raise HTTPException(status_code=404, detail="Upload not found")

    upload = uploads[upload_id]

    return UploadStatusResponse(
        uploadId=upload_id,
        status=upload["status"],
        bytesReceived=upload["bytes_received"],
        totalBytes=upload["total_bytes"],
        percentComplete=(
            100
            if upload["bytes_received"] >= upload["total_bytes"]
            else int((upload["bytes_received"] / upload["total_bytes"]) * 100)
        ),
        validationResults=upload["validation_results"],
        error=upload["error"],
    )


@router.post("/install", response_model=InstallStartResponse)
async def start_installation(
    request: InstallStartRequest,
    background_tasks: BackgroundTasks,
):
    """Start installation process"""
    # Check lock
    if system_lock is None:
        raise HTTPException(status_code=403, detail="Lock not acquired")

    # Verify upload exists and is validated
    if request.upload_id not in uploads:
        raise HTTPException(status_code=404, detail="Upload not found")

    upload = uploads[request.upload_id]
    if upload["status"] != UpdateStatus.IDLE or upload["validation_results"] is None:
        raise HTTPException(status_code=400, detail="Upload not ready for installation")

    install_id = str(uuid.uuid4())

    # Initialize installation state
    install_state: InstallState = {
        "status": UpdateStatus.INSTALLING,
        "percent_complete": 0,
        "time_remaining_seconds": 30,
        "current_step": "Extracting",
        "error": None,
        "upload_id": request.upload_id,
    }
    installations[install_id] = install_state

    # Start installation in background
    background_tasks.add_task(simulate_installation, install_id)

    return InstallStartResponse(installId=install_id)


async def simulate_installation(install_id: str) -> None:
    """Background task to simulate installation with progress steps"""
    if install_id not in installations:
        return

    install = installations[install_id]

    # Installation steps with duration and progress ranges
    steps: list[StepConfig] = [
        {"name": "Extracting", "duration": 5, "progress_start": 0, "progress_end": 25},
        {"name": "Validating", "duration": 3, "progress_start": 25, "progress_end": 40},
        {"name": "Updating", "duration": 15, "progress_start": 40, "progress_end": 95},
        {"name": "Rebooting", "duration": 7, "progress_start": 95, "progress_end": 100},
    ]

    total_duration: int = sum(step["duration"] for step in steps)

    for step in steps:
        install["current_step"] = step["name"]
        step_duration: int = step["duration"]
        progress_range: int = step["progress_end"] - step["progress_start"]

        # Simulate step with incremental progress
        for i in range(10):
            await asyncio.sleep(step_duration / 10)

            progress = step["progress_start"] + int((i + 1) / 10 * progress_range)
            install["percent_complete"] = progress

            # Calculate remaining time
            elapsed_ratio = progress / 100
            if elapsed_ratio > 0:
                install["time_remaining_seconds"] = int(total_duration * (1 - elapsed_ratio))

    # Mark as complete
    install["status"] = UpdateStatus.COMPLETE
    install["percent_complete"] = 100
    install["time_remaining_seconds"] = 0
    install["current_step"] = "Complete"


@router.get("/install-status/{install_id}", response_model=InstallStatusResponse)
async def get_install_status(install_id: str):
    """Get installation progress"""
    if install_id not in installations:
        raise HTTPException(status_code=404, detail="Installation not found")

    install = installations[install_id]

    return InstallStatusResponse(
        installId=install_id,
        status=install["status"],
        percentComplete=install["percent_complete"],
        timeRemainingSeconds=install["time_remaining_seconds"],
        currentStep=install["current_step"],
        error=install["error"],
    )
