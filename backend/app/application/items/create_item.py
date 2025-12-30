"""CreateItem use case."""

from datetime import datetime, timezone
from uuid import uuid4

from app.domain.entities.item import Item
from app.domain.value_objects import ItemStatus, SourceType, EnrichmentMode
from app.domain.exceptions import ValidationException
from app.domain.repositories.item_repository import ItemRepository
from app.domain.repositories.idempotency_repository import IdempotencyRepository
from app.domain.repositories.outbox_repository import OutboxRepository
from app.application.items.dtos import CreateItemInput, CreateItemOutput


class CreateItemUseCase:
    """Use case for creating a new item."""

    MAX_RAW_TEXT_LENGTH = 10000
    MAX_TITLE_LENGTH = 60

    def __init__(
        self,
        item_repo: ItemRepository,
        idempotency_repo: IdempotencyRepository,
        outbox_repo: OutboxRepository,
        tag_repo=None,  # Optional: TagRepository for tag validation
        item_tag_repo=None,  # Optional: ItemTagRepository for associations
    ):
        self.item_repo = item_repo
        self.idempotency_repo = idempotency_repo
        self.outbox_repo = outbox_repo
        self.tag_repo = tag_repo
        self.item_tag_repo = item_tag_repo

    async def execute(self, input: CreateItemInput) -> CreateItemOutput:
        """Execute the use case."""
        # Check idempotency
        if input.idempotency_key:
            existing = await self.idempotency_repo.get(
                input.user_id, input.idempotency_key
            )
            if existing and existing.response_item_id:
                # Return cached item
                item = await self.item_repo.get_by_id(
                    existing.response_item_id, input.user_id
                )
                if item:
                    return self._to_output(item)

        # Validate input
        if not input.raw_text or not input.raw_text.strip():
            raise ValidationException(
                "rawText is required",
                details={"field": "rawText", "constraint": "required"},
            )
        if len(input.raw_text) > self.MAX_RAW_TEXT_LENGTH:
            raise ValidationException(
                f"rawText must be at most {self.MAX_RAW_TEXT_LENGTH} characters",
                details={
                    "field": "rawText",
                    "constraint": "maxLength",
                    "value": self.MAX_RAW_TEXT_LENGTH,
                },
            )

        # Validate tag_ids if provided (for direct save)
        validated_tags = []
        if input.tag_ids and self.tag_repo:
            for tag_id in input.tag_ids:
                tag = await self.tag_repo.get_by_id(tag_id, input.user_id)
                if tag is None:
                    raise ValidationException(
                        f"Tag {tag_id} not found or does not belong to user",
                        details={"field": "tagIds", "constraint": "valid_tag", "value": tag_id},
                    )
                validated_tags.append(tag)

        # Create item based on enrich flag
        now = datetime.now(timezone.utc)
        raw_text = input.raw_text.strip()

        if input.enrich:
            # AI enrichment flow: ENRICHING status, queue job
            item = Item(
                id=str(uuid4()),
                user_id=input.user_id,
                raw_text=raw_text,
                status=ItemStatus.ENRICHING,
                enrichment_mode=EnrichmentMode.AI,
                created_at=now,
                updated_at=now,
            )
            await self.item_repo.create(item)

            # Queue enrichment job
            await self.outbox_repo.create(item.id)
        else:
            # Direct save flow: ARCHIVED immediately, no job
            title = self._generate_manual_title(raw_text)
            item = Item(
                id=str(uuid4()),
                user_id=input.user_id,
                raw_text=raw_text,
                title=title,
                status=ItemStatus.ARCHIVED,
                source_type=SourceType.NOTE,
                enrichment_mode=EnrichmentMode.MANUAL,
                created_at=now,
                updated_at=now,
                confirmed_at=now,  # Set confirmed_at for direct save
                tags=[tag.name for tag in validated_tags],  # Store tag names
            )
            await self.item_repo.create(item)

            # Create tag associations and increment usage
            if validated_tags and self.item_tag_repo:
                for tag in validated_tags:
                    await self.item_tag_repo.create(item.id, tag.id)
                    if self.tag_repo:
                        await self.tag_repo.increment_usage(tag.id)
            # No outbox job created for direct save

        # Save idempotency key
        if input.idempotency_key:
            await self.idempotency_repo.create(
                input.user_id,
                input.idempotency_key,
                item.id,
            )

        return self._to_output(item)

    def _generate_manual_title(self, raw_text: str) -> str:
        """Generate title from first non-empty line, max 60 chars."""
        lines = raw_text.split('\n')
        for line in lines:
            stripped = line.strip()
            if stripped:
                if len(stripped) <= self.MAX_TITLE_LENGTH:
                    return stripped
                return stripped[:self.MAX_TITLE_LENGTH - 3] + "..."
        # Fallback to first 60 chars of raw text
        if len(raw_text) <= self.MAX_TITLE_LENGTH:
            return raw_text
        return raw_text[:self.MAX_TITLE_LENGTH - 3] + "..."

    def _to_output(self, item: Item) -> CreateItemOutput:
        """Convert item to output DTO."""
        return CreateItemOutput(
            id=item.id,
            raw_text=item.raw_text,
            title=item.title,
            summary=item.summary,
            tags=item.tags,
            status=item.status.value,
            source_type=item.source_type.value if item.source_type else None,
            enrichment_mode=item.enrichment_mode.value,
            created_at=item.created_at,
            updated_at=item.updated_at,
            confirmed_at=item.confirmed_at,
        )
