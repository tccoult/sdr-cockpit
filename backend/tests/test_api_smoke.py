"""
Smoke tests for backend API

These tests verify the API endpoints exist and basic operations work.
They intentionally avoid testing implementation details to remain stable
during refactoring.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    """Create async test client"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.mark.asyncio
async def test_health_endpoint_responds(client):
    """Verify health endpoint is accessible"""
    response = await client.get("/api/")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


@pytest.mark.asyncio
async def test_can_list_tasks(client):
    """Verify task listing endpoint works"""
    response = await client.get("/api/tasks/")
    assert response.status_code == 200
    tasks = response.json()
    assert isinstance(tasks, list)


@pytest.mark.asyncio
async def test_can_create_and_delete_rx_task(client):
    """Verify basic RX task lifecycle works"""
    # Create task
    create_response = await client.post(
        "/api/tasks/",
        json={
            "name": "Test Task",
            "frequency": 100e6,
            "sampleRate": 2e6,
            "bandwidth": 1e6,
            "fftSize": 2048,
        },
    )
    assert create_response.status_code == 200
    task = create_response.json()

    # Verify task has basic fields
    assert "id" in task
    assert "name" in task
    assert task["name"] == "Test Task"

    # Verify we can get it
    task_id = task["id"]
    get_response = await client.get(f"/api/tasks/{task_id}")
    assert get_response.status_code == 200

    # Verify we can delete it
    delete_response = await client.delete(f"/api/tasks/{task_id}")
    assert delete_response.status_code == 200

    # Verify it's gone
    get_after_delete = await client.get(f"/api/tasks/{task_id}")
    assert get_after_delete.status_code == 404


@pytest.mark.asyncio
async def test_deleting_task_removes_source(client):
    """Ensure deleting a task unregisters its data source"""
    create_response = await client.post(
        "/api/tasks/",
        json={
            "name": "Source Cleanup",
            "frequency": 915e6,
            "sampleRate": 2.4e6,
            "bandwidth": 2.4e6,
            "fftSize": 2048,
        },
    )
    assert create_response.status_code == 200
    task_id = create_response.json()["id"]

    sources_before = await client.get("/api/sources/")
    assert sources_before.status_code == 200
    source_ids = {source["id"] for source in sources_before.json()}
    assert f"{task_id}-spectral" in source_ids

    delete_response = await client.delete(f"/api/tasks/{task_id}")
    assert delete_response.status_code == 200

    sources_after = await client.get("/api/sources/")
    assert sources_after.status_code == 200
    remaining_source_ids = {source["id"] for source in sources_after.json()}
    assert f"{task_id}-spectral" not in remaining_source_ids


@pytest.mark.asyncio
async def test_can_pause_and_resume_task(client):
    """Verify task control endpoints work"""
    # Create task
    create_response = await client.post(
        "/api/tasks/",
        json={
            "name": "Control Test",
            "frequency": 100e6,
            "sampleRate": 2e6,
            "bandwidth": 1e6,
            "fftSize": 2048,
        },
    )
    task_id = create_response.json()["id"]

    # Pause
    pause_response = await client.post(f"/api/tasks/{task_id}/pause")
    assert pause_response.status_code == 200
    paused = pause_response.json()
    assert "status" in paused

    # Resume
    resume_response = await client.post(f"/api/tasks/{task_id}/resume")
    assert resume_response.status_code == 200
    resumed = resume_response.json()
    assert "status" in resumed

    # Cleanup
    await client.delete(f"/api/tasks/{task_id}")


@pytest.mark.asyncio
async def test_404_on_nonexistent_task(client):
    """Verify API returns 404 for missing tasks"""
    response = await client.get("/api/tasks/nonexistent-task-id")
    assert response.status_code == 404
