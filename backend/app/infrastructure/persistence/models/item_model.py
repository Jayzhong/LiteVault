"""Item ORM model."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import String, Text, DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.database import Base


class ItemModel(Base):
    """Item database model."""

    __tablename__ = "items"

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
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ENRICHING")
    source_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Store tags as array for simplicity in V1 (no separate item_tags table yet)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=[])
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    __table_args__ = (
        Index(
            "idx_items_user_pending",
            "user_id",
            "created_at",
            postgresql_where="status IN ('ENRICHING', 'READY_TO_CONFIRM', 'FAILED')",
        ),
        Index(
            "idx_items_user_archived",
            "user_id",
            "confirmed_at",
            postgresql_where="status = 'ARCHIVED'",
        ),
    )
