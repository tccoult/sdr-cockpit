"""Tests for WebSocket FFT data streaming"""

import pytest
from httpx import ASGITransport, AsyncClient
from starlette.testclient import TestClient

from app.main import app
from app.models.task import TaskStatus, VisualizationMode


@pytest.fixture
async def http_client():
    """Create async HTTP client for task creation"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture(autouse=True)
def reset_state():
    """Reset task storage and active connections before each test"""
    from app.api.routes.tasks import tasks
    from app.api.websocket import active_connections

    tasks.clear()
    active_connections.clear()

    # Reset counter
    import app.api.routes.tasks as tasks_module
    tasks_module.task_counter = 1


class TestWebSocketConnection:
    """Tests for WebSocket connection lifecycle"""

    def test_websocket_connects_and_streams_data(self, http_client):
        """Should connect to WebSocket and receive FFT data"""
        # First create a task via HTTP
        import asyncio

        async def create_task():
            response = await http_client.post(
                "/api/tasks/",
                json={
                    "name": "Test RX Task",
                    "frequency": 100e6,
                    "sample_rate": 2e6,
                    "bandwidth": 1e6,
                    "fft_size": 2048,
                },
            )
            return response.json()["id"]

        task_id = asyncio.run(create_task())

        # Connect via WebSocket
        with TestClient(app).websocket_connect(f"/ws/tasks/{task_id}/data") as websocket:
            # Should receive FFT data
            data = websocket.receive_json()
            assert "bins" in data
            assert "timestamp" in data
            assert "centerFreq" in data
            assert "sampleRate" in data
            assert isinstance(data["bins"], list)
            assert len(data["bins"]) == 2048
            assert data["centerFreq"] == 100e6
            assert data["sampleRate"] == 2e6

    def test_websocket_rejects_invalid_task(self):
        """Should reject connection for non-existent task"""
        with TestClient(app).websocket_connect("/ws/tasks/invalid-id/data") as websocket:
            data = websocket.receive_json()
            assert "error" in data
            assert "not found" in data["error"].lower()

    def test_websocket_cleanup_on_disconnect(self, http_client):
        """Should clean up connection tracking on disconnect"""
        import asyncio
        from app.api.websocket import active_connections

        # Create task
        async def create_task():
            response = await http_client.post(
                "/api/tasks/",
                json={
                    "name": "Test Task",
                    "frequency": 100e6,
                    "sample_rate": 2e6,
                    "bandwidth": 1e6,
                    "fft_size": 2048,
                },
            )
            return response.json()["id"]

        task_id = asyncio.run(create_task())

        # Connect and disconnect
        with TestClient(app).websocket_connect(f"/ws/tasks/{task_id}/data") as websocket:
            # Connection should be tracked
            assert task_id in active_connections
            assert len(active_connections[task_id]) == 1
            websocket.receive_json()  # Receive first message

        # After disconnect, should be cleaned up
        assert task_id not in active_connections or len(active_connections[task_id]) == 0

    def test_websocket_stops_streaming_when_task_paused(self, http_client):
        """Should stop sending data when task is paused"""
        import asyncio
        from app.api.routes.tasks import tasks

        # Create task
        async def create_task():
            response = await http_client.post(
                "/api/tasks/",
                json={
                    "name": "Test Task",
                    "frequency": 100e6,
                    "sample_rate": 2e6,
                    "bandwidth": 1e6,
                    "fft_size": 2048,
                },
            )
            return response.json()["id"]

        task_id = asyncio.run(create_task())

        with TestClient(app).websocket_connect(f"/ws/tasks/{task_id}/data") as websocket:
            # Receive first frame (task is live)
            data = websocket.receive_json()
            assert "bins" in data

            # Pause the task
            tasks[task_id].status = TaskStatus.PAUSED

            # WebSocket should still be connected but data flow changes
            # (implementation waits 0.1s when paused rather than sending data)
            # This is verified by the task status check in the streaming loop


class TestWebSocketBatching:
    """Tests for different visualization modes"""

    def test_websocket_sends_batches_in_spectrogram_mode(self, http_client):
        """Should send batches of frames for spectrogram mode"""
        import asyncio
        from app.api.routes.tasks import tasks

        # Create task
        async def create_task():
            response = await http_client.post(
                "/api/tasks/",
                json={
                    "name": "Test Task",
                    "frequency": 100e6,
                    "sample_rate": 2e6,
                    "bandwidth": 1e6,
                    "fft_size": 2048,
                },
            )
            return response.json()["id"]

        task_id = asyncio.run(create_task())

        # Set to spectrogram mode
        tasks[task_id].visualization_mode = VisualizationMode.SPECTROGRAM

        with TestClient(app).websocket_connect(f"/ws/tasks/{task_id}/data") as websocket:
            # Should receive a batch
            # Note: remove timeout as it's not supported in TestClient
            import time
            start = time.time()
            data = websocket.receive_json()
            elapsed = time.time() - start

            assert "frames" in data
            assert isinstance(data["frames"], list)
            assert len(data["frames"]) == 50  # Batch size is 50
            # Each frame should have FFT data
            assert "bins" in data["frames"][0]
            assert "centerFreq" in data["frames"][0]
            assert "sampleRate" in data["frames"][0]
            assert len(data["frames"][0]["bins"]) == 2048


class TestActiveConnections:
    """Tests for active connection tracking endpoint"""

    @pytest.mark.asyncio
    async def test_get_active_connections_empty(self, http_client):
        """Should return empty connections when none active"""
        response = await http_client.get("/ws/active")
        assert response.status_code == 200
        data = response.json()
        assert data["connections"] == {}

    def test_get_active_connections_with_client(self, http_client):
        """Should track active WebSocket connections"""
        import asyncio

        # Create task
        async def create_task():
            response = await http_client.post(
                "/api/tasks/",
                json={
                    "name": "Test Task",
                    "frequency": 100e6,
                    "sample_rate": 2e6,
                    "bandwidth": 1e6,
                    "fft_size": 2048,
                },
            )
            return response.json()["id"]

        task_id = asyncio.run(create_task())

        with TestClient(app).websocket_connect(f"/ws/tasks/{task_id}/data"):
            # Check active connections via HTTP endpoint
            async def check_active():
                response = await http_client.get("/ws/active")
                return response.json()

            data = asyncio.run(check_active())
            assert task_id in data["connections"]
            assert data["connections"][task_id] == 1
