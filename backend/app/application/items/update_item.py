"""UpdateItem use case (confirm, discard, edit)."""

from app.domain.repositories.item_repository import ItemRepository
from app.domain.repositories.outbox_repository import OutboxRepository
from app.domain.exceptions import ItemNotFoundException
from app.application.items.dtos import UpdateItemInput, UpdateItemOutput
from app.domain.entities.item import Item


class UpdateItemUseCase:
    """Use case for updating an item (confirm, discard, or edit)."""

    def __init__(
        self,
        item_repo: ItemRepository,
        outbox_repo: OutboxRepository,
    ):
        self.item_repo = item_repo
        self.outbox_repo = outbox_repo

    async def execute(self, input: UpdateItemInput) -> UpdateItemOutput:
        """Execute the use case."""
        # Get item with lock
        item = await self.item_repo.get_by_id_for_update(input.item_id, input.user_id)
        if item is None:
            raise ItemNotFoundException(f"Item {input.item_id} not found")

        # Handle action
        if input.action == "confirm":
            item.confirm(tags=input.tags)
        elif input.action == "discard":
            item.discard()
            # Delete any pending outbox jobs
            await self.outbox_repo.delete_by_item_id(item.id)
        else:
            # Edit action
            item.validate_transition("edit")
            if input.title is not None:
                item.title = input.title
            if input.summary is not None:
                item.summary = input.summary
            if input.tags is not None:
                item.tags = input.tags

        # Save
        await self.item_repo.update(item)

        return UpdateItemOutput(
            id=item.id,
            status=item.status.value,
            title=item.title,
            summary=item.summary,
            tags=item.tags,
            updated_at=item.updated_at,
            confirmed_at=item.confirmed_at,
        )
