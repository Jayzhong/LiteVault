"""Item tag suggestion domain entity."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class SuggestionStatus(str, Enum):
    """Status of a tag suggestion."""

    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class SuggestionSource(str, Enum):
    """Source of a tag suggestion."""

    AI = "AI"
    SYSTEM = "SYSTEM"


@dataclass
class ItemTagSuggestion:
    """Entity representing an AI-generated tag suggestion for an item."""

    id: str
    user_id: str
    item_id: str
    suggested_name: str  # Original case from AI
    normalized_name: str  # Lowercase for matching
    status: SuggestionStatus = SuggestionStatus.PENDING
    source: SuggestionSource = SuggestionSource.AI
    confidence: float | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    reviewed_at: datetime | None = None
    meta: dict = field(default_factory=dict)

    def accept(self) -> None:
        """Mark suggestion as accepted."""
        self.status = SuggestionStatus.ACCEPTED
        self.reviewed_at = datetime.now(timezone.utc)

    def reject(self) -> None:
        """Mark suggestion as rejected."""
        self.status = SuggestionStatus.REJECTED
        self.reviewed_at = datetime.now(timezone.utc)

    @property
    def is_pending(self) -> bool:
        """Check if suggestion is still pending review."""
        return self.status == SuggestionStatus.PENDING

    @classmethod
    def create(
        cls,
        id: str,
        user_id: str,
        item_id: str,
        suggested_name: str,
        confidence: float | None = None,
        source: SuggestionSource = SuggestionSource.AI,
    ) -> "ItemTagSuggestion":
        """Create a new suggestion with normalized name."""
        return cls(
            id=id,
            user_id=user_id,
            item_id=item_id,
            suggested_name=suggested_name,
            normalized_name=suggested_name.strip().lower(),
            confidence=confidence,
            source=source,
        )
