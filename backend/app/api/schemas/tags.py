"""Tags API schemas."""

from datetime import datetime
from pydantic import BaseModel, Field


class TagResponse(BaseModel):
    """Response body for tag endpoints."""
    id: str
    name: str
    usageCount: int
    lastUsed: datetime | None
    createdAt: datetime


class CreateTagRequest(BaseModel):
    """Request body for POST /tags."""
    name: str = Field(..., min_length=1, max_length=50)


class TagsListResponse(BaseModel):
    """Response body for GET /tags."""
    tags: list[TagResponse]
    total: int


class RenameTagRequest(BaseModel):
    """Request body for PATCH /tags/:id."""
    name: str = Field(..., min_length=1, max_length=50)
