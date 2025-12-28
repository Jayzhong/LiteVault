"""Tags API integration tests."""

import pytest
from httpx import AsyncClient


class TestGetTags:
    """Tests for GET /tags endpoint."""

    async def test_get_tags_empty(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """GET /tags should return empty list when no tags exist."""
        response = await client.get(
            "/api/v1/tags",
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["tags"] == []
        assert data["total"] == 0

    async def test_get_tags_requires_auth(self, client: AsyncClient):
        """GET /tags should require authentication."""
        response = await client.get("/api/v1/tags")
        assert response.status_code == 401


class TestCreateTag:
    """Tests for POST /tags endpoint."""

    async def test_create_tag_success(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """POST /tags should create a new tag."""
        response = await client.post(
            "/api/v1/tags",
            json={"name": "Meetings"},
            headers=dev_user_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Meetings"
        assert data["usageCount"] == 0
        assert data["lastUsed"] is None
        assert "id" in data
        assert "createdAt" in data

    async def test_create_tag_duplicate_returns_409(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """POST /tags with duplicate name should return 409."""
        # Create first tag
        response1 = await client.post(
            "/api/v1/tags",
            json={"name": "Design"},
            headers=dev_user_headers,
        )
        assert response1.status_code == 201
        
        # Try to create duplicate (same case)
        response2 = await client.post(
            "/api/v1/tags",
            json={"name": "Design"},
            headers=dev_user_headers,
        )
        assert response2.status_code == 409
        data = response2.json()
        assert data["error"]["code"] == "TAG_EXISTS"

    async def test_create_tag_case_insensitive_duplicate(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """POST /tags with different case should still return 409."""
        # Create first tag
        await client.post(
            "/api/v1/tags",
            json={"name": "Research"},
            headers=dev_user_headers,
        )
        
        # Try to create duplicate with different case
        response = await client.post(
            "/api/v1/tags",
            json={"name": "RESEARCH"},
            headers=dev_user_headers,
        )
        assert response.status_code == 409

    async def test_create_tag_trims_whitespace(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """POST /tags should trim whitespace from name."""
        response = await client.post(
            "/api/v1/tags",
            json={"name": "  Notes  "},
            headers=dev_user_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Notes"


class TestRenameTag:
    """Tests for PATCH /tags/:id endpoint."""

    async def test_rename_tag_success(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """PATCH /tags/:id should rename the tag."""
        # Create tag
        create_response = await client.post(
            "/api/v1/tags",
            json={"name": "OldName"},
            headers=dev_user_headers,
        )
        tag_id = create_response.json()["id"]
        
        # Rename
        response = await client.patch(
            f"/api/v1/tags/{tag_id}",
            json={"name": "NewName"},
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "NewName"

    async def test_rename_tag_duplicate_returns_409(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """PATCH /tags/:id with existing name should return 409."""
        # Create two tags
        await client.post(
            "/api/v1/tags",
            json={"name": "TagA"},
            headers=dev_user_headers,
        )
        create_b = await client.post(
            "/api/v1/tags",
            json={"name": "TagB"},
            headers=dev_user_headers,
        )
        tag_b_id = create_b.json()["id"]
        
        # Try to rename TagB to TagA
        response = await client.patch(
            f"/api/v1/tags/{tag_b_id}",
            json={"name": "TagA"},
            headers=dev_user_headers,
        )
        assert response.status_code == 409


class TestDeleteTag:
    """Tests for DELETE /tags/:id endpoint."""

    async def test_delete_tag_success(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """DELETE /tags/:id should remove the tag."""
        # Create tag
        create_response = await client.post(
            "/api/v1/tags",
            json={"name": "ToDelete"},
            headers=dev_user_headers,
        )
        tag_id = create_response.json()["id"]
        
        # Delete
        response = await client.delete(
            f"/api/v1/tags/{tag_id}",
            headers=dev_user_headers,
        )
        assert response.status_code == 204
        
        # Verify deleted
        list_response = await client.get(
            "/api/v1/tags",
            headers=dev_user_headers,
        )
        tags = list_response.json()["tags"]
        assert not any(t["id"] == tag_id for t in tags)

    async def test_delete_nonexistent_returns_404(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """DELETE /tags/:id for nonexistent tag should return 404."""
        response = await client.delete(
            "/api/v1/tags/nonexistent-id",
            headers=dev_user_headers,
        )
        assert response.status_code == 404


class TestTagFiltering:
    """Tests for tag filtering and sorting."""

    async def test_get_tags_with_query_filter(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """GET /tags?q= should filter by name."""
        # Create tags
        await client.post("/api/v1/tags", json={"name": "MeetingNotes"}, headers=dev_user_headers)
        await client.post("/api/v1/tags", json={"name": "Design"}, headers=dev_user_headers)
        await client.post("/api/v1/tags", json={"name": "Meeting"}, headers=dev_user_headers)
        
        # Filter by 'meeting'
        response = await client.get(
            "/api/v1/tags?q=meeting",
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["tags"]) == 2
        names = [t["name"] for t in data["tags"]]
        assert "Meeting" in names
        assert "MeetingNotes" in names
