"""Items endpoint tests."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_item_requires_auth(client: AsyncClient) -> None:
    """Test creating item without auth returns 401."""
    response = await client.post(
        "/api/v1/items",
        json={"rawText": "Test content"},
    )
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "UNAUTHORIZED"
    assert "requestId" in data["error"]


@pytest.mark.asyncio
async def test_create_item_success(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test creating item returns 201 with ENRICHING status."""
    response = await client.post(
        "/api/v1/items",
        json={"rawText": "My test note content"},
        headers=dev_user_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "ENRICHING"
    assert data["rawText"] == "My test note content"
    assert data["title"] is None
    assert data["summary"] is None


@pytest.mark.asyncio
async def test_create_item_idempotency(
    client: AsyncClient, dev_user_headers: dict, idempotency_key: str
) -> None:
    """Test creating item with same idempotency key returns same item."""
    headers = {**dev_user_headers, "Idempotency-Key": idempotency_key}
    
    # First request
    response1 = await client.post(
        "/api/v1/items",
        json={"rawText": "Idempotent test note"},
        headers=headers,
    )
    assert response1.status_code == 201
    item1 = response1.json()
    
    # Second request with same key
    response2 = await client.post(
        "/api/v1/items",
        json={"rawText": "Different content but same key"},
        headers=headers,
    )
    assert response2.status_code == 201
    item2 = response2.json()
    
    # Should return same item
    assert item1["id"] == item2["id"]
    assert item1["rawText"] == item2["rawText"]


@pytest.mark.asyncio
async def test_create_item_validation_empty_text(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test creating item with empty rawText returns 400."""
    response = await client.post(
        "/api/v1/items",
        json={"rawText": ""},
        headers=dev_user_headers,
    )
    # Pydantic validation returns 422 for empty string
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_pending_items(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test getting pending items."""
    # Create an item first
    await client.post(
        "/api/v1/items",
        json={"rawText": "Pending test note"},
        headers=dev_user_headers,
    )
    
    # Get pending items
    response = await client.get(
        "/api/v1/items/pending",
        headers=dev_user_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert len(data["items"]) >= 1


@pytest.mark.asyncio
async def test_get_item_not_found(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test getting non-existent item returns 404."""
    response = await client.get(
        "/api/v1/items/non-existent-id",
        headers=dev_user_headers,
    )
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_confirm_item_invalid_state_enriching(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test confirming item in ENRICHING state returns 409."""
    # Create an item (will be in ENRICHING state)
    create_response = await client.post(
        "/api/v1/items",
        json={"rawText": "Test note for confirm"},
        headers=dev_user_headers,
    )
    assert create_response.status_code == 201
    item_id = create_response.json()["id"]
    
    # Try to confirm while still ENRICHING
    response = await client.patch(
        f"/api/v1/items/{item_id}",
        json={"action": "confirm", "tags": ["Test"]},
        headers=dev_user_headers,
    )
    assert response.status_code == 409
    data = response.json()
    assert data["error"]["code"] == "INVALID_STATE_TRANSITION"
    assert data["error"]["details"]["currentState"] == "ENRICHING"
    assert data["error"]["details"]["attemptedAction"] == "confirm"


@pytest.mark.asyncio
async def test_retry_enrichment_invalid_state(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test retrying enrichment from non-FAILED state returns 409."""
    # Create an item (will be in ENRICHING state)
    create_response = await client.post(
        "/api/v1/items",
        json={"rawText": "Test note for retry"},
        headers=dev_user_headers,
    )
    assert create_response.status_code == 201
    item_id = create_response.json()["id"]
    
    # Try to retry while still ENRICHING (not FAILED)
    response = await client.post(
        f"/api/v1/items/{item_id}/retry",
        headers=dev_user_headers,
    )
    assert response.status_code == 409
    data = response.json()
    assert data["error"]["code"] == "INVALID_STATE_TRANSITION"


@pytest.mark.asyncio
async def test_error_response_includes_request_id(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test error responses include requestId in body and header."""
    response = await client.get(
        "/api/v1/items/non-existent-id",
        headers=dev_user_headers,
    )
    assert response.status_code == 404
    
    # Check body
    data = response.json()
    assert "requestId" in data["error"]
    assert data["error"]["requestId"].startswith("req-")
    
    # Check header
    assert "X-Request-Id" in response.headers
    assert response.headers["X-Request-Id"] == data["error"]["requestId"]


@pytest.mark.asyncio
async def test_discard_from_enriching_fails(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test discarding item in ENRICHING state returns 409."""
    # Create an item (will be in ENRICHING state)
    create_response = await client.post(
        "/api/v1/items",
        json={"rawText": "Test note for discard"},
        headers=dev_user_headers,
    )
    assert create_response.status_code == 201
    item_id = create_response.json()["id"]
    
    # Try to discard while still ENRICHING
    response = await client.patch(
        f"/api/v1/items/{item_id}",
        json={"action": "discard"},
        headers=dev_user_headers,
    )
    assert response.status_code == 409
    data = response.json()
    assert data["error"]["code"] == "INVALID_STATE_TRANSITION"
    assert data["error"]["details"]["currentState"] == "ENRICHING"
    assert data["error"]["details"]["attemptedAction"] == "discard"


@pytest.mark.asyncio
async def test_get_item_by_id_success(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test getting item by ID returns the item."""
    # Create an item first
    create_response = await client.post(
        "/api/v1/items",
        json={"rawText": "Test note for get"},
        headers=dev_user_headers,
    )
    assert create_response.status_code == 201
    item_id = create_response.json()["id"]
    
    # Get the item
    response = await client.get(
        f"/api/v1/items/{item_id}",
        headers=dev_user_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == item_id
    assert data["rawText"] == "Test note for get"


@pytest.mark.asyncio
async def test_pending_items_ordered_newest_first(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test pending items are ordered newest first."""
    # Create multiple items
    await client.post(
        "/api/v1/items",
        json={"rawText": "First note"},
        headers=dev_user_headers,
    )
    await client.post(
        "/api/v1/items",
        json={"rawText": "Second note"},
        headers=dev_user_headers,
    )
    
    # Get pending items
    response = await client.get(
        "/api/v1/items/pending",
        headers=dev_user_headers,
    )
    assert response.status_code == 200
    data = response.json()
    items = data["items"]
    
    assert len(items) >= 2
    # Newest should be first
    assert items[0]["rawText"] == "Second note"
    assert items[1]["rawText"] == "First note"


@pytest.mark.asyncio
async def test_different_idempotency_keys_create_different_items(
    client: AsyncClient, dev_user_headers: dict
) -> None:
    """Test different idempotency keys create separate items."""
    import uuid
    
    key1 = str(uuid.uuid4())
    key2 = str(uuid.uuid4())
    
    # First request with key1
    response1 = await client.post(
        "/api/v1/items",
        json={"rawText": "Note with key 1"},
        headers={**dev_user_headers, "Idempotency-Key": key1},
    )
    assert response1.status_code == 201
    item1 = response1.json()
    
    # Second request with key2
    response2 = await client.post(
        "/api/v1/items",
        json={"rawText": "Note with key 2"},
        headers={**dev_user_headers, "Idempotency-Key": key2},
    )
    assert response2.status_code == 201
    item2 = response2.json()
    
    # Should be different items
    assert item1["id"] != item2["id"]


# ============================================================================
# Happy Path Tests: Confirm, Discard, Edit+Confirm
# ============================================================================

@pytest.mark.asyncio
async def test_confirm_item_happy_path(
    client: AsyncClient, dev_user_headers: dict, db_session
) -> None:
    """Test confirming item from READY_TO_CONFIRM -> ARCHIVED."""
    from sqlalchemy import update
    from app.infrastructure.persistence.models.item_model import ItemModel
    
    # Create item
    create_response = await client.post(
        "/api/v1/items",
        json={"rawText": "Test note to confirm"},
        headers=dev_user_headers,
    )
    assert create_response.status_code == 201
    item_id = create_response.json()["id"]
    
    # Simulate enrichment complete
    await db_session.execute(
        update(ItemModel)
        .where(ItemModel.id == item_id)
        .values(
            status="READY_TO_CONFIRM",
            title="Generated Title",
            summary="Generated Summary",
        )
    )
    await db_session.commit()
    
    # Confirm
    response = await client.patch(
        f"/api/v1/items/{item_id}",
        json={"action": "confirm", "tags": ["TestTag"]},
        headers=dev_user_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ARCHIVED"
    assert data["confirmedAt"] is not None
    assert data["tags"] == ["TestTag"]
    
    # Verify item no longer in pending
    pending_response = await client.get(
        "/api/v1/items/pending",
        headers=dev_user_headers,
    )
    pending_ids = [item["id"] for item in pending_response.json()["items"]]
    assert item_id not in pending_ids


@pytest.mark.asyncio
async def test_confirm_item_with_edits(
    client: AsyncClient, dev_user_headers: dict, db_session
) -> None:
    """Test confirming item with inline edits (title, summary, tags)."""
    from sqlalchemy import update
    from app.infrastructure.persistence.models.item_model import ItemModel
    
    # Create and simulate enrichment
    create_response = await client.post(
        "/api/v1/items",
        json={"rawText": "Test note for edit+confirm"},
        headers=dev_user_headers,
    )
    item_id = create_response.json()["id"]
    
    await db_session.execute(
        update(ItemModel)
        .where(ItemModel.id == item_id)
        .values(
            status="READY_TO_CONFIRM",
            title="AI Generated Title",
            summary="AI Generated Summary",
            tags=["SuggestedTag"],
        )
    )
    await db_session.commit()
    
    # Confirm with edits
    response = await client.patch(
        f"/api/v1/items/{item_id}",
        json={
            "action": "confirm",
            "title": "User Edited Title",
            "summary": "User Edited Summary",
            "tags": ["CustomTag1", "CustomTag2"],
        },
        headers=dev_user_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ARCHIVED"
    assert data["title"] == "User Edited Title"
    assert data["summary"] == "User Edited Summary"
    assert data["tags"] == ["CustomTag1", "CustomTag2"]


@pytest.mark.asyncio
async def test_discard_item_from_ready_to_confirm(
    client: AsyncClient, dev_user_headers: dict, db_session
) -> None:
    """Test discarding item from READY_TO_CONFIRM -> DISCARDED."""
    from sqlalchemy import update
    from app.infrastructure.persistence.models.item_model import ItemModel
    
    # Create and simulate enrichment
    create_response = await client.post(
        "/api/v1/items",
        json={"rawText": "Test note to discard"},
        headers=dev_user_headers,
    )
    item_id = create_response.json()["id"]
    
    await db_session.execute(
        update(ItemModel)
        .where(ItemModel.id == item_id)
        .values(status="READY_TO_CONFIRM", title="Title", summary="Summary")
    )
    await db_session.commit()
    
    # Discard
    response = await client.patch(
        f"/api/v1/items/{item_id}",
        json={"action": "discard"},
        headers=dev_user_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "DISCARDED"
    
    # Verify item no longer in pending
    pending_response = await client.get(
        "/api/v1/items/pending",
        headers=dev_user_headers,
    )
    pending_ids = [item["id"] for item in pending_response.json()["items"]]
    assert item_id not in pending_ids


@pytest.mark.asyncio
async def test_discard_item_from_failed(
    client: AsyncClient, dev_user_headers: dict, db_session
) -> None:
    """Test discarding item from FAILED -> DISCARDED."""
    from sqlalchemy import update
    from app.infrastructure.persistence.models.item_model import ItemModel
    
    # Create and simulate failure
    create_response = await client.post(
        "/api/v1/items",
        json={"rawText": "Test note that failed"},
        headers=dev_user_headers,
    )
    item_id = create_response.json()["id"]
    
    await db_session.execute(
        update(ItemModel)
        .where(ItemModel.id == item_id)
        .values(status="FAILED")
    )
    await db_session.commit()
    
    # Discard from FAILED
    response = await client.patch(
        f"/api/v1/items/{item_id}",
        json={"action": "discard"},
        headers=dev_user_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "DISCARDED"


@pytest.mark.asyncio
async def test_retry_from_failed_happy_path(
    client: AsyncClient, dev_user_headers: dict, db_session
) -> None:
    """Test retry from FAILED -> ENRICHING."""
    from sqlalchemy import update
    from app.infrastructure.persistence.models.item_model import ItemModel
    
    # Create and simulate failure
    create_response = await client.post(
        "/api/v1/items",
        json={"rawText": "Test note that failed enrichment"},
        headers=dev_user_headers,
    )
    item_id = create_response.json()["id"]
    
    await db_session.execute(
        update(ItemModel)
        .where(ItemModel.id == item_id)
        .values(status="FAILED")
    )
    await db_session.commit()
    
    # Retry
    response = await client.post(
        f"/api/v1/items/{item_id}/retry",
        headers=dev_user_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ENRICHING"


@pytest.mark.asyncio
async def test_confirm_from_failed_returns_409(
    client: AsyncClient, dev_user_headers: dict, db_session
) -> None:
    """Test confirming item from FAILED returns 409."""
    from sqlalchemy import update
    from app.infrastructure.persistence.models.item_model import ItemModel
    
    # Create and simulate failure
    create_response = await client.post(
        "/api/v1/items",
        json={"rawText": "Test note that failed"},
        headers=dev_user_headers,
    )
    item_id = create_response.json()["id"]
    
    await db_session.execute(
        update(ItemModel)
        .where(ItemModel.id == item_id)
        .values(status="FAILED")
    )
    await db_session.commit()
    
    # Try to confirm
    response = await client.patch(
        f"/api/v1/items/{item_id}",
        json={"action": "confirm", "tags": []},
        headers=dev_user_headers,
    )
    assert response.status_code == 409
    data = response.json()
    assert data["error"]["code"] == "INVALID_STATE_TRANSITION"
    assert data["error"]["details"]["currentState"] == "FAILED"
    assert data["error"]["details"]["attemptedAction"] == "confirm"
    assert "requestId" in data["error"]


