"""ItemTag repository interface."""

from abc import ABC, abstractmethod


class ItemTagRepository(ABC):
    """Abstract repository for item-tag associations."""

    @abstractmethod
    async def create(self, item_id: str, tag_id: str) -> None:
        """Create an association between item and tag."""
        pass

    @abstractmethod
    async def delete_by_item_id(self, item_id: str) -> None:
        """Delete all tag associations for an item."""
        pass

    @abstractmethod
    async def get_tag_ids_by_item_id(self, item_id: str) -> list[str]:
        """Get all tag IDs associated with an item."""
        pass

    @abstractmethod
    async def get_item_ids_by_tag_id(self, tag_id: str) -> list[str]:
        """Get all item IDs associated with a tag."""
        pass

    @abstractmethod
    async def count_by_tag_id(self, tag_id: str) -> int:
        """Count items associated with a tag."""
        pass
