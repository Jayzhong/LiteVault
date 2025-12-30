"""Items application DTOs."""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class CreateItemInput:
    """Input for CreateItem use case."""

    user_id: str
    raw_text: str
    idempotency_key: str | None = None
    enrich: bool = True  # If False, skip AI enrichment and save directly to ARCHIVED
    tag_ids: list[str] = field(default_factory=list)  # Tag UUIDs to associate
    user_plan: str = "free"  # 'free' or 'pro'


@dataclass
class CreateItemOutput:
    """Output from CreateItem use case."""

    id: str
    raw_text: str
    title: str | None
    summary: str | None
    tags: list[str]
    status: str
    source_type: str | None
    enrichment_mode: str  # 'AI' or 'MANUAL'
    created_at: datetime
    updated_at: datetime
    confirmed_at: datetime | None


@dataclass
class GetPendingItemsInput:
    """Input for GetPendingItems use case."""

    user_id: str


@dataclass
class SuggestedTagDto:
    """DTO for AI-suggested tags."""

    id: str
    name: str
    status: str  # PENDING, ACCEPTED, REJECTED
    confidence: float | None = None


@dataclass
class ItemDto:
    """Item data transfer object."""

    id: str
    raw_text: str
    title: str | None
    summary: str | None
    tags: list[str]  # Confirmed tag names (for backward compatibility)
    status: str
    source_type: str | None
    created_at: datetime
    updated_at: datetime
    confirmed_at: datetime | None
    suggested_tags: list[SuggestedTagDto] = field(default_factory=list)  # AI suggestions


@dataclass
class GetPendingItemsOutput:
    """Output from GetPendingItems use case."""

    items: list[ItemDto]
    total: int


@dataclass
class GetItemInput:
    """Input for GetItem use case."""

    user_id: str
    item_id: str


@dataclass
class UpdateItemInput:
    """Input for UpdateItem use case."""

    user_id: str
    item_id: str
    action: str | None = None  # 'confirm' or 'discard'
    title: str | None = None
    summary: str | None = None
    tags: list[str] | None = None  # Legacy: tag names (backward compatible)
    # New fields for suggestion-based confirm
    accepted_suggestion_ids: list[str] = field(default_factory=list)
    rejected_suggestion_ids: list[str] = field(default_factory=list)
    added_tag_ids: list[str] = field(default_factory=list)  # Existing tag IDs to add
    # New field for edit original text (F1)
    original_text: str | None = None


@dataclass
class UpdateItemOutput:
    """Output from UpdateItem use case."""

    id: str
    status: str
    title: str | None
    summary: str | None
    tags: list[str]
    updated_at: datetime
    confirmed_at: datetime | None


@dataclass
class RetryEnrichmentInput:
    """Input for RetryEnrichment use case."""

    user_id: str
    item_id: str


@dataclass
class RetryEnrichmentOutput:
    """Output from RetryEnrichment use case."""

    id: str
    status: str
    updated_at: datetime
