"""Comprehensive tests for task management API routes"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.task import TaskStatus, TaskType, TaskOwner


@pytest.fixture
async def client():
    """Create async test client"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture(autouse=True)
def reset_tasks():
    """Reset task storage before each test"""
    from app.api.routes.tasks import tasks, task_counter
    tasks.clear()
    # Reset counter - accessing the module's global
    import app.api.routes.tasks as tasks_module
    tasks_module.task_counter = 1


class TestListTasks:
    """Tests for GET /api/tasks/"""

    @pytest.mark.asyncio
    async def test_list_tasks_empty(self, client):
        """Should return empty list when no tasks exist"""
        response = await client.get("/api/tasks/")
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_list_tasks_with_data(self, client):
        """Should return all tasks"""
        # Create a task first
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "Test RX Task",
                "frequency": 100e6,
                "sample_rate": 2e6,
                "bandwidth": 1e6,
                "fft_size": 2048,
            },
        )
        assert create_response.status_code == 200

        # List tasks
        response = await client.get("/api/tasks/")
        assert response.status_code == 200
        tasks = response.json()
        assert len(tasks) == 1
        assert tasks[0]["name"] == "Test RX Task"


class TestCreateTask:
    """Tests for POST /api/tasks/"""

    @pytest.mark.asyncio
    async def test_create_rx_task(self, client):
        """Should create RX task with correct fields"""
        response = await client.post(
            "/api/tasks/",
            json={
                "name": "FM Radio Monitor",
                "frequency": 98.5e6,
                "sample_rate": 2e6,
                "bandwidth": 200e3,
                "fft_size": 2048,
            },
        )

        assert response.status_code == 200
        task = response.json()
        assert task["id"] == "task-1"
        assert task["name"] == "FM Radio Monitor"
        assert task["type"] == TaskType.RX
        assert task["frequency"] == 98.5e6
        assert task["sampleRate"] == 2e6
        assert task["bandwidth"] == 200e3
        assert task["fftSize"] == 2048
        assert task["owner"] == TaskOwner.SELF
        assert task["ownerName"] == "You"
        assert task["status"] == TaskStatus.LIVE
        assert task["uptime"] == 0
        assert "createdAt" in task
        assert task["recording"] is None
        assert task["playback"] is None

    @pytest.mark.asyncio
    async def test_create_tx_task(self, client):
        """Should create TX task with playback info"""
        response = await client.post(
            "/api/tasks/",
            json={
                "name": "Signal Replay",
                "filename": "capture.sigmf",
                "frequency": 433.92e6,
                "loop": True,
            },
        )

        assert response.status_code == 200
        task = response.json()
        assert task["id"] == "task-1"
        assert task["name"] == "Signal Replay"
        assert task["type"] == TaskType.TX
        assert task["frequency"] == 433.92e6
        assert task["status"] == TaskStatus.TRANSMITTING
        assert task["playback"] is not None
        assert task["playback"]["filename"] == "capture.sigmf"
        assert task["playback"]["isLooping"] is True
        assert task["playback"]["progress"] == 0.0
        assert task["recording"] is None

    @pytest.mark.asyncio
    async def test_create_multiple_tasks_increments_id(self, client):
        """Should increment task IDs"""
        response1 = await client.post(
            "/api/tasks/",
            json={
                "name": "Task 1",
                "frequency": 100e6,
                "sample_rate": 2e6,
                "bandwidth": 1e6,
                "fft_size": 2048,
            },
        )
        response2 = await client.post(
            "/api/tasks/",
            json={
                "name": "Task 2",
                "frequency": 200e6,
                "sample_rate": 2e6,
                "bandwidth": 1e6,
                "fft_size": 2048,
            },
        )

        assert response1.json()["id"] == "task-1"
        assert response2.json()["id"] == "task-2"


