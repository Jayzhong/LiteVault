"""GetItem use case."""

from app.domain.repositories.item_repository import ItemRepository
from app.domain.exceptions import ItemNotFoundException
from app.application.items.dtos import GetItemInput, ItemDto
from app.domain.entities.item import Item


class GetItemUseCase:
    """Use case for getting a single item."""

    def __init__(self, item_repo: ItemRepository):
        self.item_repo = item_repo

    async def execute(self, input: GetItemInput) -> ItemDto:
        """Execute the use case."""
        item = await self.item_repo.get_by_id(input.item_id, input.user_id)
        if item is None:
            raise ItemNotFoundException(f"Item {input.item_id} not found")
        return self._to_dto(item)

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
