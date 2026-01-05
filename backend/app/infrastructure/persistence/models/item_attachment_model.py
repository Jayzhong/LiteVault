"""Item attachment ORM model for associating uploads with items."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import String, DateTime, ForeignKey, Index, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.database import Base


class ItemAttachmentModel(Base):
    """Item attachment database model."""

    __tablename__ = "item_attachments"

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
    item_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    upload_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("uploads.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,  # One attachment per upload
    )
    
    # Display metadata
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)  # 'image' or 'file'
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    # Timestamps
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
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    __table_args__ = (
        # Item's attachments list
        Index(
            "idx_attachments_item",
            "item_id",
            "sort_order",
            postgresql_where="deleted_at IS NULL",
        ),
        # User's attachments
        Index(
            "idx_attachments_user",
            "user_id",
            "created_at",
            postgresql_where="deleted_at IS NULL",
        ),
    )
