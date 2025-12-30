"""GetPendingItems use case."""

from app.domain.repositories.item_repository import ItemRepository
from app.domain.repositories.item_tag_suggestion_repository import (
    ItemTagSuggestionRepository,
)
from app.application.items.dtos import (
    GetPendingItemsInput,
    GetPendingItemsOutput,
    ItemDto,
    SuggestedTagDto,
)
from app.domain.entities.item import Item
from app.domain.entities.item_tag_suggestion import ItemTagSuggestion


class GetPendingItemsUseCase:
    """Use case for getting user's pending items."""

    def __init__(
        self, item_repo: ItemRepository, suggestion_repo: ItemTagSuggestionRepository
    ):
        self.item_repo = item_repo
        self.suggestion_repo = suggestion_repo

    async def execute(self, input: GetPendingItemsInput) -> GetPendingItemsOutput:
        """Execute the use case."""
        items = await self.item_repo.get_pending_by_user(input.user_id)
        
        dtos = []
        for item in items:
            suggestions = await self.suggestion_repo.get_by_item_id(item.id, input.user_id)
            dtos.append(self._to_dto(item, suggestions))
            
        return GetPendingItemsOutput(
            items=dtos,
            total=len(items),
        )

    def _to_dto(
        self, item: Item, suggestions: list[ItemTagSuggestion]
    ) -> ItemDto:
        """Convert item and suggestions to DTO."""
        suggested_tag_dtos = [
            SuggestedTagDto(
                id=s.id,
                name=s.suggested_name,
                status=s.status,
                confidence=s.confidence,
            )
            for s in suggestions
        ]
        
        return ItemDto(
            id=item.id,
            raw_text=item.raw_text,
            title=item.title,
            summary=item.summary,
            tags=item.tags,
            suggested_tags=suggested_tag_dtos,
            status=item.status.value,
            source_type=item.source_type.value if item.source_type else None,
            created_at=item.created_at,
            updated_at=item.updated_at,
            confirmed_at=item.confirmed_at,
        )
