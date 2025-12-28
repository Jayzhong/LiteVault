"""Auth endpoint integration tests."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_me_requires_auth(client: AsyncClient) -> None:
    """Test GET /auth/me returns 401 without auth."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "UNAUTHORIZED"
    assert "requestId" in data["error"]


@pytest.mark.asyncio
async def test_auth_me_with_dev_fallback(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test GET /auth/me works with X-Dev-User-Id in mixed mode."""
    response = await client.get(
        "/api/v1/auth/me",
        headers=dev_user_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "test-user-123"
    assert data["plan"] == "free"
    assert data["clerkUserId"] is None  # Dev users don't have Clerk ID


@pytest.mark.asyncio
async def test_auth_me_response_has_request_id_header(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test auth/me response has X-Request-Id header."""
    response = await client.get(
        "/api/v1/auth/me",
        headers=dev_user_headers
    )
    assert response.status_code == 200
    assert "X-Request-Id" in response.headers


@pytest.mark.asyncio
async def test_auth_me_returns_user_fields(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test GET /auth/me returns expected fields."""
    response = await client.get(
        "/api/v1/auth/me",
        headers=dev_user_headers
    )
    assert response.status_code == 200
    data = response.json()
    
    # Check all expected fields are present
    assert "id" in data
    assert "clerkUserId" in data
    assert "email" in data
    assert "displayName" in data
    assert "avatarUrl" in data
    assert "plan" in data
    assert "createdAt" in data


@pytest.mark.asyncio
async def test_items_still_work_with_dev_auth(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test items endpoints still work with dev auth (no regression)."""
    # Create an item
    response = await client.post(
        "/api/v1/items",
        json={"rawText": "Test item for auth regression"},
        headers=dev_user_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "ENRICHING"
    
    # Get pending items
    response = await client.get(
        "/api/v1/items/pending",
        headers=dev_user_headers
    )
    assert response.status_code == 200
