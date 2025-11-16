"""Tests for API health endpoints"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_root_endpoint():
    """Test root endpoint returns expected data"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "SDR Cockpit API"
        assert data["status"] == "running"
        assert "version" in data


@pytest.mark.asyncio
async def test_health_endpoint():
    """Test health check endpoint"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/healthcheck")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "backend"
