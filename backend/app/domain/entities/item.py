"""Item domain entity."""

from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.domain.value_objects import ItemStatus, SourceType, EnrichmentMode
from app.domain.exceptions import InvalidStateTransitionException


@dataclass
class Item:
    """Item entity representing captured content."""

    id: str
    user_id: str
    raw_text: str
    status: ItemStatus
    created_at: datetime
    updated_at: datetime
    title: str | None = None
    summary: str | None = None
    source_type: SourceType | None = None
    confirmed_at: datetime | None = None
    tags: list[str] = field(default_factory=list)
    enrichment_mode: EnrichmentMode = EnrichmentMode.AI

    # State transition rules per state_machine.md
    _ALLOWED_TRANSITIONS: dict[ItemStatus, dict[str, ItemStatus]] = field(
        default_factory=lambda: {
            ItemStatus.ENRICHING: {},  # No actions allowed
            ItemStatus.READY_TO_CONFIRM: {
                "confirm": ItemStatus.ARCHIVED,
                "discard": ItemStatus.DISCARDED,
                "edit": ItemStatus.READY_TO_CONFIRM,
            },
            ItemStatus.FAILED: {
                "discard": ItemStatus.DISCARDED,
                "retry": ItemStatus.ENRICHING,
            },
            ItemStatus.ARCHIVED: {
                "edit": ItemStatus.ARCHIVED,
            },
            ItemStatus.DISCARDED: {},  # Terminal state
        },
        repr=False,
    )

    def can_transition(self, action: str) -> bool:
        """Check if action is allowed in current state."""
        allowed = self._ALLOWED_TRANSITIONS.get(self.status, {})
        return action in allowed

    def validate_transition(self, action: str) -> None:
        """Validate state transition, raise if invalid."""
        if not self.can_transition(action):
            allowed_actions = list(self._ALLOWED_TRANSITIONS.get(self.status, {}).keys())
            raise InvalidStateTransitionException(
                f"Cannot {action} item in {self.status.value} state",
                details={
                    "currentState": self.status.value,
                    "attemptedAction": action,
                    "allowedActions": allowed_actions,
                },
            )

    def confirm(self, tags: list[str] | None = None) -> None:
        """Confirm item and move to ARCHIVED."""
        self.validate_transition("confirm")
        self.status = ItemStatus.ARCHIVED
        self.confirmed_at = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)
        if tags is not None:
            self.tags = tags

    def discard(self) -> None:
        """Discard item."""
        self.validate_transition("discard")
        self.status = ItemStatus.DISCARDED
        self.updated_at = datetime.now(timezone.utc)

    def mark_enriched(
        self,
        title: str,
        summary: str,
        suggested_tags: list[str],
        source_type: SourceType,
    ) -> None:
        """Mark item as enriched (called by worker)."""
        if self.status != ItemStatus.ENRICHING:
            return  # Silently skip if already transitioned
        self.title = title
        self.summary = summary
        self.tags = suggested_tags
        self.source_type = source_type
        self.status = ItemStatus.READY_TO_CONFIRM
        self.updated_at = datetime.now(timezone.utc)

    def mark_failed(self) -> None:
        """Mark item as failed enrichment."""
        if self.status != ItemStatus.ENRICHING:
            return  # Silently skip if already transitioned
        self.status = ItemStatus.FAILED
        self.updated_at = datetime.now(timezone.utc)

    def retry_enrichment(self) -> None:
        """Retry enrichment for failed item."""
        self.validate_transition("retry")
        self.status = ItemStatus.ENRICHING
        self.updated_at = datetime.now(timezone.utc)
