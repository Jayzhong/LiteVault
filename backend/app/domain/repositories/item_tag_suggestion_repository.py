"""Item tag suggestion repository interface."""

from abc import ABC, abstractmethod

from app.domain.entities.item_tag_suggestion import ItemTagSuggestion


class ItemTagSuggestionRepository(ABC):
    """Repository interface for item tag suggestions."""

    @abstractmethod
    async def create(self, suggestion: ItemTagSuggestion) -> ItemTagSuggestion:
        """Persist a new suggestion."""
        ...

    @abstractmethod
    async def create_many(self, suggestions: list[ItemTagSuggestion]) -> list[ItemTagSuggestion]:
        """Persist multiple suggestions."""
        ...

    @abstractmethod
    async def get_by_id(self, suggestion_id: str, user_id: str) -> ItemTagSuggestion | None:
        """Get suggestion by ID, scoped to user."""
        ...

    @abstractmethod
    async def get_by_ids(self, suggestion_ids: list[str], user_id: str) -> list[ItemTagSuggestion]:
        """Get multiple suggestions by IDs, scoped to user."""
        ...

    @abstractmethod
    async def get_by_item_id(self, item_id: str, user_id: str) -> list[ItemTagSuggestion]:
        """Get all suggestions for an item."""
        ...

    @abstractmethod
    async def update(self, suggestion: ItemTagSuggestion) -> ItemTagSuggestion:
        """Update an existing suggestion."""
        ...

    @abstractmethod
    async def update_many(self, suggestions: list[ItemTagSuggestion]) -> list[ItemTagSuggestion]:
        """Update multiple suggestions."""
        ...

    @abstractmethod
    async def delete_by_item_id(self, item_id: str) -> int:
        """Delete all suggestions for an item. Returns count deleted."""
        ...
