"""Item API schemas."""

from datetime import datetime
from pydantic import BaseModel, Field


class CreateItemRequest(BaseModel):
    """Request body for POST /items."""

    rawText: str = Field(..., min_length=1, max_length=10000)
    enrich: bool = True  # If False, skip AI enrichment


class ItemResponse(BaseModel):
    """Response body for item endpoints."""

    id: str
    rawText: str
    title: str | None
    summary: str | None
    tags: list[str]
    status: str
    sourceType: str | None
    enrichmentMode: str | None = None  # 'AI' or 'MANUAL'
    createdAt: datetime
    updatedAt: datetime
    confirmedAt: datetime | None


class PendingItemsResponse(BaseModel):
    """Response body for GET /items/pending."""

    items: list[ItemResponse]
    total: int


class UpdateItemRequest(BaseModel):
    """Request body for PATCH /items/{id}."""

    action: str | None = None  # 'confirm' or 'discard'
    title: str | None = None
    summary: str | None = None
    tags: list[str] | None = None


class UpdateItemResponse(BaseModel):
    """Response body for PATCH /items/{id}."""

    id: str
    status: str
    title: str | None = None
    summary: str | None = None
    tags: list[str] = []
    updatedAt: datetime
    confirmedAt: datetime | None = None


class RetryResponse(BaseModel):
    """Response body for POST /items/{id}/retry."""

    id: str
    status: str
    updatedAt: datetime
