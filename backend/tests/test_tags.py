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

    async def test_create_tag_upsert_returns_existing(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """POST /tags with existing name should return the existing tag (upsert)."""
        # Create first tag
        response1 = await client.post(
            "/api/v1/tags",
            json={"name": "Design"},
            headers=dev_user_headers,
        )
        assert response1.status_code == 201
        tag1 = response1.json()
        
        # Post same name again - should return existing tag with 200
        response2 = await client.post(
            "/api/v1/tags",
            json={"name": "Design"},
            headers=dev_user_headers,
        )
        assert response2.status_code == 200
        tag2 = response2.json()
        
        # Should be the same tag
        assert tag2["id"] == tag1["id"]
        assert tag2["name"] == "Design"

    async def test_create_tag_upsert_case_insensitive(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """POST /tags with different case should return existing tag (case-insensitive upsert)."""
        # Create first tag
        response1 = await client.post(
            "/api/v1/tags",
            json={"name": "Research"},
            headers=dev_user_headers,
        )
        assert response1.status_code == 201
        tag1 = response1.json()
        
        # Post with different case - should return existing tag with 200
        response2 = await client.post(
            "/api/v1/tags",
            json={"name": "RESEARCH"},
            headers=dev_user_headers,
        )
        assert response2.status_code == 200
        tag2 = response2.json()
        
        # Should be the same tag (original case preserved)
        assert tag2["id"] == tag1["id"]
        assert tag2["name"] == "Research"

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

    async def test_get_tags_sort_by_name(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """GET /tags?sort=name should sort alphabetically."""
        await client.post("/api/v1/tags", json={"name": "Zebra"}, headers=dev_user_headers)
        await client.post("/api/v1/tags", json={"name": "Apple"}, headers=dev_user_headers)
        await client.post("/api/v1/tags", json={"name": "Mango"}, headers=dev_user_headers)
        
        response = await client.get(
            "/api/v1/tags?sort=name",
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        names = [t["name"] for t in data["tags"]]
        assert names == sorted(names, key=str.lower)

    async def test_get_tags_unused_filter(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """GET /tags?unused=true should return only tags with usageCount=0."""
        # Create tags (all start with usageCount=0)
        await client.post("/api/v1/tags", json={"name": "UsedTag"}, headers=dev_user_headers)
        await client.post("/api/v1/tags", json={"name": "UnusedTag"}, headers=dev_user_headers)
        
        # Without filter - all tags returned
        response = await client.get("/api/v1/tags", headers=dev_user_headers)
        assert response.status_code == 200
        all_tags = response.json()["tags"]
        assert len(all_tags) >= 2
        
        # With unused=true filter - only unused returned
        response = await client.get(
            "/api/v1/tags?unused=true",
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        unused_tags = response.json()["tags"]
        # All returned tags should have usageCount=0
        for tag in unused_tags:
            assert tag["usageCount"] == 0


class TestUpdateTag:
    """Tests for PATCH /tags/:id endpoint updates."""

    async def test_update_tag_color(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """PATCH /tags/:id with color should update the tag color."""
        # Create tag
        create_response = await client.post(
            "/api/v1/tags",
            json={"name": "ColorTest"},
            headers=dev_user_headers,
        )
        assert create_response.status_code == 201
        tag_id = create_response.json()["id"]
        
        # Update color
        response = await client.patch(
            f"/api/v1/tags/{tag_id}",
            json={"color": "#EF4444"},
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["color"] == "#EF4444"

    async def test_update_tag_name_and_color(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """PATCH /tags/:id with name and color updates both."""
        # Create tag
        create_response = await client.post(
            "/api/v1/tags",
            json={"name": "BothTest"},
            headers=dev_user_headers,
        )
        tag_id = create_response.json()["id"]
        
        # Update both
        response = await client.patch(
            f"/api/v1/tags/{tag_id}",
            json={"name": "NewBothTest", "color": "#3B82F6"},
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "NewBothTest"
        assert data["color"] == "#3B82F6"

    async def test_update_tag_not_found_returns_404(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """PATCH /tags/:id for nonexistent tag should return 404."""
        response = await client.patch(
            "/api/v1/tags/nonexistent-tag-id",
            json={"name": "WontWork"},
            headers=dev_user_headers,
        )
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "NOT_FOUND"


class TestErrorResponses:
    """Tests for error response format."""

    async def test_error_includes_request_id(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """Error responses should include requestId in body and X-Request-Id header."""
        # Try to update a nonexistent tag
        response = await client.patch(
            "/api/v1/tags/nonexistent-id",
            json={"name": "Test"},
            headers=dev_user_headers,
        )
        assert response.status_code == 404
        
        # Check error body has requestId
        data = response.json()
        assert "error" in data
        assert "requestId" in data["error"]
        
        # Check X-Request-Id header
        assert "X-Request-Id" in response.headers

    async def test_unauthorized_error_format(self, client: AsyncClient):
        """401 should return proper error envelope."""
        response = await client.get("/api/v1/tags")
        assert response.status_code == 401
        data = response.json()
        assert "error" in data
        assert "code" in data["error"]


class TestSoftDelete:
    """Tests for soft-delete functionality."""

    async def test_delete_is_idempotent(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """DELETE /tags/:id twice should succeed both times (idempotent)."""
        # Create tag
        create_response = await client.post(
            "/api/v1/tags",
            json={"name": "Idempotent"},
            headers=dev_user_headers,
        )
        tag_id = create_response.json()["id"]
        
        # First delete
        response1 = await client.delete(
            f"/api/v1/tags/{tag_id}",
            headers=dev_user_headers,
        )
        assert response1.status_code == 204
        
        # Second delete - should also succeed
        response2 = await client.delete(
            f"/api/v1/tags/{tag_id}",
            headers=dev_user_headers,
        )
        assert response2.status_code == 204

    async def test_revive_deleted_tag_same_id(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """POST /tags with deleted tag name should revive with same ID."""
        # Create tag
        create_response = await client.post(
            "/api/v1/tags",
            json={"name": "Revivable"},
            headers=dev_user_headers,
        )
        original_id = create_response.json()["id"]
        
        # Delete it
        await client.delete(
            f"/api/v1/tags/{original_id}",
            headers=dev_user_headers,
        )
        
        # Verify it's gone from list
        list_response = await client.get(
            "/api/v1/tags",
            headers=dev_user_headers,
        )
        tags = list_response.json()["tags"]
        assert not any(t["id"] == original_id for t in tags)
        
        # Recreate with same name
        revive_response = await client.post(
            "/api/v1/tags",
            json={"name": "Revivable"},
            headers=dev_user_headers,
        )
        # Should return 201 (revived)
        assert revive_response.status_code == 201
        revived_tag = revive_response.json()
        
        # Should have the same ID
        assert revived_tag["id"] == original_id
        
        # Should now be in the list
        list_response2 = await client.get(
            "/api/v1/tags",
            headers=dev_user_headers,
        )
        tags2 = list_response2.json()["tags"]
        assert any(t["id"] == original_id for t in tags2)

    async def test_deleted_tag_excluded_from_count(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """Deleted tags should not be included in total count."""
        # Create tags
        await client.post(
            "/api/v1/tags",
            json={"name": "Count1"},
            headers=dev_user_headers,
        )
        create2 = await client.post(
            "/api/v1/tags",
            json={"name": "Count2"},
            headers=dev_user_headers,
        )
        tag2_id = create2.json()["id"]
        
        # Check total
        list1 = await client.get(
            "/api/v1/tags",
            headers=dev_user_headers,
        )
        total_before = list1.json()["total"]
        
        # Delete one
        await client.delete(
            f"/api/v1/tags/{tag2_id}",
            headers=dev_user_headers,
        )
        
        # Check total again
        list2 = await client.get(
            "/api/v1/tags",
            headers=dev_user_headers,
        )
        total_after = list2.json()["total"]
        
        # Total should decrease by 1
        assert total_after == total_before - 1

