"""Library API endpoints."""

import base64
import json
from typing import Annotated
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func

from app.api.dependencies import get_current_user, get_item_repository, get_tag_repository, DbSession
from app.api.schemas.library import (
    LibraryResponse,
    LibraryItemResponse,
    PaginationInfo,
)
from app.api.schemas.items import TagInItem
from app.domain.entities.user import User
from app.domain.exceptions import InvalidCursorException
from app.infrastructure.persistence.repositories.item_repository_impl import (
    SQLAlchemyItemRepository,
)
from app.infrastructure.persistence.models.item_attachment_model import ItemAttachmentModel

router = APIRouter(prefix="/library", tags=["library"])


def decode_cursor(cursor: str | None) -> tuple[datetime, str] | None:
    """Decode cursor to (confirmed_at, id) tuple."""
    if not cursor:
        return None
    try:
        decoded = base64.b64decode(cursor, validate=True).decode("utf-8")
        data = json.loads(decoded)
        confirmed_at = datetime.fromisoformat(data["confirmedAt"].replace("Z", "+00:00"))
        return (confirmed_at, data["id"])
    except Exception:
        raise InvalidCursorException(
            "Invalid pagination cursor",
            details={"cursor": cursor},
        )


def encode_cursor(confirmed_at: datetime, item_id: str) -> str:
    """Encode (confirmed_at, id) to cursor string."""
    data = {
        "confirmedAt": confirmed_at.isoformat().replace("+00:00", "Z"),
        "id": item_id,
    }
    return base64.b64encode(json.dumps(data).encode("utf-8")).decode("utf-8")


async def resolve_tags_to_objects_batch(
    items_with_tags: list[tuple[object, list[str]]], user_id: str, tag_repo
) -> dict[str, list[TagInItem]]:
    """Batch resolve tag names to full TagInItem objects for multiple items.
    
    Returns a dict mapping item_id to list of TagInItem.
    Uses a single query to fetch all tags instead of N queries.
    """
    if not items_with_tags or not tag_repo:
        return {}
    
    # Collect all unique tag names
    all_tag_names = set()
    for _, tags in items_with_tags:
        all_tag_names.update(tags)
    
    # Single batch query for all tags
    tag_map = await tag_repo.get_by_names(list(all_tag_names), user_id)
    
    # Build result for each item
    result = {}
    for item, tags in items_with_tags:
        tag_objects = []
        for name in tags:
            tag = tag_map.get(name.lower().strip())
            if tag:
                tag_objects.append(TagInItem(id=tag.id, name=tag.name, color=tag.color))
            # Skip tags that don't exist (soft-deleted tags)
        result[item.id] = tag_objects
    
    return result


async def get_attachment_counts(db, item_ids: list[str]) -> dict[str, int]:
    """Get attachment counts for a list of item IDs."""
    if not item_ids:
        return {}
    
    stmt = (
        select(
            ItemAttachmentModel.item_id,
            func.count(ItemAttachmentModel.id).label("count")
        )
        .where(ItemAttachmentModel.item_id.in_(item_ids))
        .where(ItemAttachmentModel.deleted_at.is_(None))
        .group_by(ItemAttachmentModel.item_id)
    )
    
    result = await db.execute(stmt)
    return {row.item_id: row.count for row in result}


@router.get("", response_model=LibraryResponse)
async def get_library(
    current_user: Annotated[User, Depends(get_current_user)],
    item_repo: Annotated[SQLAlchemyItemRepository, Depends(get_item_repository)],
    tag_repo: Annotated[object, Depends(get_tag_repository)],
    db: DbSession,
    cursor: str | None = Query(None, description="Pagination cursor"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
) -> LibraryResponse:
    """Get archived items (library) with cursor pagination.
    
    Ordered by (confirmed_at DESC, id DESC) for stable pagination.
    """
    # Decode cursor if provided
    cursor_data = decode_cursor(cursor)
    
    # Fetch items from repository
    items = await item_repo.get_archived_by_user(
        user_id=current_user.id,
        cursor=cursor_data,
        limit=limit + 1,  # Fetch one extra to check hasMore
    )
    
    # Check if there are more items
    has_more = len(items) > limit
    if has_more:
        items = items[:limit]  # Remove the extra item
    
    # Generate next cursor from last item
    next_cursor = None
    if has_more and items:
        last_item = items[-1]
        if last_item.confirmed_at:
            next_cursor = encode_cursor(last_item.confirmed_at, last_item.id)
    
    # Batch resolve all tags in a single query
    items_with_tags = [(item, item.tags) for item in items]
    tag_objects_map = await resolve_tags_to_objects_batch(items_with_tags, current_user.id, tag_repo)
    
    # Get attachment counts for all items
    item_ids = [item.id for item in items]
    attachment_counts = await get_attachment_counts(db, item_ids)
    
    # Build response
    response_items = [
        LibraryItemResponse(
            id=item.id,
            rawText=item.raw_text,
            title=item.title,
            summary=item.summary,
            tags=tag_objects_map.get(item.id, []),
            status=item.status.value,
            sourceType=item.source_type.value if item.source_type else None,
            createdAt=item.created_at,
            confirmedAt=item.confirmed_at,
            attachmentCount=attachment_counts.get(item.id, 0),
        )
        for item in items
    ]
    
    return LibraryResponse(
        items=response_items,
        pagination=PaginationInfo(
            cursor=next_cursor,
            hasMore=has_more,
        ),
    )


