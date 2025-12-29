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
    color: str = "#6B7280"  # Hex color code


class CreateTagRequest(BaseModel):
    """Request body for POST /tags."""
    name: str = Field(..., min_length=1, max_length=50)


class TagsListResponse(BaseModel):
    """Response body for GET /tags."""
    tags: list[TagResponse]
    total: int


class RenameTagRequest(BaseModel):
    """Request body for PATCH /tags/:id - update name."""
    name: str = Field(..., min_length=1, max_length=50)


class UpdateTagRequest(BaseModel):
    """Request body for PATCH /tags/:id - update name and/or color."""
    name: str | None = Field(None, min_length=1, max_length=50)
    color: str | None = Field(None, min_length=7, max_length=7, pattern=r"^#[0-9A-Fa-f]{6}$")
