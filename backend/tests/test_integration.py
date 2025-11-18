"""
Integration tests for backend API

These tests verify complete workflows and interactions between components.
They test real-world scenarios that span multiple endpoints and features.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.api.routes.tasks import tasks, task_sources
from app.sources import source_manager


@pytest.fixture
async def client() -> AsyncClient:
    """Create async test client"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture(autouse=True)
async def cleanup_tasks() -> None:
    """Clean up tasks after each test"""
    yield
    # Clear all test-created tasks
    task_ids = list(tasks.keys())
    for task_id in task_ids:
        if task_id not in ["test-fft-only", "test-fft-waterfall", "test-spectrogram"]:
            source_id = task_sources.pop(task_id, f"{task_id}-spectral")
            await source_manager.unregister(source_id)
            del tasks[task_id]


class TestTaskLifecycle:
    """Test complete task lifecycle scenarios"""

    @pytest.mark.asyncio
    async def test_rx_task_full_lifecycle(self, client: AsyncClient) -> None:
        """Test complete RX task lifecycle: create -> pause -> resume -> record -> stop -> delete"""
        # Create task
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "Lifecycle Test",
                "frequency": 915e6,
                "sampleRate": 2e6,
                "bandwidth": 1e6,
                "fftSize": 2048,
            },
        )
        assert create_response.status_code == 200
        task = create_response.json()
        task_id = task["id"]
        assert task["status"] == "live"
        assert task["owner"] == "self"

        # Pause
        pause_response = await client.post(f"/api/tasks/{task_id}/pause")
        assert pause_response.status_code == 200
        paused_task = pause_response.json()
        assert paused_task["status"] == "paused"
        assert paused_task["fps"] == 0

        # Resume
        resume_response = await client.post(f"/api/tasks/{task_id}/resume")
        assert resume_response.status_code == 200
        resumed_task = resume_response.json()
        assert resumed_task["status"] == "live"
        assert resumed_task["fps"] > 0

        # Start recording
        record_response = await client.post(f"/api/tasks/{task_id}/record")
        assert record_response.status_code == 200
        recording_task = record_response.json()
        assert recording_task["recording"] is not None
        assert recording_task["recording"]["isRecording"] is True

        # Stop recording
        stop_response = await client.delete(f"/api/tasks/{task_id}/record")
        assert stop_response.status_code == 200
        stopped_task = stop_response.json()
        assert stopped_task["recording"] is None

        # Delete
        delete_response = await client.delete(f"/api/tasks/{task_id}")
        assert delete_response.status_code == 200

        # Verify deletion
        get_response = await client.get(f"/api/tasks/{task_id}")
        assert get_response.status_code == 404

    @pytest.mark.asyncio
    async def test_tx_task_creation_and_playback(self, client: AsyncClient) -> None:
        """Test TX task creation with playback configuration"""
        # Create TX task
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "Transmit Test",
                "filename": "test_signal.sigmf",
                "loop": True,
                "frequency": 433.92e6,
            },
        )
        assert create_response.status_code == 200
        task = create_response.json()
        task_id = task["id"]

        # Verify TX-specific fields
        assert task["type"] == "tx"
        assert task["status"] == "transmitting"
        assert task["playback"] is not None
        assert task["playback"]["filename"] == "test_signal.sigmf"
        assert task["playback"]["isLooping"] is True

        # Cleanup
        await client.delete(f"/api/tasks/{task_id}")

    @pytest.mark.asyncio
    async def test_task_update_preserves_source(self, client: AsyncClient) -> None:
        """Verify that updating a task doesn't break its data source"""
        # Create task
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "Update Test",
                "frequency": 100e6,
                "sampleRate": 1e6,
                "bandwidth": 500e3,
                "fftSize": 1024,
            },
        )
        task = create_response.json()
        task_id = task["id"]

        # Get initial sources
        sources_before = await client.get("/api/sources/")
        source_ids_before = {s["id"] for s in sources_before.json()}
        assert f"{task_id}-spectral" in source_ids_before

        # Update task
        update_response = await client.put(
            f"/api/tasks/{task_id}",
            json={"name": "Updated Name", "frequency": 200e6},
        )
        assert update_response.status_code == 200
        updated_task = update_response.json()
        assert updated_task["name"] == "Updated Name"
        assert updated_task["frequency"] == 200e6

        # Verify source still exists
        sources_after = await client.get("/api/sources/")
        source_ids_after = {s["id"] for s in sources_after.json()}
        assert f"{task_id}-spectral" in source_ids_after

        # Cleanup
        await client.delete(f"/api/tasks/{task_id}")


