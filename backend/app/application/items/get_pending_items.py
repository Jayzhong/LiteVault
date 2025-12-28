"""GetPendingItems use case."""

from app.domain.repositories.item_repository import ItemRepository
from app.application.items.dtos import (
    GetPendingItemsInput,
    GetPendingItemsOutput,
    ItemDto,
)
from app.domain.entities.item import Item


class GetPendingItemsUseCase:
    """Use case for getting user's pending items."""

    def __init__(self, item_repo: ItemRepository):
        self.item_repo = item_repo

    async def execute(self, input: GetPendingItemsInput) -> GetPendingItemsOutput:
        """Execute the use case."""
        items = await self.item_repo.get_pending_by_user(input.user_id)
        return GetPendingItemsOutput(
            items=[self._to_dto(item) for item in items],
            total=len(items),
        )

    def _to_dto(self, item: Item) -> ItemDto:
        """Convert item to DTO."""
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
        )
