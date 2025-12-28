"""Profile endpoint integration tests."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_me_returns_user_with_defaults(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test GET /me returns user with default preferences."""
    response = await client.get("/api/v1/auth/me", headers=dev_user_headers)
    assert response.status_code == 200
    data = response.json()
    
    # Check user fields
    assert "id" in data
    assert data["id"] == "test-user-123"
    assert "email" in data
    assert "displayName" in data
    assert "nickname" in data
    assert "bio" in data
    assert "avatarUrl" in data
    assert "createdAt" in data
    assert "updatedAt" in data
    
    # Check preferences with defaults
    assert "preferences" in data
    prefs = data["preferences"]
    assert prefs["defaultLanguage"] == "en"
    assert prefs["timezone"] == "UTC"
    assert prefs["aiSuggestionsEnabled"] is True


@pytest.mark.asyncio
async def test_update_profile_nickname(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test PATCH /me/profile updates nickname."""
    # First ensure user exists
    await client.get("/api/v1/auth/me", headers=dev_user_headers)
    
    # Update nickname
    response = await client.patch(
        "/api/v1/auth/me/profile",
        json={"nickname": "TestNickname"},
        headers=dev_user_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["nickname"] == "TestNickname"


@pytest.mark.asyncio
async def test_update_profile_bio(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test PATCH /me/profile updates bio."""
    await client.get("/api/v1/auth/me", headers=dev_user_headers)
    
    response = await client.patch(
        "/api/v1/auth/me/profile",
        json={"bio": "This is my bio text"},
        headers=dev_user_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["bio"] == "This is my bio text"


@pytest.mark.asyncio
async def test_update_profile_avatar_url(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test PATCH /me/profile updates avatarUrl with valid URL."""
    await client.get("/api/v1/auth/me", headers=dev_user_headers)
    
    response = await client.patch(
        "/api/v1/auth/me/profile",
        json={"avatarUrl": "https://example.com/avatar.png"},
        headers=dev_user_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["avatarUrl"] == "https://example.com/avatar.png"


@pytest.mark.asyncio
async def test_update_profile_invalid_avatar_url(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test PATCH /me/profile rejects invalid avatar URL."""
    await client.get("/api/v1/auth/me", headers=dev_user_headers)
    
    response = await client.patch(
        "/api/v1/auth/me/profile",
        json={"avatarUrl": "not-a-valid-url"},
        headers=dev_user_headers
    )
    assert response.status_code == 422  # Pydantic validation error
    data = response.json()
    assert "error" in data
    assert "requestId" in data["error"]


@pytest.mark.asyncio
async def test_update_profile_nickname_too_long(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test PATCH /me/profile rejects too long nickname."""
    await client.get("/api/v1/auth/me", headers=dev_user_headers)
    
    response = await client.patch(
        "/api/v1/auth/me/profile",
        json={"nickname": "a" * 50},  # Max is 40
        headers=dev_user_headers
    )
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert "requestId" in data["error"]


@pytest.mark.asyncio
async def test_update_preferences_ai_toggle(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test PATCH /me/preferences updates AI suggestions toggle."""
    await client.get("/api/v1/auth/me", headers=dev_user_headers)
    
    response = await client.patch(
        "/api/v1/auth/me/preferences",
        json={"aiSuggestionsEnabled": False},
        headers=dev_user_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["preferences"]["aiSuggestionsEnabled"] is False


@pytest.mark.asyncio
async def test_update_preferences_language(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test PATCH /me/preferences updates language."""
    await client.get("/api/v1/auth/me", headers=dev_user_headers)
    
    response = await client.patch(
        "/api/v1/auth/me/preferences",
        json={"defaultLanguage": "zh"},
        headers=dev_user_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["preferences"]["defaultLanguage"] == "zh"


@pytest.mark.asyncio
async def test_update_preferences_timezone(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test PATCH /me/preferences updates timezone."""
    await client.get("/api/v1/auth/me", headers=dev_user_headers)
    
    response = await client.patch(
        "/api/v1/auth/me/preferences",
        json={"timezone": "America/New_York"},
        headers=dev_user_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["preferences"]["timezone"] == "America/New_York"


@pytest.mark.asyncio
async def test_update_preferences_invalid_language(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test PATCH /me/preferences rejects invalid language."""
    await client.get("/api/v1/auth/me", headers=dev_user_headers)
    
    response = await client.patch(
        "/api/v1/auth/me/preferences",
        json={"defaultLanguage": "invalid"},
        headers=dev_user_headers
    )
    assert response.status_code == 422
    data = response.json()
    assert "error" in data


@pytest.mark.asyncio
async def test_preferences_persist_after_refresh(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test preferences persist after fetching again."""
    await client.get("/api/v1/auth/me", headers=dev_user_headers)
    
    # Update preferences
    await client.patch(
        "/api/v1/auth/me/preferences",
        json={"aiSuggestionsEnabled": False, "timezone": "Europe/London"},
        headers=dev_user_headers
    )
    
    # Fetch again
    response = await client.get("/api/v1/auth/me", headers=dev_user_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["preferences"]["aiSuggestionsEnabled"] is False
    assert data["preferences"]["timezone"] == "Europe/London"


@pytest.mark.asyncio
async def test_me_requires_auth(client: AsyncClient) -> None:
    """Test GET /me returns 401 without auth."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "UNAUTHORIZED"
    assert "requestId" in data["error"]


@pytest.mark.asyncio
async def test_profile_update_requires_auth(client: AsyncClient) -> None:
    """Test PATCH /me/profile returns 401 without auth."""
    response = await client.patch(
        "/api/v1/auth/me/profile",
        json={"nickname": "test"}
    )
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_preferences_update_requires_auth(client: AsyncClient) -> None:
    """Test PATCH /me/preferences returns 401 without auth."""
    response = await client.patch(
        "/api/v1/auth/me/preferences",
        json={"aiSuggestionsEnabled": False}
    )
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "UNAUTHORIZED"
