"""RetryEnrichment use case."""

from app.domain.repositories.item_repository import ItemRepository
from app.domain.repositories.outbox_repository import OutboxRepository
from app.domain.exceptions import ItemNotFoundException
from app.application.items.dtos import RetryEnrichmentInput, RetryEnrichmentOutput


class RetryEnrichmentUseCase:
    """Use case for retrying failed enrichment."""

    def __init__(
        self,
        item_repo: ItemRepository,
        outbox_repo: OutboxRepository,
    ):
        self.item_repo = item_repo
        self.outbox_repo = outbox_repo

    async def execute(self, input: RetryEnrichmentInput) -> RetryEnrichmentOutput:
        """Execute the use case."""
        # Get item with lock
        item = await self.item_repo.get_by_id_for_update(input.item_id, input.user_id)
        if item is None:
            raise ItemNotFoundException(f"Item {input.item_id} not found")

        # Validate and transition (raises InvalidStateException if not FAILED)
        item.retry_enrichment()

        # Queue new enrichment job
        await self.outbox_repo.create(item.id)

        # Save
        await self.item_repo.update(item)

        return RetryEnrichmentOutput(
            id=item.id,
            status=item.status.value,
            updated_at=item.updated_at,
        )
