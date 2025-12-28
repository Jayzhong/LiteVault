"""CreateItem use case."""

from datetime import datetime, timezone
from uuid import uuid4

from app.domain.entities.item import Item
from app.domain.value_objects import ItemStatus
from app.domain.exceptions import ValidationException
from app.domain.repositories.item_repository import ItemRepository
from app.domain.repositories.idempotency_repository import IdempotencyRepository
from app.domain.repositories.outbox_repository import OutboxRepository
from app.application.items.dtos import CreateItemInput, CreateItemOutput


class CreateItemUseCase:
    """Use case for creating a new item."""

    MAX_RAW_TEXT_LENGTH = 10000

    def __init__(
        self,
        item_repo: ItemRepository,
        idempotency_repo: IdempotencyRepository,
        outbox_repo: OutboxRepository,
    ):
        self.item_repo = item_repo
        self.idempotency_repo = idempotency_repo
        self.outbox_repo = outbox_repo

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

        # Create item
        now = datetime.now(timezone.utc)
        item = Item(
            id=str(uuid4()),
            user_id=input.user_id,
            raw_text=input.raw_text.strip(),
            status=ItemStatus.ENRICHING,
            created_at=now,
            updated_at=now,
        )
        await self.item_repo.create(item)

        # Queue enrichment job
        await self.outbox_repo.create(item.id)

        # Save idempotency key
        if input.idempotency_key:
            await self.idempotency_repo.create(
                input.user_id,
                input.idempotency_key,
                item.id,
            )

        return self._to_output(item)

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
            created_at=item.created_at,
            updated_at=item.updated_at,
            confirmed_at=item.confirmed_at,
        )
