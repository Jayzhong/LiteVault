"""Enrichment outbox ORM model."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.database import Base


class EnrichmentOutboxModel(Base):
    """Enrichment outbox database model for async job processing."""

    __tablename__ = "enrichment_outbox"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    item_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PENDING",
    )
    attempt_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    claimed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        Index(
            "idx_outbox_pending",
            "created_at",
            postgresql_where="status = 'PENDING' AND claimed_at IS NULL",
        ),
        Index(
            "idx_outbox_claimed",
            "claimed_at",
            postgresql_where="status = 'PROCESSING'",
        ),
    )
