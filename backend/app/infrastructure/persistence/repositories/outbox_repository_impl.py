"""SQLAlchemy Outbox repository implementation with LISTEN/NOTIFY support."""

from datetime import datetime, timezone, timedelta
from uuid import uuid4

from sqlalchemy import select, delete, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.repositories.outbox_repository import OutboxRepository, OutboxJob
from app.infrastructure.persistence.models.outbox_model import EnrichmentOutboxModel
from app.infrastructure.enrichment.job_notify import notify_job_created


class SQLAlchemyOutboxRepository(OutboxRepository):
    """SQLAlchemy implementation of OutboxRepository with lease-based claiming."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, item_id: str, job_type: str = "enrichment") -> OutboxJob:
        """Create a new outbox job and trigger NOTIFY."""
        model = EnrichmentOutboxModel(
            id=str(uuid4()),
            item_id=item_id,
            job_type=job_type,
            status="PENDING",
            attempt_count=0,
            run_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
        )
        self.session.add(model)
        await self.session.flush()
        
        # Trigger NOTIFY to wake worker (best-effort, after flush)
        await notify_job_created()
        
        return self._to_job(model)

    async def claim_next_pending(
        self, worker_id: str, lease_seconds: int = 300
    ) -> OutboxJob | None:
        """Claim next runnable job with FOR UPDATE SKIP LOCKED and lease.
        
        Args:
            worker_id: Identifier for the worker claiming the job.
            lease_seconds: How long the lease is valid (default 5 minutes).
            
        Returns:
            The claimed job, or None if no jobs available.
        """
        now = datetime.now(timezone.utc)
        
        # Find and lock the next runnable job
        result = await self.session.execute(
            select(EnrichmentOutboxModel)
            .where(
                EnrichmentOutboxModel.status == "PENDING",
                EnrichmentOutboxModel.run_at <= now,
            )
            .order_by(EnrichmentOutboxModel.created_at)
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None

        # Claim the job with lease
        model.status = "IN_PROGRESS"
        model.claimed_at = now
        model.locked_by = worker_id
        model.lease_expires_at = now + timedelta(seconds=lease_seconds)
        model.attempt_count += 1
        await self.session.flush()
        return self._to_job(model)

    async def mark_completed(self, job_id: str) -> None:
        """Mark job as completed and delete."""
        await self.session.execute(
            delete(EnrichmentOutboxModel).where(EnrichmentOutboxModel.id == job_id)
        )
        await self.session.flush()

    async def mark_failed(
        self,
        job_id: str,
        error_code: str,
        error_message: str,
        backoff_seconds: int = 0,
    ) -> None:
        """Mark job for retry with backoff."""
        now = datetime.now(timezone.utc)
        run_at = now + timedelta(seconds=backoff_seconds) if backoff_seconds > 0 else now
        
        await self.session.execute(
            update(EnrichmentOutboxModel)
            .where(EnrichmentOutboxModel.id == job_id)
            .values(
                status="PENDING",
                claimed_at=None,
                locked_by=None,
                lease_expires_at=None,
                run_at=run_at,
                last_error_code=error_code,
                last_error_message=error_message[:500] if error_message else None,
            )
        )
        await self.session.flush()

    async def mark_dead(self, job_id: str, error_code: str, error_message: str) -> None:
        """Mark job as dead (max retries exceeded)."""
        await self.session.execute(
            update(EnrichmentOutboxModel)
            .where(EnrichmentOutboxModel.id == job_id)
            .values(
                status="DEAD",
                last_error_code=error_code,
                last_error_message=error_message[:500] if error_message else None,
            )
        )
        await self.session.flush()

    async def release_claim(self, job_id: str) -> None:
        """Release claim on job (for graceful shutdown)."""
        await self.session.execute(
            update(EnrichmentOutboxModel)
            .where(EnrichmentOutboxModel.id == job_id)
            .values(
                status="PENDING",
                claimed_at=None,
                locked_by=None,
                lease_expires_at=None,
            )
        )
        await self.session.flush()

    async def reclaim_expired_leases(self) -> int:
        """Reset expired leases to PENDING for re-processing.
        
        Returns:
            Number of jobs reclaimed.
        """
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            update(EnrichmentOutboxModel)
            .where(
                EnrichmentOutboxModel.status == "IN_PROGRESS",
                EnrichmentOutboxModel.lease_expires_at.isnot(None),
                EnrichmentOutboxModel.lease_expires_at < now,
            )
            .values(
                status="PENDING",
                claimed_at=None,
                locked_by=None,
                lease_expires_at=None,
            )
        )
        await self.session.flush()
        return result.rowcount  # type: ignore

    async def delete_by_item_id(self, item_id: str) -> None:
        """Delete outbox job by item ID (when item is discarded)."""
        await self.session.execute(
            delete(EnrichmentOutboxModel).where(
                EnrichmentOutboxModel.item_id == item_id
            )
        )
        await self.session.flush()

    async def get_pending_count(self) -> int:
        """Get count of pending jobs (for metrics)."""
        result = await self.session.execute(
            select(func.count(EnrichmentOutboxModel.id)).where(
                EnrichmentOutboxModel.status == "PENDING"
            )
        )
        return result.scalar() or 0

    def _to_job(self, model: EnrichmentOutboxModel) -> OutboxJob:
        """Convert ORM model to domain job."""
        return OutboxJob(
            id=model.id,
            item_id=model.item_id,
            job_type=model.job_type,
            status=model.status,
            attempt_count=model.attempt_count,
            run_at=model.run_at,
            claimed_at=model.claimed_at,
            locked_by=model.locked_by,
            lease_expires_at=model.lease_expires_at,
            last_error_code=model.last_error_code,
            last_error_message=model.last_error_message,
            created_at=model.created_at,
        )
