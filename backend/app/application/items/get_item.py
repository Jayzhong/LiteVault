"""GetItem use case."""

from app.domain.repositories.item_repository import ItemRepository
from app.domain.repositories.item_tag_suggestion_repository import ItemTagSuggestionRepository
from app.domain.exceptions import ItemNotFoundException
from app.application.items.dtos import GetItemInput, ItemDto, SuggestedTagDto
from app.domain.entities.item import Item
from app.domain.entities.item_tag_suggestion import ItemTagSuggestion


class GetItemUseCase:
    """Use case for getting a single item."""

    def __init__(
        self,
        item_repo: ItemRepository,
        suggestion_repo: ItemTagSuggestionRepository | None = None,
    ):
        self.item_repo = item_repo
        self.suggestion_repo = suggestion_repo

    async def execute(self, input: GetItemInput) -> ItemDto:
        """Execute the use case."""
        item = await self.item_repo.get_by_id(input.item_id, input.user_id)
        if item is None:
            raise ItemNotFoundException(f"Item {input.item_id} not found")
        
        # Load suggestions if repository is available
        suggestions: list[ItemTagSuggestion] = []
        if self.suggestion_repo:
            suggestions = await self.suggestion_repo.get_by_item_id(input.item_id, input.user_id)
        
        return self._to_dto(item, suggestions)

    def _to_dto(self, item: Item, suggestions: list[ItemTagSuggestion] | None = None) -> ItemDto:
        """Convert item to DTO."""
        suggested_tags = [
            SuggestedTagDto(
                id=s.id,
                name=s.suggested_name,
                status=s.status.value,
                confidence=s.confidence,
            )
            for s in (suggestions or [])
        ]
        
        return ItemDto(
            id=item.id,
            raw_text=item.raw_text,
            title=item.title,
            summary=item.summary,
            tags=item.tags,
            status=item.status.value,
            source_type=item.source_type.value if item.source_type else None,
            created_at=item.created_at,
            updated_at=item.updated_at,
            confirmed_at=item.confirmed_at,
            suggested_tags=suggested_tags,
        )

