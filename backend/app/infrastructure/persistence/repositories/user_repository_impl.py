"""SQLAlchemy User repository implementation."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.user import User, UserPreferences
from app.domain.value_objects import UserPlan
from app.domain.repositories.user_repository import UserRepository
from app.infrastructure.persistence.models.user_model import UserModel
from app.infrastructure.auth.clerk import ClerkPrincipal


class SQLAlchemyUserRepository(UserRepository):
    """SQLAlchemy implementation of UserRepository."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user: User) -> User:
        """Create a new user."""
        model = UserModel(
            id=user.id,
            clerk_user_id=user.clerk_user_id,
            email=user.email or f"user-{user.id}@litevault.local",
            name=user.display_name or "LiteVault User",
            nickname=user.nickname,
            avatar_url=user.avatar_url,
            bio=user.bio,
            preferences_json=user.preferences.to_dict(),
            plan=user.plan.value,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
        self.session.add(model)
        await self.session.flush()
        return user

    async def update(self, user: User) -> User:
        """Update an existing user."""
        result = await self.session.execute(
            select(UserModel).where(UserModel.id == user.id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            raise ValueError(f"User not found: {user.id}")

        model.nickname = user.nickname
        model.avatar_url = user.avatar_url
        model.bio = user.bio
        model.preferences_json = user.preferences.to_dict()
        model.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, user_id: str) -> User | None:
        """Get user by ID."""
        result = await self.session.execute(
            select(UserModel).where(UserModel.id == user_id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None
        return self._to_entity(model)

    async def get_by_clerk_user_id(self, clerk_user_id: str) -> User | None:
        """Get user by Clerk user ID."""
        result = await self.session.execute(
            select(UserModel).where(UserModel.clerk_user_id == clerk_user_id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None
        return self._to_entity(model)

    async def get_or_create_from_clerk(self, principal: ClerkPrincipal) -> User:
        """Get or create a user from Clerk JWT claims (just-in-time upsert)."""
        existing = await self.get_by_clerk_user_id(principal.clerk_user_id)
        if existing:
            # Update email/name from Clerk if changed
            needs_update = False
            updated_email = existing.email
            updated_name = existing.display_name

            if principal.email and existing.email != principal.email:
                updated_email = principal.email
                needs_update = True
            if principal.name and existing.display_name != principal.name:
                updated_name = principal.name
                needs_update = True

            if needs_update:
                result = await self.session.execute(
                    select(UserModel).where(UserModel.clerk_user_id == principal.clerk_user_id)
                )
                model = result.scalar_one()
                model.email = updated_email
                model.name = updated_name
                model.updated_at = datetime.now(timezone.utc)
                await self.session.flush()
                return self._to_entity(model)

            return existing

        # Create new user from Clerk principal
        now = datetime.now(timezone.utc)
        user = User(
            id=str(uuid4()),
            clerk_user_id=principal.clerk_user_id,
            email=principal.email,
            display_name=principal.name,
            avatar_url=None,  # Don't set custom avatar from Clerk
            nickname=None,
            bio=None,
            preferences=UserPreferences(),
            plan=UserPlan.FREE,
            created_at=now,
            updated_at=now,
        )
        return await self.create(user)

    async def get_or_create_dev_user(self, user_id: str) -> User:
        """Get or create a dev user (for X-Dev-User-Id auth)."""
        existing = await self.get_by_id(user_id)
        if existing:
            return existing

        # Create dev user
        now = datetime.now(timezone.utc)
        user = User(
            id=user_id,
            clerk_user_id=None,  # Dev users don't have Clerk ID
            email=f"dev-{user_id}@litevault.local",
            display_name=f"Dev User {user_id[:8]}",
            nickname=None,
            bio=None,
            preferences=UserPreferences(),
            plan=UserPlan.FREE,
            created_at=now,
            updated_at=now,
        )
        return await self.create(user)

    def _to_entity(self, model: UserModel) -> User:
        """Convert ORM model to domain entity."""
        return User(
            id=model.id,
            clerk_user_id=model.clerk_user_id,
            email=model.email,
            display_name=model.name,
            nickname=model.nickname,
            avatar_url=model.avatar_url,
            bio=model.bio,
            preferences=UserPreferences.from_dict(model.preferences_json or {}),
            plan=UserPlan(model.plan),
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
