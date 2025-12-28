"""SQLAlchemy Idempotency repository implementation."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.repositories.idempotency_repository import (
    IdempotencyRepository,
    IdempotencyRecord,
)
from app.infrastructure.persistence.models.idempotency_model import IdempotencyKeyModel


class SQLAlchemyIdempotencyRepository(IdempotencyRepository):
    """SQLAlchemy implementation of IdempotencyRepository."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, user_id: str, key: str) -> IdempotencyRecord | None:
        """Get idempotency record by user and key."""
        result = await self.session.execute(
            select(IdempotencyKeyModel).where(
                IdempotencyKeyModel.user_id == user_id,
                IdempotencyKeyModel.idempotency_key == key,
                IdempotencyKeyModel.expires_at > datetime.now(timezone.utc),
            )
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None
        return self._to_record(model)

    async def create(
        self,
        user_id: str,
        key: str,
        response_item_id: str,
        ttl_hours: int = 24,
    ) -> IdempotencyRecord:
        """Create idempotency record."""
        now = datetime.now(timezone.utc)
        model = IdempotencyKeyModel(
            id=str(uuid4()),
            user_id=user_id,
            idempotency_key=key,
            response_item_id=response_item_id,
            created_at=now,
            expires_at=now + timedelta(hours=ttl_hours),
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_record(model)

    def _to_record(self, model: IdempotencyKeyModel) -> IdempotencyRecord:
        """Convert ORM model to domain record."""
        return IdempotencyRecord(
            id=model.id,
            user_id=model.user_id,
            idempotency_key=model.idempotency_key,
            response_item_id=model.response_item_id,
            created_at=model.created_at,
            expires_at=model.expires_at,
        )
