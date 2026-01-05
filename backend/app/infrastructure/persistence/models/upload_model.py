"""Upload ORM model for file upload lifecycle tracking."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import String, Text, BigInteger, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.database import Base


class UploadModel(Base):
    """Upload database model for tracking file upload lifecycle."""

    __tablename__ = "uploads"

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
    
    # Upload status: INITIATED, COMPLETED, FAILED, EXPIRED, DELETED
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="INITIATED",
    )
    
    # Storage location
    object_key: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    bucket: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # File metadata
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)  # 'image' or 'file'
    
    # Optional integrity/tracking
    checksum: Mapped[str | None] = mapped_column(String(100), nullable=True)
    etag: Mapped[str | None] = mapped_column(String(100), nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(36), nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
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
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    __table_args__ = (
        # User's uploads list
        Index(
            "idx_uploads_user_created",
            "user_id",
            "created_at",
            postgresql_where="deleted_at IS NULL",
        ),
        # Cleanup job (expired/abandoned)
        Index(
            "idx_uploads_expires",
            "expires_at",
            postgresql_where="status = 'INITIATED'",
        ),
        # Idempotency lookup
        Index(
            "idx_uploads_idempotency",
            "user_id",
            "idempotency_key",
            unique=True,
            postgresql_where="idempotency_key IS NOT NULL AND deleted_at IS NULL",
        ),
    )
