"""Library API schemas."""

from datetime import datetime
from pydantic import BaseModel


class LibraryItemResponse(BaseModel):
    """Item in library response."""
    id: str
    rawText: str
    title: str | None
    summary: str | None
    tags: list[str]
    status: str
    sourceType: str | None
    createdAt: datetime
    confirmedAt: datetime | None


class PaginationInfo(BaseModel):
    """Pagination cursor info."""
    cursor: str | None
    hasMore: bool


class LibraryResponse(BaseModel):
    """Response body for GET /library."""
    items: list[LibraryItemResponse]
    pagination: PaginationInfo
