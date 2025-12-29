"""Enrichment outbox repository interface with LISTEN/NOTIFY support."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class OutboxJob:
    """Enrichment outbox job."""

    id: str
    item_id: str
    job_type: str  # 'enrichment' (extensible)
    status: str  # PENDING, IN_PROGRESS, DONE, FAILED, DEAD
    attempt_count: int
    run_at: datetime
    claimed_at: datetime | None
    locked_by: str | None
    lease_expires_at: datetime | None
    last_error_code: str | None
    last_error_message: str | None
    created_at: datetime


class OutboxRepository(ABC):
    """Abstract repository for enrichment outbox with lease-based claiming."""

    @abstractmethod
    async def create(self, item_id: str, job_type: str = "enrichment") -> OutboxJob:
        """Create a new outbox job."""
        ...

    @abstractmethod
    async def claim_next_pending(self, worker_id: str, lease_seconds: int = 300) -> OutboxJob | None:
        """Claim next runnable job with FOR UPDATE SKIP LOCKED and lease.
        
        Args:
            worker_id: Identifier for the worker claiming the job.
            lease_seconds: How long the lease is valid (default 5 minutes).
            
        Returns:
            The claimed job, or None if no jobs available.
        """
        ...

    @abstractmethod
    async def mark_completed(self, job_id: str) -> None:
        """Mark job as completed and delete."""
        ...

    @abstractmethod
    async def mark_failed(
        self,
        job_id: str,
        error_code: str,
        error_message: str,
        backoff_seconds: int = 0,
    ) -> None:
        """Mark job for retry with backoff.
        
        Args:
            job_id: The job ID.
            error_code: Structured error code.
            error_message: Sanitized error message.
            backoff_seconds: Seconds to wait before retry (0 = immediate).
        """
        ...

    @abstractmethod
    async def mark_dead(self, job_id: str, error_code: str, error_message: str) -> None:
        """Mark job as dead (max retries exceeded)."""
        ...

    @abstractmethod
    async def release_claim(self, job_id: str) -> None:
        """Release claim on job (for graceful shutdown)."""
        ...

    @abstractmethod
    async def reclaim_expired_leases(self) -> int:
        """Reset expired leases to PENDING for re-processing.
        
        Returns:
            Number of jobs reclaimed.
        """
        ...

    @abstractmethod
    async def delete_by_item_id(self, item_id: str) -> None:
        """Delete outbox job by item ID (when item is discarded)."""
        ...

    @abstractmethod
    async def get_pending_count(self) -> int:
        """Get count of pending jobs (for metrics)."""
        ...
