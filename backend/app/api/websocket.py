"""WebSocket handler for FFT data streaming"""

import asyncio
from typing import Dict
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from app.utils.fft_generator import MockFFTGenerator
from app.api.routes.tasks import tasks

router = APIRouter()

# Active WebSocket connections and their generators
active_connections: Dict[str, list] = {}


@router.websocket("/ws/tasks/{task_id}/data")
async def websocket_task_data(websocket: WebSocket, task_id: str):
    """WebSocket endpoint for streaming task data"""

    # Accept connection
    await websocket.accept()

    # Check if task exists
    if task_id not in tasks:
        await websocket.send_json({"error": "Task not found"})
        await websocket.close()
        return

    task = tasks[task_id]

    # Create FFT generator for this task
    generator = MockFFTGenerator(
        center_freq=task.frequency,
        sample_rate=task.sample_rate,
        fft_size=task.fft_size or 2048,
        seed=hash(task_id) % 10000,
    )

    # Track connection
    if task_id not in active_connections:
        active_connections[task_id] = []
    active_connections[task_id].append(websocket)

    try:
        # Stream FFT data
        while True:
            # Check if task still exists and is active
            if task_id not in tasks:
                await websocket.send_json({"error": "Task no longer exists"})
                break

            task = tasks[task_id]

            # Only send data if task is live/transmitting
            if task.status in ["live", "transmitting"]:
                fft_data = generator.generate_fft()
                await websocket.send_json(fft_data)

                # Target ~30 FPS
                await asyncio.sleep(1.0 / 30)
            else:
                # If paused, just wait a bit
                await asyncio.sleep(0.1)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error for task {task_id}: {e}")
    finally:
        # Clean up connection
        if task_id in active_connections:
            if websocket in active_connections[task_id]:
                active_connections[task_id].remove(websocket)
            if not active_connections[task_id]:
                del active_connections[task_id]


@router.get("/ws/active")
async def get_active_connections():
    """Debug endpoint to see active WebSocket connections"""
    return {"connections": {task_id: len(conns) for task_id, conns in active_connections.items()}}
