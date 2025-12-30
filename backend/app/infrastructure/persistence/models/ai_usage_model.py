"""AI Usage ORM models."""

from datetime import date, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.database import Base


class AiDailyUsageModel(Base):
    """Tracks daily AI usage totals per user."""

    __tablename__ = "ai_daily_usage"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    day_date: Mapped[date] = mapped_column(
        Date,
        primary_key=True,
    )
    enrichment_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    limit_override: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )


class AiUsageLedgerModel(Base):
    """Immutable ledger of AI usage events for audit/idempotency."""

    __tablename__ = "ai_usage_ledger"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action: Mapped[str] = mapped_column(
        String(50),  # e.g. 'ENRICH_ITEM'
        nullable=False,
    )
    resource_id: Mapped[str] = mapped_column(
        String(36),  # e.g. item_id
        nullable=False,
    )
    cost_units: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        # Dedup index: prevent double-billing for same action on same resource
        Index(
            "idx_ledger_dedup",
            "user_id",
            "resource_id",
            "action",
            unique=True,
        ),
        # Lookup index for user history
        Index(
            "idx_ledger_user_date",
            "user_id",
            "created_at",
        ),
    )
