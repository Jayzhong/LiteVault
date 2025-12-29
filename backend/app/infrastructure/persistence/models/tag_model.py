"""Tag SQLAlchemy model."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.database import Base


class TagModel(Base):
    """SQLAlchemy model for tags table.
    
    Supports soft-delete via deleted_at column:
    - NULL = active tag
    - Non-NULL = soft-deleted timestamp
    """

    __tablename__ = "tags"

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
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    name_lower: Mapped[str] = mapped_column(String(50), nullable=False)
    usage_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_used: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    color: Mapped[str] = mapped_column(
        String(7), nullable=False, default="#6B7280"  # Default neutral gray
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    __table_args__ = (
        Index("idx_tags_user_name_lower", "user_id", "name_lower", unique=True),
        Index("idx_tags_user_id", "user_id"),
    )

