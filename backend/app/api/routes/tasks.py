"""Task management REST API routes"""

import time
from typing import Dict, List, Union
from fastapi import APIRouter, HTTPException

from app.config.constants import TARGET_FPS
from app.models.task import (
    Task,
    CreateRxTaskParams,
    CreateTxTaskParams,
    UpdateTaskParams,
    TaskStatus,
    TaskOwner,
    TaskType,
    PlaybackInfo,
    RecordingInfo,
)

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

# In-memory task storage (replace with database in production)
tasks: Dict[str, Task] = {}
task_counter = 1


def generate_task_id() -> str:
    """Generate a unique task ID"""
    global task_counter
    task_id = f"task-{task_counter}"
    task_counter += 1
    return task_id


@router.get("/", response_model=List[Task])
async def list_tasks():
    """List all tasks"""
    return list(tasks.values())


@router.post("/", response_model=Task)
async def create_task(params: Union[CreateRxTaskParams, CreateTxTaskParams]):
    """Create a new task"""
    task_id = generate_task_id()
    now = int(time.time() * 1000)

    if isinstance(params, CreateRxTaskParams):
        task = Task(
            id=task_id,
            name=params.name,
            type=TaskType.RX,
            frequency=params.frequency,
            sampleRate=params.sample_rate,
            bandwidth=params.bandwidth,
            fftSize=params.fft_size,
            owner=TaskOwner.SELF,
            ownerName="You",
            status=TaskStatus.LIVE,
            uptime=0,
            createdAt=now,
            fps=TARGET_FPS,
            visualizationMode=None,
        )
    else:  # CreateTxTaskParams
        task = Task(
            id=task_id,
            name=params.name,
            type=TaskType.TX,
            frequency=params.frequency or 433.92e6,
            sampleRate=1e6,
            bandwidth=1e6,
            fftSize=2048,
            owner=TaskOwner.SELF,
            ownerName="You",
            status=TaskStatus.TRANSMITTING,
            uptime=0,
            createdAt=now,
            fps=TARGET_FPS,
            visualizationMode=None,
            playback=PlaybackInfo(
                filename=params.filename,
                progress=0.0,
                isLooping=params.loop,
                duration=60.0,
            ),
        )

    tasks[task_id] = task
    return task


@router.get("/{task_id}", response_model=Task)
async def get_task(task_id: str):
    """Get a single task by ID"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return tasks[task_id]


@router.put("/{task_id}", response_model=Task)
async def update_task(task_id: str, params: UpdateTaskParams):
    """Update a task"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks[task_id]

    # Update fields if provided
    if params.name is not None:
        task.name = params.name
    if params.status is not None:
        task.status = params.status
        task.fps = TARGET_FPS if params.status == TaskStatus.LIVE else 0
    if params.frequency is not None:
        task.frequency = params.frequency

    # Update uptime
    elapsed = (int(time.time() * 1000) - task.created_at) / 1000
    task.uptime = elapsed

    tasks[task_id] = task
    return task


@router.delete("/{task_id}")
async def delete_task(task_id: str):
    """Delete a task"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    del tasks[task_id]
    return {"message": "Task deleted", "id": task_id}


@router.post("/{task_id}/pause", response_model=Task)
async def pause_task(task_id: str):
    """Pause a task"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks[task_id]
    if task.owner != TaskOwner.SELF:
        raise HTTPException(status_code=403, detail="Cannot control external task")

    task.status = TaskStatus.PAUSED
    task.fps = 0
    return task


@router.post("/{task_id}/resume", response_model=Task)
async def resume_task(task_id: str):
    """Resume a paused task"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks[task_id]
    if task.owner != TaskOwner.SELF:
        raise HTTPException(status_code=403, detail="Cannot control external task")

    if task.type == TaskType.RX:
        task.status = TaskStatus.LIVE
    else:
        task.status = TaskStatus.TRANSMITTING
    task.fps = TARGET_FPS
    return task


@router.post("/{task_id}/record", response_model=Task)
async def start_recording(task_id: str):
    """Start recording on an RX task"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks[task_id]
    if task.type != TaskType.RX:
        raise HTTPException(status_code=400, detail="Can only record RX tasks")
    if task.owner != TaskOwner.SELF:
        raise HTTPException(status_code=403, detail="Cannot control external task")

    from datetime import datetime

    task.recording = RecordingInfo(
        filename=f"recording_{datetime.now().strftime('%Y-%m-%d')}.sigmf",
        duration=0,
        fileSize=0,
        isRecording=True,
    )
    return task


@router.delete("/{task_id}/record", response_model=Task)
async def stop_recording(task_id: str):
    """Stop recording on a task"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks[task_id]
    task.recording = None
    return task
