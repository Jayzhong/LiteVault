"""Enrichment outbox ORM model with LISTEN/NOTIFY support."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.database import Base


class EnrichmentOutboxModel(Base):
    """Enrichment outbox database model for async job processing.
    
    Supports LISTEN/NOTIFY wakeups with fallback polling and lease-based claiming.
    """

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
    job_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="enrichment",
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
    run_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    claimed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    locked_by: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    lease_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_error_code: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    last_error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        # Runnable jobs (status=PENDING, run_at due)
        Index(
            "idx_outbox_runnable",
            "run_at",
            "created_at",
            postgresql_where="status = 'PENDING'",
        ),
        # Expired leases for crash recovery reclaim
        Index(
            "idx_outbox_expired_lease",
            "lease_expires_at",
            postgresql_where="status = 'IN_PROGRESS' AND lease_expires_at IS NOT NULL",
        ),
    )
