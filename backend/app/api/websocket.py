"""WebSocket handler for data source streaming"""

import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/sources/{source_id}/data")
async def websocket_source_stream(websocket: WebSocket, source_id: str) -> None:
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
