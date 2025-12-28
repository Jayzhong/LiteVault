"""User repository interface."""

from abc import ABC, abstractmethod

from app.domain.entities.user import User


class UserRepository(ABC):
    """Abstract repository for User entity."""

    @abstractmethod
    async def create(self, user: User) -> User:
        """Create a new user."""
        ...

    @abstractmethod
    async def get_by_id(self, user_id: str) -> User | None:
        """Get user by ID."""
        ...

    @abstractmethod
    async def get_or_create_dev_user(self, user_id: str) -> User:
        """Get or create a dev user (for X-Dev-User-Id auth)."""
        ...
