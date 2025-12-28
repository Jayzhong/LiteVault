"""Library API endpoints."""

import base64
import json
from typing import Annotated
from datetime import datetime

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_current_user, get_item_repository
from app.api.schemas.library import (
    LibraryResponse,
    LibraryItemResponse,
    PaginationInfo,
)
from app.domain.entities.user import User
from app.domain.exceptions import InvalidCursorException
from app.infrastructure.persistence.repositories.item_repository_impl import (
    SQLAlchemyItemRepository,
)

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


@router.get("", response_model=LibraryResponse)
async def get_library(
    current_user: Annotated[User, Depends(get_current_user)],
    item_repo: Annotated[SQLAlchemyItemRepository, Depends(get_item_repository)],
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
    
    return LibraryResponse(
        items=[
            LibraryItemResponse(
                id=item.id,
                rawText=item.raw_text,
                title=item.title,
                summary=item.summary,
                tags=item.tags,
                status=item.status.value,
                sourceType=item.source_type.value if item.source_type else None,
                createdAt=item.created_at,
                confirmedAt=item.confirmed_at,
            )
            for item in items
        ],
        pagination=PaginationInfo(
            cursor=next_cursor,
            hasMore=has_more,
        ),
    )
