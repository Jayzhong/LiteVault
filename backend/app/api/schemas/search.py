"""Search API schemas."""

from datetime import datetime
from pydantic import BaseModel

from app.api.schemas.items import TagInItem


class SearchResultItem(BaseModel):
    """Item in search results."""
    id: str
    title: str | None
    summary: str | None
    tags: list[TagInItem]
    sourceType: str | None
    confirmedAt: datetime | None
    createdAt: datetime


class SearchPaginationInfo(BaseModel):
    """Pagination info for search results."""
    cursor: str | None
    hasMore: bool


class SearchResponse(BaseModel):
    """Response body for GET /search."""
    items: list[SearchResultItem]
    mode: str  # 'tag_only' or 'combined'
    pagination: SearchPaginationInfo
    total: int | None = None  # Optional total count
