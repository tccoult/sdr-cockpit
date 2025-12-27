"""FastAPI application entry point"""

import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncGenerator, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api.routes import tasks, health, update, sources
from app.api import websocket
from app.models.generated import Task, TaskType, TaskStatus, TaskOwner, VisualizationMode
from app.config.constants import TARGET_FPS
from app.config.settings import get_settings
from app.sources import MockTaskDataSource, source_manager
from app.core.event_bus import EventBus, Topic
from app.core.bit_storage import BitStorage
from app.handlers.alert_manager import AlertManager
from app.handlers.bit_subscriber import MockBitSubscriber

# Configure logging
logging.basicConfig(
    level=getattr(logging, get_settings().log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager - handles startup and shutdown"""
    # === STARTUP ===

    # Create instances
    event_bus = EventBus()
    bit_storage = BitStorage(get_settings())
    alert_manager = AlertManager()
    bit_subscriber = MockBitSubscriber()

    # Wire up event subscriptions
    # Storage subscribes to BIT results and alerts
    event_bus.subscribe(Topic.BIT_RESULT, bit_storage.handle_result)
    event_bus.subscribe(Topic.BIT_ALERT, bit_storage.handle_alert)

    # Alert manager subscribes to BIT results, publishes alerts
    event_bus.subscribe(Topic.BIT_RESULT, alert_manager.handle_result)
    alert_manager.set_event_bus(event_bus)

    # Subscriber uses event bus to publish results
    bit_subscriber.set_event_bus(event_bus)

    # Run initial cleanup of old data
    await bit_storage.cleanup_old_data()

    # Start the mock subscriber
    await bit_subscriber.start()

    # Store in app.state for access in routes
    app.state.event_bus = event_bus
    app.state.bit_storage = bit_storage
    app.state.alert_manager = alert_manager
    app.state.bit_subscriber = bit_subscriber

    logger.info("BIT system initialized")

    # Seed mock tasks if enabled
    if get_settings().seed_mock_tasks:
        await _seed_mock_tasks()
    else:
        logger.info("Skipping mock task seeding (SDR_SEED_MOCK_TASKS disabled)")

    yield  # Application runs here

    # === SHUTDOWN ===
    await bit_subscriber.stop()
    await alert_manager.flush_pending()
    logger.info("Application shutdown complete")


async def _seed_mock_tasks() -> None:
    """Create test tasks with different visualization modes"""
    now = int(time.time() * 1000)

    test_tasks = [
        Task(
            id="test-fft-only",
            name="FFT Only (Sparse Updates)",
            type=TaskType.rx,
            frequency=915e6,
            sampleRate=2.4e6,
            bandwidth=2.4e6,
            fftSize=2048,
            owner=TaskOwner.external,
            ownerName="Test Generator",
            status=TaskStatus.live,
            uptime=0,
            createdAt=now,
            fps=TARGET_FPS,
            visualizationMode=VisualizationMode.fft_only,
        ),
        Task(
            id="test-fft-waterfall",
            name="FFT + Waterfall (Continuous)",
            type=TaskType.rx,
            frequency=433.92e6,
            sampleRate=1e6,
            bandwidth=1e6,
            fftSize=2048,
            owner=TaskOwner.external,
            ownerName="Test Generator",
            status=TaskStatus.live,
            uptime=0,
            createdAt=now,
            fps=TARGET_FPS,
            visualizationMode=VisualizationMode.fft_waterfall,
        ),
        Task(
            id="test-spectrogram",
            name="Spectrogram (Batch Updates)",
            type=TaskType.rx,
            frequency=2.45e9,
            sampleRate=10e6,
            bandwidth=10e6,
            fftSize=1024,
            owner=TaskOwner.external,
            ownerName="Test Generator",
            status=TaskStatus.live,
            uptime=0,
            createdAt=now,
            fps=TARGET_FPS,
            visualizationMode=VisualizationMode.spectrogram,
        ),
    ]

    for task in test_tasks:
        tasks.tasks[task.id] = task
        tasks.task_sources[task.id] = f"{task.id}-spectral"

        # Register a data source for each test task
        source = MockTaskDataSource(
            task_id=task.id,
            task_name=task.name,
            center_freq=task.frequency,
            sample_rate=task.sample_rate,
            fft_size=task.fft_size or 2048,
        )
        await source_manager.register(source)

    logger.info(f"Registered {len(test_tasks)} test task sources")


app = FastAPI(
    title="SDR Cockpit API",
    description="Software Defined Radio Web Application API",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS (for dev when frontend runs on separate port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(tasks.router)
app.include_router(sources.router)
app.include_router(health.router)
app.include_router(update.router)
app.include_router(websocket.router)


@app.get("/api/")
async def root() -> Dict[str, Any]:
    """Root API endpoint"""
    return {"message": "SDR Cockpit API", "version": "0.1.0", "status": "running"}


@app.get("/api/healthcheck")
async def healthcheck() -> Dict[str, Any]:
    """Health check endpoint"""
    return {"status": "healthy", "service": "backend"}


# Mount static files and serve frontend (only if static directory exists)
static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    # Serve static assets
    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")

    # Catch-all route to serve index.html for client-side routing
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str) -> FileResponse:
        """Serve frontend application"""
        # If path starts with /api, it's an API route - let FastAPI handle it
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")

        # Try to serve the file if it exists
        file_path = static_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)

        # Otherwise serve index.html for client-side routing
        return FileResponse(static_dir / "index.html")
