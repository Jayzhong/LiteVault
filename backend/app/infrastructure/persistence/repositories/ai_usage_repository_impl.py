"""SQLAlchemy implementation of AI Usage Repository."""

from datetime import date
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.domain.repositories.ai_usage_repository import AIUsageRepository
from app.infrastructure.persistence.models.ai_usage_model import (
    AiDailyUsageModel,
    AiUsageLedgerModel,
)


class SQLAlchemyAIUsageRepository(AIUsageRepository):
    """SQLAlchemy implementation of AIUsageRepository."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def increment_daily_usage(self, user_id: str, day: date, amount: int = 1) -> int:
        """
        Atomically increment daily usage counter.
        Returns the NEW total count for the day.
        """
        stmt = pg_insert(AiDailyUsageModel).values(
            user_id=user_id,
            day_date=day,
            enrichment_count=amount,
        ).on_conflict_do_update(
            index_elements=["user_id", "day_date"],
            set_={
                "enrichment_count": AiDailyUsageModel.enrichment_count + amount,
                "updated_at": func.now(),
            },
        ).returning(AiDailyUsageModel.enrichment_count)

        result = await self.session.execute(stmt)
        # Flush to ensure it applies in transaction
        await self.session.flush()
        return result.scalar_one()

    async def record_ledger_entry(
        self,
        user_id: str,
        action: str,
        resource_id: str,
        cost_units: int = 1,
    ) -> bool:
        """
        Record a ledger entry for auditing and idempotency.
        Returns True if recorded, False if already exists (duplicate/idempotent).
        """
        stmt = pg_insert(AiUsageLedgerModel).values(
            user_id=user_id,
            action=action,
            resource_id=resource_id,
            cost_units=cost_units,
        ).on_conflict_do_nothing(
            index_elements=["user_id", "resource_id", "action"]
        )

        result = await self.session.execute(stmt)
        await self.session.flush()
        # rowcount is 1 if inserted, 0 if conflict ignored
        return result.rowcount > 0

    async def get_daily_usage(self, user_id: str, day: date) -> int:
        """Get current usage count for the day."""
        stmt = select(AiDailyUsageModel.enrichment_count).where(
            AiDailyUsageModel.user_id == user_id,
            AiDailyUsageModel.day_date == day,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() or 0
