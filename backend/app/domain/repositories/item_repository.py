"""Item repository interface."""

from abc import ABC, abstractmethod

from app.domain.entities.item import Item
from app.domain.value_objects import ItemStatus


class ItemRepository(ABC):
    """Abstract repository for Item entity."""

    @abstractmethod
    async def create(self, item: Item) -> Item:
        """Create a new item."""
        ...

    @abstractmethod
    async def get_by_id(self, item_id: str, user_id: str) -> Item | None:
        """Get item by ID, scoped to user."""
        ...

    @abstractmethod
    async def get_by_id_for_update(self, item_id: str, user_id: str) -> Item | None:
        """Get item by ID with row lock for update."""
        ...

    @abstractmethod
    async def get_pending_by_user(self, user_id: str) -> list[Item]:
        """Get items with pending statuses for user."""
        ...

    @abstractmethod
    async def update(self, item: Item) -> Item:
        """Update an existing item."""
        ...
