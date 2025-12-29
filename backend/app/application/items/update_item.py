"""UpdateItem use case (confirm, discard, edit)."""

from app.domain.repositories.item_repository import ItemRepository
from app.domain.repositories.outbox_repository import OutboxRepository
from app.domain.repositories.item_tag_repository import ItemTagRepository
from app.domain.exceptions import ItemNotFoundException
from app.application.items.dtos import UpdateItemInput, UpdateItemOutput
from app.domain.entities.item import Item


class UpdateItemUseCase:
    """Use case for updating an item (confirm, discard, or edit)."""

    def __init__(
        self,
        item_repo: ItemRepository,
        outbox_repo: OutboxRepository,
        tag_repo=None,
        item_tag_repo: ItemTagRepository | None = None,
    ):
        self.item_repo = item_repo
        self.outbox_repo = outbox_repo
        self.tag_repo = tag_repo
        self.item_tag_repo = item_tag_repo

    async def execute(self, input: UpdateItemInput) -> UpdateItemOutput:
        """Execute the use case."""
        # Get item with lock
        item = await self.item_repo.get_by_id_for_update(input.item_id, input.user_id)
        if item is None:
            raise ItemNotFoundException(f"Item {input.item_id} not found")

        # Handle action
        if input.action == "confirm":
            # Apply any inline edits before confirming
            if input.title is not None:
                item.title = input.title
            if input.summary is not None:
                item.summary = input.summary
            
            # Create item_tags associations and update usage counts
            if input.tags and self.tag_repo and self.item_tag_repo:
                for tag_name in input.tags:
                    # Get or create the tag
                    tag = await self.tag_repo.get_or_create(tag_name, input.user_id)
                    # Create association
                    await self.item_tag_repo.create(item.id, tag.id)
                    # Increment usage count
                    await self.tag_repo.increment_usage(tag.id)
            
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
                # Handle tag changes: compute diff and update
                if self.tag_repo and self.item_tag_repo:
                    old_tag_ids = await self.item_tag_repo.get_tag_ids_by_item_id(item.id)
                    
                    # Get new tag IDs
                    new_tag_ids = []
                    for tag_name in input.tags:
                        tag = await self.tag_repo.get_or_create(tag_name, input.user_id)
                        new_tag_ids.append(tag.id)
                    
                    # Decrement for removed tags
                    for old_id in old_tag_ids:
                        if old_id not in new_tag_ids:
                            await self.tag_repo.decrement_usage(old_id)
                    
                    # Clear old associations
                    await self.item_tag_repo.delete_by_item_id(item.id)
                    
                    # Create new associations and increment for added tags
                    for i, tag_name in enumerate(input.tags):
                        tag_id = new_tag_ids[i]
                        await self.item_tag_repo.create(item.id, tag_id)
                        if tag_id not in old_tag_ids:
                            await self.tag_repo.increment_usage(tag_id)
                
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
