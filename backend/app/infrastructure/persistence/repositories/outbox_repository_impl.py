"""SQLAlchemy Outbox repository implementation."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.repositories.outbox_repository import OutboxRepository, OutboxJob
from app.infrastructure.persistence.models.outbox_model import EnrichmentOutboxModel


class SQLAlchemyOutboxRepository(OutboxRepository):
    """SQLAlchemy implementation of OutboxRepository."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, item_id: str) -> OutboxJob:
        """Create a new outbox job."""
        model = EnrichmentOutboxModel(
            id=str(uuid4()),
            item_id=item_id,
            status="PENDING",
            attempt_count=0,
            created_at=datetime.now(timezone.utc),
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_job(model)

    async def claim_next_pending(self) -> OutboxJob | None:
        """Claim next pending job with SELECT FOR UPDATE SKIP LOCKED."""
        # Find and lock the next pending job
        result = await self.session.execute(
            select(EnrichmentOutboxModel)
            .where(
                EnrichmentOutboxModel.status == "PENDING",
                EnrichmentOutboxModel.claimed_at.is_(None),
            )
            .order_by(EnrichmentOutboxModel.created_at)
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None

        # Claim the job
        model.status = "PROCESSING"
        model.claimed_at = datetime.now(timezone.utc)
        model.attempt_count += 1
        await self.session.flush()
        return self._to_job(model)

    async def mark_completed(self, job_id: str) -> None:
        """Mark job as completed and delete."""
        await self.session.execute(
            delete(EnrichmentOutboxModel).where(EnrichmentOutboxModel.id == job_id)
        )
        await self.session.flush()

    async def mark_failed(self, job_id: str, error: str) -> None:
        """Mark job as failed, keep for retry."""
        await self.session.execute(
            update(EnrichmentOutboxModel)
            .where(EnrichmentOutboxModel.id == job_id)
            .values(
                status="PENDING",  # Reset to pending for retry
                claimed_at=None,
                last_error=error,
            )
        )
        await self.session.flush()

    async def release_claim(self, job_id: str) -> None:
        """Release claim on job (for retry)."""
        await self.session.execute(
            update(EnrichmentOutboxModel)
            .where(EnrichmentOutboxModel.id == job_id)
            .values(
                status="PENDING",
                claimed_at=None,
            )
        )
        await self.session.flush()

    async def delete_by_item_id(self, item_id: str) -> None:
        """Delete outbox job by item ID (when item is discarded)."""
        await self.session.execute(
            delete(EnrichmentOutboxModel).where(
                EnrichmentOutboxModel.item_id == item_id
            )
        )
        await self.session.flush()

    def _to_job(self, model: EnrichmentOutboxModel) -> OutboxJob:
        """Convert ORM model to domain job."""
        return OutboxJob(
            id=model.id,
            item_id=model.item_id,
            status=model.status,
            attempt_count=model.attempt_count,
            claimed_at=model.claimed_at,
            last_error=model.last_error,
            created_at=model.created_at,
        )
