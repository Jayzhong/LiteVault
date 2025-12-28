"""In-process enrichment worker."""

import asyncio
import logging

from app.config import settings
from app.infrastructure.persistence.database import get_db_session_context
from app.infrastructure.persistence.repositories.item_repository_impl import (
    SQLAlchemyItemRepository,
)
from app.infrastructure.persistence.repositories.outbox_repository_impl import (
    SQLAlchemyOutboxRepository,
)
from app.infrastructure.enrichment.stub_provider import StubAIProvider
from app.domain.value_objects import ItemStatus

logger = logging.getLogger(__name__)


class EnrichmentWorker:
    """Background worker that processes enrichment jobs from outbox."""

    def __init__(self):
        self.ai_provider = StubAIProvider()
        self.running = False
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        """Start the worker loop."""
        self.running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("Enrichment worker started")

    async def stop(self) -> None:
        """Stop the worker loop."""
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Enrichment worker stopped")

    async def _run_loop(self) -> None:
        """Main worker loop."""
        while self.running:
            try:
                await self._process_one_job()
            except Exception as e:
                logger.exception(f"Error in enrichment worker: {e}")
            
            # Sleep between polls
            await asyncio.sleep(settings.enrichment_poll_interval_secs)

    async def _process_one_job(self) -> None:
        """Process one job from the outbox."""
        async with get_db_session_context() as session:
            outbox_repo = SQLAlchemyOutboxRepository(session)
            item_repo = SQLAlchemyItemRepository(session)

            # Claim next pending job
            job = await outbox_repo.claim_next_pending()
            if job is None:
                return  # No jobs to process

            logger.info(f"Processing enrichment job {job.id} for item {job.item_id}")

            try:
                # Get item
                item = await item_repo.get_by_id_for_update(job.item_id, "")
                if item is None:
                    # Item was deleted, remove job
                    await outbox_repo.mark_completed(job.id)
                    logger.warning(f"Item {job.item_id} not found, removing job")
                    return

                # Check if item was discarded
                if item.status == ItemStatus.DISCARDED:
                    await outbox_repo.mark_completed(job.id)
                    logger.info(f"Item {job.item_id} was discarded, skipping")
                    return

                # Check if item is no longer in ENRICHING state
                if item.status != ItemStatus.ENRICHING:
                    await outbox_repo.mark_completed(job.id)
                    logger.info(f"Item {job.item_id} is {item.status.value}, skipping")
                    return

                # Perform enrichment
                result = await self.ai_provider.enrich_item(item.raw_text)

                # Update item
                item.mark_enriched(
                    title=result.title,
                    summary=result.summary,
                    suggested_tags=result.suggested_tags,
                    source_type=result.source_type,
                )
                await item_repo.update(item)

                # Mark job completed
                await outbox_repo.mark_completed(job.id)
                logger.info(f"Enrichment completed for item {job.item_id}")

            except Exception as e:
                logger.exception(f"Enrichment failed for job {job.id}: {e}")
                
                # Check max retries
                if job.attempt_count >= settings.enrichment_max_retries:
                    # Mark item as failed
                    item = await item_repo.get_by_id_for_update(job.item_id, "")
                    if item and item.status == ItemStatus.ENRICHING:
                        item.mark_failed()
                        await item_repo.update(item)
                    await outbox_repo.mark_completed(job.id)
                    logger.error(f"Max retries reached for item {job.item_id}")
                else:
                    # Release for retry
                    await outbox_repo.mark_failed(job.id, str(e))
                    logger.warning(f"Job {job.id} will be retried")


# Global worker instance
worker = EnrichmentWorker()
