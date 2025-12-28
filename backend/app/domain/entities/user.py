"""User domain entity."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from app.domain.value_objects import UserPlan


@dataclass
class UserPreferences:
    """User preferences."""
    default_language: str = "en"
    timezone: str = "UTC"
    ai_suggestions_enabled: bool = True

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "UserPreferences":
        """Create from dictionary."""
        return cls(
            default_language=data.get("defaultLanguage", "en"),
            timezone=data.get("timezone", "UTC"),
            ai_suggestions_enabled=data.get("aiSuggestionsEnabled", True),
        )

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON storage."""
        return {
            "defaultLanguage": self.default_language,
            "timezone": self.timezone,
            "aiSuggestionsEnabled": self.ai_suggestions_enabled,
        }


@dataclass
class User:
    """User entity."""

    id: str
    clerk_user_id: str | None  # Clerk user ID (user_xxx)
    plan: UserPlan
    created_at: datetime
    updated_at: datetime
    # Clerk-synced fields
    email: str | None = None
    display_name: str | None = None  # From Clerk (name claim)
    # App-owned profile fields
    nickname: str | None = None  # User-set override for display name
    avatar_url: str | None = None  # User-set override for avatar
    bio: str | None = None
    preferences: UserPreferences = field(default_factory=UserPreferences)

    def get_display_name(self) -> str:
        """Get display name with fallback chain: nickname > display_name > email prefix > 'Member'."""
        if self.nickname:
            return self.nickname
        if self.display_name:
            return self.display_name
        if self.email:
            return self.email.split("@")[0]
        return "Member"

    def get_avatar_url(self, clerk_image_url: str | None = None) -> str | None:
        """Get avatar URL with fallback: custom avatar_url > Clerk image."""
        return self.avatar_url or clerk_image_url
