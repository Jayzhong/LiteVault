"""User ORM model."""

from datetime import datetime
from uuid import uuid4
from typing import Any

from sqlalchemy import String, DateTime, func, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.database import Base


class UserModel(Base):
    """User database model."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    clerk_user_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True, index=True
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    # Clerk-synced display name
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # App-owned profile fields
    nickname: Mapped[str | None] = mapped_column(String(40), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    bio: Mapped[str | None] = mapped_column(String(200), nullable=True)
    preferences_json: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )
    plan: Mapped[str] = mapped_column(String(20), nullable=False, default="free")
    # password_hash kept for backward compatibility but not used with Clerk
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
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

    __table_args__ = (
        Index("idx_users_clerk_user_id", "clerk_user_id", unique=True),
    )
