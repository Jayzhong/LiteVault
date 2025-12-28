"""Health endpoint tests."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient) -> None:
    """Test health check endpoint returns ok."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_health_check_has_request_id(client: AsyncClient) -> None:
    """Test health check response includes X-Request-Id header."""
    response = await client.get("/health")
    assert "X-Request-Id" in response.headers
    assert response.headers["X-Request-Id"].startswith("req-")
