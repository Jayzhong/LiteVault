"""Search API integration tests."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from app.infrastructure.persistence.models.item_model import ItemModel


@pytest.fixture
async def search_items(client: AsyncClient, dev_user_headers: dict, db_session: AsyncSession):
    """Create archived items for search testing.
    
    Creates:
    - Item A: title="Work Meeting Notes", tags=["work", "meetings"]
    - Item B: title="Personal Journal", tags=["personal"], summary contains "work"
    - Item C: title="Code Review", tags=["development"]
    """
    items = []
    test_data = [
        {
            "rawText": "Notes from our work meeting yesterday",
            "title": "Work Meeting Notes",
            "summary": "Discussion about project deadlines",
            "tags": ["work", "meetings"],
        },
        {
            "rawText": "Personal journal about work-life balance",
            "title": "Personal Journal",
            "summary": "Thoughts about balancing work and personal life",
            "tags": ["personal"],
        },
        {
            "rawText": "Code review feedback for PR #123",
            "title": "Code Review",
            "summary": "Technical feedback about code quality",
            "tags": ["development"],
        },
    ]
    
    for data in test_data:
        # Create item
        response = await client.post(
            "/api/v1/items",
            json={"rawText": data["rawText"]},
            headers=dev_user_headers,
        )
        assert response.status_code == 201
        item = response.json()
        
        # Simulate enrichment complete
        await db_session.execute(
            update(ItemModel)
            .where(ItemModel.id == item["id"])
            .values(
                status="READY_TO_CONFIRM",
                title=data["title"],
                summary=data["summary"],
            )
        )
        await db_session.commit()
        
        # Confirm to archive with tags
        response = await client.patch(
            f"/api/v1/items/{item['id']}",
            json={"action": "confirm", "tags": data["tags"]},
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        items.append(response.json())
    
    return items


class TestSearchTagOnlyMode:
    """Tests for tag-only search mode (query starts with #)."""

    async def test_tag_only_returns_items_with_matching_tag(
        self, client: AsyncClient, search_items: list, dev_user_headers: dict
    ):
        """Search #work should return only items with 'work' tag."""
        response = await client.get(
            "/api/v1/search?q=%23work",  # URL encoded '#work'
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["mode"] == "tag_only"
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == "Work Meeting Notes"
        # Item B has "work" in text but not in tags, should NOT be returned
        assert "Personal Journal" not in [item["title"] for item in data["items"]]

    async def test_tag_only_case_insensitive(
        self, client: AsyncClient, search_items: list, dev_user_headers: dict
    ):
        """Tag search should be case-insensitive."""
        response = await client.get(
            "/api/v1/search?q=%23WORK",  # URL encoded '#WORK'
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["mode"] == "tag_only"

    async def test_tag_only_partial_match(
        self, client: AsyncClient, search_items: list, dev_user_headers: dict
    ):
        """Tag search should support partial matching."""
        response = await client.get(
            "/api/v1/search?q=%23meet",  # URL encoded '#meet'
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert any(t["name"] == "meetings" for t in data["items"][0]["tags"])

    async def test_tag_only_empty_term_returns_400(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """Tag search with empty term after # should return 400."""
        response = await client.get(
            "/api/v1/search?q=%23",  # URL encoded '#'
            headers=dev_user_headers,
        )
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"

    async def test_tag_only_whitespace_term_returns_400(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """Tag search with whitespace-only term after # should return 400."""
        response = await client.get(
            "/api/v1/search?q=%23%20%20%20",  # URL encoded '#   '
            headers=dev_user_headers,
        )
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"


class TestSearchCombinedMode:
    """Tests for combined search mode (text OR tags)."""

    async def test_combined_returns_text_matches(
        self, client: AsyncClient, search_items: list, dev_user_headers: dict
    ):
        """Combined search should return items with text matches."""
        response = await client.get(
            "/api/v1/search?q=journal",
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["mode"] == "combined"
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == "Personal Journal"

    async def test_combined_returns_tag_matches(
        self, client: AsyncClient, search_items: list, dev_user_headers: dict
    ):
        """Combined search should return items with tag matches."""
        response = await client.get(
            "/api/v1/search?q=development",
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["mode"] == "combined"
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == "Code Review"

    async def test_combined_returns_both_text_and_tag_matches(
        self, client: AsyncClient, search_items: list, dev_user_headers: dict
    ):
        """Combined search 'work' should match both text and tags."""
        response = await client.get(
            "/api/v1/search?q=work",
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["mode"] == "combined"
        # Should match Item A (tag) and Item B (text)
        assert len(data["items"]) == 2
        titles = [item["title"] for item in data["items"]]
        assert "Work Meeting Notes" in titles
        assert "Personal Journal" in titles

    async def test_combined_empty_query_returns_empty(
        self, client: AsyncClient, search_items: list, dev_user_headers: dict
    ):
        """Empty query should return empty results, not error."""
        response = await client.get(
            "/api/v1/search?q=",
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["mode"] == "combined"

    async def test_combined_no_matches_returns_empty(
        self, client: AsyncClient, search_items: list, dev_user_headers: dict
    ):
        """Search with no matches should return empty list."""
        response = await client.get(
            "/api/v1/search?q=nonexistent",
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []


class TestSearchPagination:
    """Tests for search pagination."""

    async def test_pagination_with_cursor(
        self, client: AsyncClient, search_items: list, dev_user_headers: dict
    ):
        """Search should support cursor pagination."""
        # Get first page with limit 1
        response = await client.get(
            "/api/v1/search?q=work&limit=1",
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["pagination"]["hasMore"] is True
        cursor = data["pagination"]["cursor"]
        assert cursor is not None
        first_id = data["items"][0]["id"]

        # Get second page
        response = await client.get(
            f"/api/v1/search?q=work&limit=1&cursor={cursor}",
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data2 = response.json()
        
        # Should not duplicate items
        second_id = data2["items"][0]["id"]
        assert first_id != second_id

    async def test_invalid_cursor_returns_400(
        self, client: AsyncClient, dev_user_headers: dict
    ):
        """Invalid cursor should return 400."""
        response = await client.get(
            "/api/v1/search?q=test&cursor=invalid",
            headers=dev_user_headers,
        )
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "INVALID_CURSOR"

    async def test_ordered_by_confirmed_at_desc(
        self, client: AsyncClient, search_items: list, dev_user_headers: dict
    ):
        """Results should be ordered by confirmedAt DESC."""
        response = await client.get(
            "/api/v1/search?q=work",
            headers=dev_user_headers,
        )
        assert response.status_code == 200
        data = response.json()
        items = data["items"]
        
        for i in range(len(items) - 1):
            assert items[i]["confirmedAt"] >= items[i + 1]["confirmedAt"]


class TestSearchAuth:
    """Tests for search authentication."""

    async def test_requires_auth(self, client: AsyncClient):
        """Search should require authentication."""
        response = await client.get("/api/v1/search?q=test")
        assert response.status_code == 401
        data = response.json()
        assert data["error"]["code"] == "UNAUTHORIZED"

    async def test_has_request_id(
        self, client: AsyncClient, search_items: list, dev_user_headers: dict
    ):
        """Response should include X-Request-Id header."""
        response = await client.get(
            "/api/v1/search?q=test",
            headers=dev_user_headers,
        )
        assert "x-request-id" in response.headers
