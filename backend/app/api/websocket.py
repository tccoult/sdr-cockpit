"""WebSocket handler for FFT data streaming with multi-client support"""

import asyncio
import time
import uuid
from typing import Dict, Set, Optional
from dataclasses import dataclass, field
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from app.utils.fft_generator import MockFFTGenerator
from app.api.routes.tasks import tasks
from app.config.constants import TARGET_FPS
from app.models.generated import VisualizationMode, TaskStatus
from app.proto import FFTFrame, FFTFrameBatch, SpectralMessage
from app.utils.spectral_conversion import db_bins_to_bytes
from app.utils.compression import compress_data, should_compress_batch

router = APIRouter()

# Heartbeat configuration
HEARTBEAT_INTERVAL = 30  # Send ping every 30 seconds
HEARTBEAT_TIMEOUT = 60  # Disconnect if no pong after 60 seconds


@dataclass
class ClientSession:
    """Client session with metadata and heartbeat tracking"""

    client_id: str
    websocket: WebSocket
    subscribed_tasks: Set[str] = field(default_factory=set)
    connected_at: float = field(default_factory=time.time)
    last_heartbeat: float = field(default_factory=time.time)
    metadata: Dict = field(default_factory=dict)


# Active client sessions
active_sessions: Dict[str, ClientSession] = {}  # client_id → session
task_subscribers: Dict[str, Set[str]] = {}  # task_id → set of client_ids


async def broadcast_to_all(message: dict, exclude: Optional[str] = None) -> None:
    """Broadcast message to all connected clients"""
    dead_clients = []

    for client_id, session in active_sessions.items():
        if client_id != exclude:
            try:
                await session.websocket.send_json(message)
            except Exception:
                dead_clients.append(client_id)

    # Clean up dead connections
    for client_id in dead_clients:
        await cleanup_session(client_id)


async def broadcast_to_task(task_id: str, message: dict) -> None:
    """Broadcast message to all clients subscribed to a task"""
    if task_id not in task_subscribers:
        return

    dead_clients = []
    for client_id in task_subscribers[task_id]:
        if client_id in active_sessions:
            try:
                await active_sessions[client_id].websocket.send_json(message)
            except Exception:
                dead_clients.append(client_id)

    # Clean up dead connections
    for client_id in dead_clients:
        await cleanup_session(client_id)


async def cleanup_session(client_id: str) -> None:
    """Clean up a client session and unsubscribe from all tasks"""
    if client_id not in active_sessions:
        return

    session = active_sessions[client_id]

    # Unsubscribe from all tasks
    for task_id in session.subscribed_tasks:
        if task_id in task_subscribers and client_id in task_subscribers[task_id]:
            task_subscribers[task_id].remove(client_id)
            if not task_subscribers[task_id]:
                del task_subscribers[task_id]

    # Remove session
    del active_sessions[client_id]


async def heartbeat_monitor(client_id: str) -> None:
    """Monitor client heartbeat and disconnect if timeout"""
    while client_id in active_sessions:
        session = active_sessions[client_id]
        now = time.time()

        # Check for timeout
        if now - session.last_heartbeat > HEARTBEAT_TIMEOUT:
            print(f"Client {client_id} heartbeat timeout, disconnecting")
            try:
                await session.websocket.close()
            except Exception:
                pass
            await cleanup_session(client_id)
            break

        # Send ping
        try:
            await session.websocket.send_json({"type": "ping", "timestamp": int(now * 1000)})
        except Exception:
            await cleanup_session(client_id)
            break

        await asyncio.sleep(HEARTBEAT_INTERVAL)


