"""Search API endpoints."""

import base64
import json
from typing import Annotated
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, DbSession, get_tag_repository
from app.api.schemas.search import (
    SearchResponse,
    SearchResultItem,
    SearchPaginationInfo,
)
from app.api.schemas.items import TagInItem
from app.domain.entities.user import User
from app.domain.exceptions import ValidationException, InvalidCursorException
from app.infrastructure.persistence.models.item_model import ItemModel
from app.infrastructure.persistence.models.item_attachment_model import ItemAttachmentModel

router = APIRouter(prefix="/search", tags=["search"])


def parse_search_mode(query: str) -> tuple[str, str]:
    """Parse search query into (mode, search_term).
    
    Returns:
        tuple of (mode, search_term) where mode is 'tag_only' or 'combined'
    
    Raises:
        ValidationException: if tag search term is empty after '#'
    """
    trimmed = query.strip()
    
    if trimmed.startswith("#"):
        term = trimmed[1:].strip()
        if not term:
            raise ValidationException(
                "Tag search term cannot be empty after '#'",
                details={"query": query},
            )
        return ("tag_only", term)
    
    # Empty or whitespace-only query returns empty results (not error)
    return ("combined", trimmed)


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


async def resolve_tags_to_objects(
    tag_names: list[str], user_id: str, tag_repo
) -> list[TagInItem]:
    """Resolve tag names to full TagInItem objects."""
    if not tag_names or not tag_repo:
        return []
    
    result = []
    for name in tag_names:
        tag = await tag_repo.get_by_name(name, user_id)
        if tag:
            result.append(TagInItem(id=tag.id, name=tag.name, color=tag.color))
        else:
            result.append(TagInItem(id="", name=name, color="gray"))
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


@router.get("", response_model=SearchResponse)
async def search_library(
    current_user: Annotated[User, Depends(get_current_user)],
    db: DbSession,
    tag_repo: Annotated[object, Depends(get_tag_repository)],
    q: str = Query(..., min_length=0, description="Search query"),
    cursor: str | None = Query(None, description="Pagination cursor"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
) -> SearchResponse:
    """Search archived items in library.
    
    Two modes based on query prefix:
    - Tag-only mode: query starts with '#' -> matches tag names only
    - Combined mode: otherwise -> matches title/summary/rawText OR tags
    
    Ordered by (confirmed_at DESC, id DESC) for stable pagination.
    """
    # Parse query mode
    mode, search_term = parse_search_mode(q)
    
    # Decode cursor if provided
    cursor_data = decode_cursor(cursor)
    
    # Empty search term in combined mode returns empty results
    if mode == "combined" and not search_term:
        return SearchResponse(
            items=[],
            mode=mode,
            pagination=SearchPaginationInfo(cursor=None, hasMore=False),
            total=0,
        )
    
    # Build base query for archived items
    stmt = (
        select(ItemModel)
        .where(ItemModel.user_id == current_user.id)
        .where(ItemModel.status == "ARCHIVED")
    )
    
    # Apply search filter based on mode
    like_pattern = f"%{search_term}%"
    
    if mode == "tag_only":
        # Tag-only: match any tag in the tags array (case-insensitive)
        # Use PostgreSQL array functions with ILIKE
        stmt = stmt.where(
            func.array_to_string(ItemModel.tags, ',').ilike(like_pattern)
        )
    else:
        # Combined: match text fields OR tags
        stmt = stmt.where(
            or_(
                ItemModel.title.ilike(like_pattern),
                ItemModel.summary.ilike(like_pattern),
                ItemModel.raw_text.ilike(like_pattern),
                func.array_to_string(ItemModel.tags, ',').ilike(like_pattern),
            )
        )
    
    # Apply cursor pagination
    if cursor_data:
        cursor_confirmed_at, cursor_id = cursor_data
        stmt = stmt.where(
            or_(
                ItemModel.confirmed_at < cursor_confirmed_at,
                (ItemModel.confirmed_at == cursor_confirmed_at) & (ItemModel.id < cursor_id),
            )
        )
    
    # Order by confirmed_at DESC, id DESC for stable pagination
    stmt = stmt.order_by(ItemModel.confirmed_at.desc(), ItemModel.id.desc())
    
    # Fetch one extra to detect hasMore
    stmt = stmt.limit(limit + 1)
    
    result = await db.execute(stmt)
    items = list(result.scalars().all())
    
    # Check if there are more items
    has_more = len(items) > limit
    if has_more:
        items = items[:limit]
    
    # Generate next cursor from last item
    next_cursor = None
    if has_more and items:
        last_item = items[-1]
        if last_item.confirmed_at:
            next_cursor = encode_cursor(last_item.confirmed_at, last_item.id)
    
    # Build response with resolved tag objects
    item_ids = [item.id for item in items]
    attachment_counts = await get_attachment_counts(db, item_ids)
    
    response_items = []
    for item in items:
        tag_objects = await resolve_tags_to_objects(item.tags or [], current_user.id, tag_repo)
        response_items.append(
            SearchResultItem(
                id=item.id,
                title=item.title,
                summary=item.summary,
                tags=tag_objects,
                sourceType=item.source_type,
                confirmedAt=item.confirmed_at,
                createdAt=item.created_at,
                attachmentCount=attachment_counts.get(item.id, 0),
            )
        )
    
    return SearchResponse(
        items=response_items,
        mode=mode,
        pagination=SearchPaginationInfo(
            cursor=next_cursor,
            hasMore=has_more,
        ),
        total=len(items) if not has_more else None,  # Only return total if we have all items
    )