class TestGetTask:
    """Tests for GET /api/tasks/{task_id}"""

    @pytest.mark.asyncio
    async def test_get_task_success(self, client):
        """Should return task by ID"""
        # Create task
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "Test Task",
                "frequency": 100e6,
                "sample_rate": 2e6,
                "bandwidth": 1e6,
                "fft_size": 2048,
            },
        )
        task_id = create_response.json()["id"]

        # Get task
        response = await client.get(f"/api/tasks/{task_id}")
        assert response.status_code == 200
        task = response.json()
        assert task["id"] == task_id
        assert task["name"] == "Test Task"

    @pytest.mark.asyncio
    async def test_get_task_not_found(self, client):
        """Should return 404 for non-existent task"""
        response = await client.get("/api/tasks/nonexistent")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestUpdateTask:
    """Tests for PUT /api/tasks/{task_id}"""

    @pytest.mark.asyncio
    async def test_update_task_name(self, client):
        """Should update task name"""
        # Create task
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "Old Name",
                "frequency": 100e6,
                "sample_rate": 2e6,
                "bandwidth": 1e6,
                "fft_size": 2048,
            },
        )
        task_id = create_response.json()["id"]

        # Update task
        response = await client.put(
            f"/api/tasks/{task_id}",
            json={"name": "New Name"},
        )
        assert response.status_code == 200
        task = response.json()
        assert task["name"] == "New Name"
        assert task["frequency"] == 100e6  # Unchanged

    @pytest.mark.asyncio
    async def test_update_task_frequency(self, client):
        """Should update task frequency"""
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "Test Task",
                "frequency": 100e6,
                "sample_rate": 2e6,
                "bandwidth": 1e6,
                "fft_size": 2048,
            },
        )
        task_id = create_response.json()["id"]

        response = await client.put(
            f"/api/tasks/{task_id}",
            json={"frequency": 200e6},
        )
        assert response.status_code == 200
        assert response.json()["frequency"] == 200e6

    @pytest.mark.asyncio
    async def test_update_task_status(self, client):
        """Should update task status and FPS"""
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "Test Task",
                "frequency": 100e6,
                "sample_rate": 2e6,
                "bandwidth": 1e6,
                "fft_size": 2048,
            },
        )
        task_id = create_response.json()["id"]

        # Pause via update
        response = await client.put(
            f"/api/tasks/{task_id}",
            json={"status": TaskStatus.PAUSED},
        )
        assert response.status_code == 200
        task = response.json()
        assert task["status"] == TaskStatus.PAUSED
        assert task["fps"] == 0

        # Resume via update
        response = await client.put(
            f"/api/tasks/{task_id}",
            json={"status": TaskStatus.LIVE},
        )
        task = response.json()
        assert task["status"] == TaskStatus.LIVE
        assert task["fps"] > 0

    @pytest.mark.asyncio
    async def test_update_task_not_found(self, client):
        """Should return 404 for non-existent task"""
        response = await client.put(
            "/api/tasks/nonexistent",
            json={"name": "New Name"},
        )
        assert response.status_code == 404


class TestDeleteTask:
    """Tests for DELETE /api/tasks/{task_id}"""

    @pytest.mark.asyncio
    async def test_delete_task_success(self, client):
        """Should delete task and return confirmation"""
        # Create task
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "Test Task",
                "frequency": 100e6,
                "sample_rate": 2e6,
                "bandwidth": 1e6,
                "fft_size": 2048,
            },
        )
        task_id = create_response.json()["id"]

        # Delete task
        response = await client.delete(f"/api/tasks/{task_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == task_id
        assert "deleted" in data["message"].lower()

        # Verify task is gone
        get_response = await client.get(f"/api/tasks/{task_id}")
        assert get_response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_task_not_found(self, client):
        """Should return 404 for non-existent task"""
        response = await client.delete("/api/tasks/nonexistent")
        assert response.status_code == 404


class TestPauseTask:
    """Tests for POST /api/tasks/{task_id}/pause"""

    @pytest.mark.asyncio
    async def test_pause_task_success(self, client):
        """Should pause task and set FPS to 0"""
        # Create task
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "Test Task",
                "frequency": 100e6,
                "sample_rate": 2e6,
                "bandwidth": 1e6,
                "fft_size": 2048,
            },
        )
        task_id = create_response.json()["id"]

        # Pause task
        response = await client.post(f"/api/tasks/{task_id}/pause")
        assert response.status_code == 200
        task = response.json()
        assert task["status"] == TaskStatus.PAUSED
        assert task["fps"] == 0

    @pytest.mark.asyncio
    async def test_pause_task_not_found(self, client):
        """Should return 404 for non-existent task"""
        response = await client.post("/api/tasks/nonexistent/pause")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_pause_external_task_forbidden(self, client):
        """Should return 403 when trying to pause external task"""
        # Create task
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "Test Task",
                "frequency": 100e6,
                "sample_rate": 2e6,
                "bandwidth": 1e6,
                "fft_size": 2048,
            },
        )
        task_id = create_response.json()["id"]

        # Manually change owner to EXTERNAL (simulate external task)
        from app.api.routes.tasks import tasks
        tasks[task_id].owner = TaskOwner.EXTERNAL

        # Try to pause - should fail
        response = await client.post(f"/api/tasks/{task_id}/pause")
        assert response.status_code == 403
        assert "external" in response.json()["detail"].lower()