@router.websocket("/ws/tasks/{task_id}/data")
async def websocket_task_data(websocket: WebSocket, task_id: str):
    """WebSocket endpoint for streaming task data with session management"""

    # Accept connection
    await websocket.accept()

    # Create client session
    client_id = str(uuid.uuid4())
    session = ClientSession(client_id=client_id, websocket=websocket)
    active_sessions[client_id] = session

    # Subscribe to task
    session.subscribed_tasks.add(task_id)
    if task_id not in task_subscribers:
        task_subscribers[task_id] = set()
    task_subscribers[task_id].add(client_id)

    # Send welcome message with client ID
    await websocket.send_json({"type": "connected", "client_id": client_id, "task_id": task_id})

    # Start heartbeat monitor
    heartbeat_task = asyncio.create_task(heartbeat_monitor(client_id))

    # Check if task exists
    if task_id not in tasks:
        await websocket.send_json({"type": "error", "message": "Task not found"})
        await websocket.close()
        heartbeat_task.cancel()
        await cleanup_session(client_id)
        return

    task = tasks[task_id]

    # Create FFT generator for this task
    generator = MockFFTGenerator(
        center_freq=task.frequency,
        sample_rate=task.sample_rate,
        fft_size=task.fft_size or 2048,
        seed=hash(task_id) % 10000,
    )

    try:
        # Stream FFT data
        while True:
            # Check if task still exists and is active
            if task_id not in tasks:
                await websocket.send_json({"type": "error", "message": "Task no longer exists"})
                break

            task = tasks[task_id]

            # Handle incoming messages (for pong responses)
            try:
                # Non-blocking receive
                message = await asyncio.wait_for(websocket.receive_json(), timeout=0.001)

                if message.get("type") == "pong":
                    session.last_heartbeat = time.time()

            except asyncio.TimeoutError:
                pass  # No message, continue
            except Exception:
                break  # Connection error

            # Only send data if task is live/transmitting
            if task.status in [TaskStatus.live, TaskStatus.transmitting]:
                # Send batches for spectrogram mode, single frames for others
                if task.visualization_mode == VisualizationMode.spectrogram:
                    # Generate a batch of frames (simulate capturing multiple FFTs at once)
                    batch_size = 50  # Send 50 frames at once for spectrogram
                    proto_frames = []
                    for _ in range(batch_size):
                        fft_data = generator.generate_fft()
                        # Convert to protobuf FFTFrame
                        proto_frame = FFTFrame(
                            timestamp=fft_data["timestamp"],
                            center_freq=fft_data["centerFreq"],
                            sample_rate=fft_data["sampleRate"],
                            bins=db_bins_to_bytes(fft_data["bins"]),
                        )
                        proto_frames.append(proto_frame)

                    # Create batch message
                    batch = FFTFrameBatch(frames=proto_frames)

                    # Decide whether to compress based on batch size
                    if should_compress_batch(batch_size):
                        # Compress the batch for significant bandwidth reduction
                        batch_bytes = batch.SerializeToString()
                        compressed_bytes = compress_data(batch_bytes)
                        message = SpectralMessage(
                            type=SpectralMessage.COMPRESSED_BATCH,
                            compressed_data=compressed_bytes,
                        )
                    else:
                        # Send uncompressed for small batches
                        message = SpectralMessage(type=SpectralMessage.BATCH, batch=batch)

                    # Serialize and send
                    await websocket.send_bytes(message.SerializeToString())
                    # Wait longer between batches
                    await asyncio.sleep(2.0)
                else:
                    # Regular streaming - send single frames
                    fft_data = generator.generate_fft()

                    # Convert to protobuf FFTFrame
                    proto_frame = FFTFrame(
                        timestamp=fft_data["timestamp"],
                        center_freq=fft_data["centerFreq"],
                        sample_rate=fft_data["sampleRate"],
                        bins=db_bins_to_bytes(fft_data["bins"]),
                    )

                    # Create message wrapper
                    message = SpectralMessage(
                        type=SpectralMessage.SINGLE_FRAME, single_frame=proto_frame
                    )

                    # Serialize and send
                    await websocket.send_bytes(message.SerializeToString())
                    # Target FPS
                    await asyncio.sleep(1.0 / TARGET_FPS)
            else:
                # If paused, just wait a bit
                await asyncio.sleep(0.1)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error for client {client_id}, task {task_id}: {e}")
    finally:
        # Clean up
        heartbeat_task.cancel()
        await cleanup_session(client_id)


@router.get("/ws/active")
async def get_active_connections():
    """Debug endpoint to see active WebSocket connections"""
    return {
        "total_clients": len(active_sessions),
        "clients": [
            {
                "client_id": session.client_id,
                "subscribed_tasks": list(session.subscribed_tasks),
                "connected_at": session.connected_at,
                "last_heartbeat": session.last_heartbeat,
            }
            for session in active_sessions.values()
        ],
        "task_subscribers": {
            task_id: len(clients) for task_id, clients in task_subscribers.items()
        },
    }


# Public functions for broadcasting from other modules
async def broadcast_health_update(health_data: dict) -> None:
    """Broadcast health/BIT update to all clients"""
    await broadcast_to_all({"type": "health_update", "data": health_data})


async def broadcast_lock_status(lock_data: dict) -> None:
    """Broadcast system update lock status to all clients"""
    await broadcast_to_all({"type": "system_update_lock_changed", "data": lock_data})