class TestSourceManagement:
    """Test data source lifecycle and management"""

    @pytest.mark.asyncio
    async def test_source_registered_on_task_creation(self, client: AsyncClient) -> None:
        """Verify data source is automatically registered when task is created"""
        # Get initial source count
        initial_sources = await client.get("/api/sources/")
        initial_count = len(initial_sources.json())

        # Create task
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "Source Registration Test",
                "frequency": 800e6,
                "sampleRate": 2e6,
                "bandwidth": 1e6,
                "fftSize": 2048,
            },
        )
        task_id = create_response.json()["id"]

        # Verify source was registered
        sources_after = await client.get("/api/sources/")
        sources_list = sources_after.json()
        assert len(sources_list) == initial_count + 1

        # Verify source fields (not nested under metadata)
        new_source = next(s for s in sources_list if s["id"] == f"{task_id}-spectral")
        assert new_source["centerFrequency"] == 800e6
        assert new_source["sampleRate"] == 2e6
        assert new_source["parentTaskId"] == task_id

        # Cleanup
        await client.delete(f"/api/tasks/{task_id}")

    @pytest.mark.asyncio
    async def test_multiple_concurrent_tasks(self, client: AsyncClient) -> None:
        """Test creating multiple tasks and verify each gets its own source"""
        task_ids = []

        # Create multiple tasks
        for i in range(3):
            response = await client.post(
                "/api/tasks/",
                json={
                    "name": f"Concurrent Task {i}",
                    "frequency": (100 + i * 10) * 1e6,
                    "sampleRate": 1e6,
                    "bandwidth": 500e3,
                    "fftSize": 1024,
                },
            )
            assert response.status_code == 200
            task_ids.append(response.json()["id"])

        # Verify all sources exist
        sources = await client.get("/api/sources/")
        source_ids = {s["id"] for s in sources.json()}

        for task_id in task_ids:
            assert f"{task_id}-spectral" in source_ids

        # Delete in reverse order and verify cleanup
        for task_id in reversed(task_ids):
            await client.delete(f"/api/tasks/{task_id}")

            sources = await client.get("/api/sources/")
            source_ids = {s["id"] for s in sources.json()}
            assert f"{task_id}-spectral" not in source_ids