class TestResumeTask:
    """Tests for POST /api/tasks/{task_id}/resume"""

    @pytest.mark.asyncio
    async def test_resume_rx_task(self, client):
        """Should resume RX task to LIVE status"""
        # Create and pause RX task
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "RX Task",
                "frequency": 100e6,
                "sample_rate": 2e6,
                "bandwidth": 1e6,
                "fft_size": 2048,
            },
        )
        task_id = create_response.json()["id"]
        await client.post(f"/api/tasks/{task_id}/pause")

        # Resume task
        response = await client.post(f"/api/tasks/{task_id}/resume")
        assert response.status_code == 200
        task = response.json()
        assert task["status"] == TaskStatus.LIVE
        assert task["fps"] > 0

    @pytest.mark.asyncio
    async def test_resume_tx_task(self, client):
        """Should resume TX task to TRANSMITTING status"""
        # Create TX task
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "TX Task",
                "filename": "test.sigmf",
                "loop": False,
            },
        )
        task_id = create_response.json()["id"]

        # Pause it
        from app.api.routes.tasks import tasks
        tasks[task_id].status = TaskStatus.PAUSED

        # Resume task
        response = await client.post(f"/api/tasks/{task_id}/resume")
        assert response.status_code == 200
        task = response.json()
        assert task["status"] == TaskStatus.TRANSMITTING
        assert task["fps"] > 0

    @pytest.mark.asyncio
    async def test_resume_task_not_found(self, client):
        """Should return 404 for non-existent task"""
        response = await client.post("/api/tasks/nonexistent/resume")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_resume_external_task_forbidden(self, client):
        """Should return 403 when trying to resume external task"""
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "Test Task",
                "frequency": 100e6,
                "sample_rate": 2e6,
                "bandwidth": 1e6,
                "fft_size": 2048,
            },
        )
        task_id = create_response.json()["id"]

        # Make it external
        from app.api.routes.tasks import tasks
        tasks[task_id].owner = TaskOwner.EXTERNAL

        response = await client.post(f"/api/tasks/{task_id}/resume")
        assert response.status_code == 403


class TestRecording:
    """Tests for recording endpoints"""

    @pytest.mark.asyncio
    async def test_start_recording_success(self, client):
        """Should start recording on RX task"""
        # Create RX task
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "RX Task",
                "frequency": 100e6,
                "sample_rate": 2e6,
                "bandwidth": 1e6,
                "fft_size": 2048,
            },
        )
        task_id = create_response.json()["id"]

        # Start recording
        response = await client.post(f"/api/tasks/{task_id}/record")
        assert response.status_code == 200
        task = response.json()
        assert task["recording"] is not None
        assert task["recording"]["isRecording"] is True
        assert task["recording"]["duration"] == 0
        assert task["recording"]["fileSize"] == 0
        assert ".sigmf" in task["recording"]["filename"]

    @pytest.mark.asyncio
    async def test_start_recording_on_tx_task_fails(self, client):
        """Should reject recording on TX task"""
        # Create TX task
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "TX Task",
                "filename": "test.sigmf",
                "loop": False,
            },
        )
        task_id = create_response.json()["id"]

        # Try to record - should fail
        response = await client.post(f"/api/tasks/{task_id}/record")
        assert response.status_code == 400
        assert "rx" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_start_recording_not_found(self, client):
        """Should return 404 for non-existent task"""
        response = await client.post("/api/tasks/nonexistent/record")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_start_recording_external_task_forbidden(self, client):
        """Should return 403 for external task"""
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "RX Task",
                "frequency": 100e6,
                "sample_rate": 2e6,
                "bandwidth": 1e6,
                "fft_size": 2048,
            },
        )
        task_id = create_response.json()["id"]

        # Make it external
        from app.api.routes.tasks import tasks
        tasks[task_id].owner = TaskOwner.EXTERNAL

        response = await client.post(f"/api/tasks/{task_id}/record")
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_stop_recording_success(self, client):
        """Should stop recording and clear recording info"""
        # Create RX task and start recording
        create_response = await client.post(
            "/api/tasks/",
            json={
                "name": "RX Task",
                "frequency": 100e6,
                "sample_rate": 2e6,
                "bandwidth": 1e6,
                "fft_size": 2048,
            },
        )
        task_id = create_response.json()["id"]
        await client.post(f"/api/tasks/{task_id}/record")

        # Stop recording
        response = await client.delete(f"/api/tasks/{task_id}/record")
        assert response.status_code == 200
        task = response.json()
        assert task["recording"] is None

    @pytest.mark.asyncio
    async def test_stop_recording_not_found(self, client):
        """Should return 404 for non-existent task"""
        response = await client.delete("/api/tasks/nonexistent/record")
        assert response.status_code == 404
