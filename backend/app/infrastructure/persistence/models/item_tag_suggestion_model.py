"""Item tag suggestion ORM model."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import String, Float, DateTime, ForeignKey, Index, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.database import Base


class ItemTagSuggestionModel(Base):
    """Stores AI-generated tag suggestions for items pending review."""

    __tablename__ = "item_tag_suggestions"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    item_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="AI",
    )
    suggested_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    normalized_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    confidence: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PENDING",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    meta: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default="{}",
    )

    __table_args__ = (
        UniqueConstraint("user_id", "item_id", "normalized_name", name="uq_suggestion_per_item_tag"),
        Index(
            "idx_suggestions_user_pending",
            "user_id",
            postgresql_where="status = 'PENDING'",
        ),
    )
