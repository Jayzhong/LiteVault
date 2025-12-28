"""Library API integration tests."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from app.infrastructure.persistence.models.item_model import ItemModel


@pytest.fixture
async def archived_items(client: AsyncClient, dev_user_headers: dict, db_session: AsyncSession):
    """Create and archive several items for testing.
    
    Simulates enrichment completing by directly updating status to READY_TO_CONFIRM
    before confirming to ARCHIVED.
    """
    items = []
    for i in range(5):
        # Create item
        response = await client.post(
            "/api/v1/items",
            json={"rawText": f"Test item {i} content for library"},
            headers=dev_user_headers,
        )
        assert response.status_code == 201
        item = response.json()
        
        # Simulate enrichment complete by updating status directly
        await db_session.execute(
            update(ItemModel)
            .where(ItemModel.id == item["id"])
            .values(
                status="READY_TO_CONFIRM",
                title=f"Test Title {i}",
                summary=f"Test Summary {i}",
            )
        )
        await db_session.commit()
        
        # Confirm to archive
        response = await client.patch(
            f"/api/v1/items/{item['id']}",
            json={"action": "confirm", "tags": [f"tag{i}"]},
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        items.append(response.json())
    
    return items


class TestGetLibrary:
    """Tests for GET /library endpoint."""

    async def test_library_returns_archived_items(
        self, client: AsyncClient, archived_items: list, dev_user_headers: dict
    ):
        """Library should return archived items."""
        response = await client.get(
            "/api/v1/library",
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "pagination" in data
        assert len(data["items"]) == len(archived_items)
        # All items should be ARCHIVED
        for item in data["items"]:
            assert item["status"] == "ARCHIVED"
            assert item["confirmedAt"] is not None

    async def test_library_empty_when_no_archived(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """Library should return empty list when no archived items."""
        response = await client.get(
            "/api/v1/library",
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["pagination"]["hasMore"] is False
        assert data["pagination"]["cursor"] is None

    async def test_library_pagination_with_cursor(
        self, client: AsyncClient, archived_items: list, dev_user_headers: dict
    ):
        """Library should support cursor pagination."""
        # Get first page with limit 2
        response = await client.get(
            "/api/v1/library?limit=2",
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["pagination"]["hasMore"] is True
        cursor = data["pagination"]["cursor"]
        assert cursor is not None

        # Get second page
        response = await client.get(
            f"/api/v1/library?limit=2&cursor={cursor}",
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data2 = response.json()
        assert len(data2["items"]) == 2
        
        # Items should not duplicate
        first_ids = {item["id"] for item in data["items"]}
        second_ids = {item["id"] for item in data2["items"]}
        assert first_ids.isdisjoint(second_ids)

    async def test_library_invalid_cursor_returns_400(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """Invalid cursor should return 400 with standard error envelope."""
        response = await client.get(
            "/api/v1/library?cursor=invalid_cursor",
            headers=dev_user_headers,
        )
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "INVALID_CURSOR"
        assert "requestId" in data["error"]
        # Check X-Request-Id header
        assert "x-request-id" in response.headers

    async def test_library_requires_auth(self, client: AsyncClient):
        """Library should require authentication."""
        response = await client.get("/api/v1/library")
        assert response.status_code == 401
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "UNAUTHORIZED"

    async def test_library_ordered_by_confirmed_at_desc(
        self, client: AsyncClient, archived_items: list, dev_user_headers: dict
    ):
        """Library should return items ordered by confirmedAt DESC."""
        response = await client.get(
            "/api/v1/library",
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        items = data["items"]
        
        # Check descending order by confirmedAt
        for i in range(len(items) - 1):
            assert items[i]["confirmedAt"] >= items[i + 1]["confirmedAt"]
