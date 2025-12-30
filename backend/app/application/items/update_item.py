"""UpdateItem use case (confirm, discard, edit)."""

from app.domain.repositories.item_repository import ItemRepository
from app.domain.repositories.outbox_repository import OutboxRepository
from app.domain.repositories.item_tag_repository import ItemTagRepository
from app.domain.repositories.item_tag_suggestion_repository import ItemTagSuggestionRepository
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
        suggestion_repo: ItemTagSuggestionRepository | None = None,
    ):
        self.item_repo = item_repo
        self.outbox_repo = outbox_repo
        self.tag_repo = tag_repo
        self.item_tag_repo = item_tag_repo
        self.suggestion_repo = suggestion_repo

    async def execute(self, input: UpdateItemInput) -> UpdateItemOutput:
        """Execute the use case."""
        # Get item with lock
        item = await self.item_repo.get_by_id_for_update(input.item_id, input.user_id)
        if item is None:
            raise ItemNotFoundException(f"Item {input.item_id} not found")

        # Handle action
        if input.action == "confirm":
            await self._handle_confirm(item, input)
        elif input.action == "discard":
            item.discard()
            # Delete any pending outbox jobs
            await self.outbox_repo.delete_by_item_id(item.id)
        else:
            # Edit action (for ARCHIVED items)
            await self._handle_edit(item, input)

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

    async def _handle_confirm(self, item: Item, input: UpdateItemInput) -> None:
        """Handle confirm action with suggestion processing."""
        # Apply any inline edits before confirming
        if input.title is not None:
            item.title = input.title
        if input.summary is not None:
            item.summary = input.summary

        collected_tag_names: list[str] = []
        processed_tag_ids: set[str] = set()

        async def _link_tag(tag_id: str, tag_name: str):
            if tag_id in processed_tag_ids:
                return
            
            collected_tag_names.append(tag_name)
            processed_tag_ids.add(tag_id)
            
            if self.item_tag_repo:
                # Check for existing association to avoid error
                exists = await self.item_tag_repo.exists(item.id, tag_id)
                if not exists:
                    await self.item_tag_repo.create(item.id, tag_id)
                    if self.tag_repo:
                        await self.tag_repo.increment_usage(tag_id)

        # Process accepted suggestions (create/revive tags)
        if input.accepted_suggestion_ids and self.suggestion_repo and self.tag_repo:
            suggestions = await self.suggestion_repo.get_by_ids(
                input.accepted_suggestion_ids, input.user_id
            )
            for suggestion in suggestions:
                if suggestion.item_id != item.id:
                    continue
                
                suggestion.accept()
                await self.suggestion_repo.update(suggestion)
                
                # Create or revive tag
                tag = await self.tag_repo.get_or_create(
                    suggestion.suggested_name, input.user_id
                )
                await _link_tag(tag.id, tag.name)

        # Process rejected suggestions
        if input.rejected_suggestion_ids and self.suggestion_repo:
            suggestions = await self.suggestion_repo.get_by_ids(
                input.rejected_suggestion_ids, input.user_id
            )
            for suggestion in suggestions:
                if suggestion.item_id != item.id:
                    continue
                suggestion.reject()
                await self.suggestion_repo.update(suggestion)

        # Process added existing tags (IDs)
        if input.added_tag_ids and self.tag_repo:
            for tag_id in input.added_tag_ids:
                tag = await self.tag_repo.get_by_id(tag_id, input.user_id)
                if tag and not tag.deleted_at:
                    await _link_tag(tag.id, tag.name)

        # Process tags provided as names (Legacy + Manual additions)
        if input.tags and self.tag_repo:
            for tag_name in input.tags:
                tag = await self.tag_repo.get_or_create(tag_name, input.user_id)
                await _link_tag(tag.id, tag.name)
        elif input.tags:
            # Fallback if no repos (unlikely)
            collected_tag_names.extend(input.tags)

        # Confirm with collected tags
        item.confirm(tags=collected_tag_names if collected_tag_names else input.tags)

    async def _handle_edit(self, item: Item, input: UpdateItemInput) -> None:
        """Handle edit action for ARCHIVED items."""
        item.validate_transition("edit")
        
        if input.title is not None:
            item.title = input.title
        if input.summary is not None:
            item.summary = input.summary
        if input.original_text is not None:
            item.raw_text = input.original_text
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

