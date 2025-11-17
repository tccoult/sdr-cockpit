"""WebSocket handler for FFT data streaming with multi-client support"""

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, Optional, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.routes.tasks import tasks
from app.config.constants import TARGET_FPS
from app.models.generated import TaskStatus, VisualizationMode
from app.proto import FFTFrame, FFTFrameBatch, SpectralMessage
from app.utils.compression import compress_data_timed, should_compress_batch
from app.utils.fft_generator import MockFFTGenerator
from app.utils.spectral_conversion import (
    bins_to_bytes,
    compute_delta_frame,
    db_bins_to_bytes,
    db_to_int16,
)

logger = logging.getLogger(__name__)

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
            logger.debug(f"Client {client_id} heartbeat timeout, disconnecting")
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
                message = await asyncio.wait_for(websocket.receive_json(), timeout=0.0)

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
                    # Generate a batch of frames
                    batch_size = 256
                    proto_frames = []
                    use_delta_encoding = should_compress_batch(batch_size)
                    previous_int16 = None

                    for i in range(batch_size):
                        fft_data = generator.generate_fft()

                        # Convert to int16
                        current_int16 = db_to_int16(fft_data["bins"])

                        # Use delta encoding only if we're going to compress
                        if use_delta_encoding and i > 0:
                            # Subsequent frames: send delta from previous
                            assert previous_int16 is not None
                            delta = compute_delta_frame(current_int16, previous_int16)
                            bins_data = bins_to_bytes(delta)
                            is_delta = True
                        else:
                            # First frame or no compression: send absolute values
                            bins_data = bins_to_bytes(current_int16)
                            is_delta = False

                        proto_frame = FFTFrame(
                            timestamp=fft_data["timestamp"],
                            center_freq=fft_data["centerFreq"],
                            sample_rate=fft_data["sampleRate"],
                            bins=bins_data,
                            is_delta=is_delta,
                        )
                        proto_frames.append(proto_frame)

                        # Store for next delta
                        previous_int16 = current_int16

                    # Create batch message
                    batch = FFTFrameBatch(frames=proto_frames)
                    batch_bytes = batch.SerializeToString()

                    # Decide whether to compress based on batch size
                    if should_compress_batch(batch_size):
                        # Compress the batch for significant bandwidth reduction
                        compressed_bytes, _compress_time_ms = compress_data_timed(batch_bytes)

                        message = SpectralMessage(
                            type=SpectralMessage.COMPRESSED_BATCH,
                            compressed_data=compressed_bytes,
                        )
                    else:
                        # Send uncompressed for small batches
                        message = SpectralMessage(type=SpectralMessage.BATCH, batch=batch)

                    # Serialize and send
                    serialized = message.SerializeToString()
                    await websocket.send_bytes(serialized)
                    # Wait longer between batches
                    await asyncio.sleep(0.1)
                else:
                    t1 = time.time()

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
                    serialized = message.SerializeToString()
                    await websocket.send_bytes(serialized)

                    # Target FPS
                    t2 = time.time()
                    await asyncio.sleep(1.0 / TARGET_FPS - (t2 - t1))
            else:
                # If paused, just wait a bit
                await asyncio.sleep(0.1)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}, task {task_id}: {e}")
    finally:
        # Clean up
        heartbeat_task.cancel()
        await cleanup_session(client_id)


@router.websocket("/ws/sources/{source_id}/data")
async def websocket_source_stream(websocket: WebSocket, source_id: str):
    """
    Stream data from a data source to a client.

    This is the new source-based streaming endpoint that replaces
    the task-specific endpoint for visualization.
    """
    from app.sources import source_manager
    from app.sources.base import CLIENT_QUEUE_SIZE

    await websocket.accept()
    logger.info(f"Client connected to source: {source_id}")

    # Create queue for this client
    client_queue: asyncio.Queue = asyncio.Queue(maxsize=CLIENT_QUEUE_SIZE)

    try:
        # Subscribe to source
        success = await source_manager.subscribe_client(source_id, client_queue)
        if not success:
            await websocket.send_json({"type": "error", "message": f"Source {source_id} not found"})
            await websocket.close(code=1008)  # Policy violation
            return

        logger.info(f"Client subscribed to source: {source_id}")

        # Pump queue to websocket
        while True:
            try:
                # Get next batch (blocks until available)
                data = await asyncio.wait_for(client_queue.get(), timeout=30.0)

                # Send to client
                await websocket.send_bytes(data)

            except asyncio.TimeoutError:
                # No data for 30 seconds - send ping to check connection
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    break  # Connection dead

            except Exception as e:
                logger.error(f"Error sending data to client: {e}")
                break

    except WebSocketDisconnect:
        logger.info(f"Client disconnected from source: {source_id}")
    except Exception as e:
        logger.error(f"WebSocket error for source {source_id}: {e}", exc_info=True)
    finally:
        # Cleanup - unsubscribe from source
        await source_manager.unsubscribe_client(source_id, client_queue)
        logger.info(f"Client unsubscribed from source: {source_id}")


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
