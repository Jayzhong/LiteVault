"""Auth and profile API endpoints."""

import re
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_user_repository
from app.domain.entities.user import User
from app.domain.exceptions import ValidationException
from app.infrastructure.persistence.database import get_db_session
from app.infrastructure.persistence.repositories.user_repository_impl import (
    SQLAlchemyUserRepository,
)


router = APIRouter(prefix="/auth", tags=["auth"])


# --- Response Schemas ---


class PreferencesResponse(BaseModel):
    """User preferences response."""
    defaultLanguage: str
    timezone: str
    aiSuggestionsEnabled: bool


class UserResponse(BaseModel):
    """Full user response schema."""
    id: str
    clerkUserId: str | None
    email: str | None
    displayName: str | None
    nickname: str | None
    avatarUrl: str | None
    bio: str | None
    preferences: PreferencesResponse
    plan: str
    createdAt: str
    updatedAt: str


# --- Request Schemas ---


class UpdateProfileRequest(BaseModel):
    """Request schema for PATCH /me/profile."""
    nickname: str | None = Field(None, min_length=1, max_length=40)
    avatarUrl: str | None = Field(None, max_length=500)
    bio: str | None = Field(None, max_length=200)

    @field_validator("nickname")
    @classmethod
    def validate_nickname(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if len(v) < 1:
                raise ValueError("Nickname must be at least 1 character")
            if len(v) > 40:
                raise ValueError("Nickname must be at most 40 characters")
        return v

    @field_validator("avatarUrl")
    @classmethod
    def validate_avatar_url(cls, v: str | None) -> str | None:
        if v is not None and v.strip():
            v = v.strip()
            if not re.match(r"^https?://", v, re.IGNORECASE):
                raise ValueError("Avatar URL must be a valid http:// or https:// URL")
        return v if v else None


class UpdatePreferencesRequest(BaseModel):
    """Request schema for PATCH /me/preferences."""
    defaultLanguage: str | None = Field(None, pattern=r"^(en|zh)$")
    timezone: str | None = Field(None, max_length=50)
    aiSuggestionsEnabled: bool | None = None


# --- Endpoints ---


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Get current authenticated user profile with preferences."""
    return _user_to_response(current_user)


@router.patch("/me/profile", response_model=UserResponse)
async def update_profile(
    request: UpdateProfileRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> UserResponse:
    """Update user profile fields (nickname, avatarUrl, bio)."""
    user_repo = SQLAlchemyUserRepository(session)

    # Apply updates
    if request.nickname is not None:
        current_user.nickname = request.nickname
    if request.avatarUrl is not None:
        current_user.avatar_url = request.avatarUrl if request.avatarUrl else None
    if request.bio is not None:
        current_user.bio = request.bio

    # Save
    updated_user = await user_repo.update(current_user)
    await session.commit()

    return _user_to_response(updated_user)


@router.patch("/me/preferences", response_model=UserResponse)
async def update_preferences(
    request: UpdatePreferencesRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> UserResponse:
    """Update user preferences (language, timezone, AI suggestions)."""
    user_repo = SQLAlchemyUserRepository(session)

    # Apply updates to preferences
    if request.defaultLanguage is not None:
        current_user.preferences.default_language = request.defaultLanguage
    if request.timezone is not None:
        current_user.preferences.timezone = request.timezone
    if request.aiSuggestionsEnabled is not None:
        current_user.preferences.ai_suggestions_enabled = request.aiSuggestionsEnabled

    # Save
    updated_user = await user_repo.update(current_user)
    await session.commit()

    return _user_to_response(updated_user)


def _user_to_response(user: User) -> UserResponse:
    """Convert User entity to response."""
    return UserResponse(
        id=user.id,
        clerkUserId=user.clerk_user_id,
        email=user.email,
        displayName=user.display_name,
        nickname=user.nickname,
        avatarUrl=user.avatar_url,
        bio=user.bio,
        preferences=PreferencesResponse(
            defaultLanguage=user.preferences.default_language,
            timezone=user.preferences.timezone,
            aiSuggestionsEnabled=user.preferences.ai_suggestions_enabled,
        ),
        plan=user.plan.value,
        createdAt=user.created_at.isoformat(),
        updatedAt=user.updated_at.isoformat(),
    )