class TestErrorHandling:
    """Test error cases and edge conditions"""

    @pytest.mark.asyncio
    async def test_cannot_control_external_task(self, client: AsyncClient) -> None:
        """Verify external tasks cannot be controlled"""
        import time
        from app.models.generated import Task, TaskType, TaskStatus, TaskOwner

        # Create an external task for testing (since mock tasks may not be seeded)
        task_id = "test-external-task"
        now = int(time.time() * 1000)
        external_task = Task(
            id=task_id,
            name="External Test Task",
            type=TaskType.rx,
            frequency=100e6,
            sampleRate=1e6,
            bandwidth=1e6,
            fftSize=2048,
            owner=TaskOwner.external,
            ownerName="External System",
            status=TaskStatus.live,
            uptime=0,
            createdAt=now,
            fps=60,
            visualizationMode=None,
        )
        tasks[task_id] = external_task

        try:
            pause_response = await client.post(f"/api/tasks/{task_id}/pause")
            assert pause_response.status_code == 403

            resume_response = await client.post(f"/api/tasks/{task_id}/resume")
            assert resume_response.status_code == 403

            record_response = await client.post(f"/api/tasks/{task_id}/record")
            assert record_response.status_code == 403
        finally:
            # Cleanup
            del tasks[task_id]

    @pytest.mark.asyncio
    async def test_cannot_record_tx_task(self, client: AsyncClient) -> None:
        """Verify TX tasks cannot be recorded"""
        # Create TX task
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "TX Record Test",
                "filename": "signal.sigmf",
                "loop": False,
            },
        )
        task_id = create_response.json()["id"]

        # Try to record
        record_response = await client.post(f"/api/tasks/{task_id}/record")
        assert record_response.status_code == 400

        # Cleanup
        await client.delete(f"/api/tasks/{task_id}")

    @pytest.mark.asyncio
    async def test_invalid_task_parameters(self, client: AsyncClient) -> None:
        """Test validation of task parameters"""
        # Missing required fields
        response = await client.post(
            "/api/tasks/",
            json={"name": "Incomplete Task"},
        )
        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_update_nonexistent_task(self, client: AsyncClient) -> None:
        """Test updating a task that doesn't exist"""
        response = await client.put(
            "/api/tasks/nonexistent-id",
            json={"name": "New Name"},
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_task(self, client: AsyncClient) -> None:
        """Test deleting a task that doesn't exist"""
        response = await client.delete("/api/tasks/nonexistent-id")
        assert response.status_code == 404


class TestDataValidation:
    """Test input validation and data contracts"""

    @pytest.mark.asyncio
    async def test_task_response_contains_all_fields(self, client: AsyncClient) -> None:
        """Verify task response includes all required fields"""
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "Field Validation Test",
                "frequency": 500e6,
                "sampleRate": 5e6,
                "bandwidth": 2e6,
                "fftSize": 4096,
            },
        )
        task = create_response.json()

        # Required fields
        assert "id" in task
        assert "name" in task
        assert "type" in task
        assert "frequency" in task
        assert "sampleRate" in task
        assert "bandwidth" in task
        assert "fftSize" in task
        assert "owner" in task
        assert "status" in task
        assert "createdAt" in task
        assert "fps" in task

        # Verify values
        assert task["frequency"] == 500e6
        assert task["sampleRate"] == 5e6
        assert task["fftSize"] == 4096

        # Cleanup
        await client.delete(f"/api/tasks/{task['id']}")

    @pytest.mark.asyncio
    async def test_source_metadata_accuracy(self, client: AsyncClient) -> None:
        """Verify source metadata matches task configuration"""
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "Metadata Test",
                "frequency": 2.4e9,
                "sampleRate": 20e6,
                "bandwidth": 20e6,
                "fftSize": 8192,
            },
        )
        task_id = create_response.json()["id"]

        # Get source
        sources = await client.get("/api/sources/")
        source = next(s for s in sources.json() if s["id"] == f"{task_id}-spectral")

        # Verify source fields (not nested under metadata)
        assert source["centerFrequency"] == 2.4e9
        assert source["sampleRate"] == 20e6
        assert source["type"] == "spectral"
        assert source["parentTaskId"] == task_id

        # Cleanup
        await client.delete(f"/api/tasks/{task_id}")


class TestHealthAndStatus:
    """Test health and status endpoints"""

    @pytest.mark.asyncio
    async def test_healthcheck_endpoint(self, client: AsyncClient) -> None:
        """Verify healthcheck endpoint returns expected format"""
        response = await client.get("/api/healthcheck")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "backend"

    @pytest.mark.asyncio
    async def test_root_api_endpoint(self, client: AsyncClient) -> None:
        """Verify root API endpoint returns service info"""
        response = await client.get("/api/")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        assert "status" in data
        assert data["status"] == "running"
