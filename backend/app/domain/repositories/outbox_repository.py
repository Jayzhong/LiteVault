"""Enrichment outbox repository interface."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class OutboxJob:
    """Enrichment outbox job."""

    id: str
    item_id: str
    status: str  # PENDING, PROCESSING, COMPLETED, FAILED
    attempt_count: int
    claimed_at: datetime | None
    last_error: str | None
    created_at: datetime


class OutboxRepository(ABC):
    """Abstract repository for enrichment outbox."""

    @abstractmethod
    async def create(self, item_id: str) -> OutboxJob:
        """Create a new outbox job."""
        ...

    @abstractmethod
    async def claim_next_pending(self) -> OutboxJob | None:
        """Claim next pending job with SELECT FOR UPDATE SKIP LOCKED."""
        ...

    @abstractmethod
    async def mark_completed(self, job_id: str) -> None:
        """Mark job as completed and delete."""
        ...

    @abstractmethod
    async def mark_failed(self, job_id: str, error: str) -> None:
        """Mark job as failed, increment attempt count."""
        ...

    @abstractmethod
    async def release_claim(self, job_id: str) -> None:
        """Release claim on job (for retry)."""
        ...

    @abstractmethod
    async def delete_by_item_id(self, item_id: str) -> None:
        """Delete outbox job by item ID (when item is discarded)."""
        ...
