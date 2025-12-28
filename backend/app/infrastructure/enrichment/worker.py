"""In-process enrichment worker."""

import asyncio
import logging

from app.config import settings, LLMProvider
from app.infrastructure.persistence.database import get_db_session_context
from app.infrastructure.persistence.repositories.item_repository_impl import (
    SQLAlchemyItemRepository,
)
from app.infrastructure.persistence.repositories.outbox_repository_impl import (
    SQLAlchemyOutboxRepository,
)
from app.infrastructure.enrichment.provider_interface import (
    EnrichmentProvider,
    EnrichmentError,
)
from app.infrastructure.enrichment.stub_provider import StubAIProvider
from app.domain.value_objects import ItemStatus

logger = logging.getLogger(__name__)


def get_enrichment_provider() -> EnrichmentProvider:
    """Factory to get the configured enrichment provider.
    
    Returns:
        EnrichmentProvider based on settings.llm_provider.
    """
    if settings.llm_provider == LLMProvider.LITELLM:
        from app.infrastructure.enrichment.litellm_provider import LiteLLMProvider
        return LiteLLMProvider()
    else:
        return StubAIProvider()


class EnrichmentWorker:
    """Background worker that processes enrichment jobs from outbox."""

    def __init__(self):
        self.ai_provider = get_enrichment_provider()
        self.running = False
        self._task: asyncio.Task | None = None
        # Semaphore to limit concurrent LLM calls
        self._semaphore = asyncio.Semaphore(settings.llm_concurrency)

    async def start(self) -> None:
        """Start the worker loop."""
        self.running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info(
            f"Enrichment worker started (provider={settings.llm_provider.value}, "
            f"concurrency={settings.llm_concurrency})"
        )

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
                # Get item with row lock (system method - no user scoping)
                item = await item_repo.get_by_id_for_update_system(job.item_id)
                if item is None:
                    # Item was deleted, remove job
                    await outbox_repo.mark_completed(job.id)
                    logger.warning(f"Item {job.item_id} not found, removing job")
                    return

                # Check if item was discarded or already processed
                if item.status in (ItemStatus.DISCARDED, ItemStatus.ARCHIVED):
                    await outbox_repo.mark_completed(job.id)
                    logger.info(f"Item {job.item_id} is {item.status.value}, skipping")
                    return

                # Check if item is no longer in ENRICHING state
                if item.status != ItemStatus.ENRICHING:
                    await outbox_repo.mark_completed(job.id)
                    logger.info(f"Item {job.item_id} is {item.status.value}, skipping")
                    return

                # Perform enrichment with concurrency limit
                async with self._semaphore:
                    result = await self.ai_provider.enrich_item(item.raw_text)

                # Re-check item status under lock before writing results
                # (could have been discarded while waiting)
                item = await item_repo.get_by_id_for_update_system(job.item_id)
                if item is None or item.status != ItemStatus.ENRICHING:
                    await outbox_repo.mark_completed(job.id)
                    logger.info(f"Item {job.item_id} state changed during enrichment, skipping write")
                    return

                # Update item with enrichment results
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

            except EnrichmentError as e:
                logger.error(f"Enrichment error for job {job.id}: {e.error_code} - {e.message}")
                await self._handle_failure(
                    job, item_repo, outbox_repo, 
                    error_code=e.error_code, 
                    error_message=e.message
                )
            except Exception as e:
                logger.exception(f"Unexpected error for job {job.id}: {e}")
                await self._handle_failure(
                    job, item_repo, outbox_repo,
                    error_code="ENRICHMENT_ERROR",
                    error_message=str(e)[:200]  # Truncate long errors
                )

    async def _handle_failure(
        self,
        job,
        item_repo: SQLAlchemyItemRepository,
        outbox_repo: SQLAlchemyOutboxRepository,
        error_code: str,
        error_message: str,
    ) -> None:
        """Handle enrichment failure with retry logic.
        
        Args:
            job: The outbox job that failed.
            item_repo: Item repository.
            outbox_repo: Outbox repository.
            error_code: Error code for tracking.
            error_message: Sanitized error message.
        """
        if job.attempt_count >= settings.enrichment_max_retries:
            # Max retries reached - mark item as FAILED
            item = await item_repo.get_by_id_for_update_system(job.item_id)
            if item and item.status == ItemStatus.ENRICHING:
                item.mark_failed()
                # Store error info for debugging (enrichment_error field)
                # This would require adding enrichment_error column to item
                await item_repo.update(item)
            await outbox_repo.mark_completed(job.id)
            logger.error(
                f"Max retries ({settings.enrichment_max_retries}) reached for item {job.item_id}: "
                f"{error_code} - {error_message}"
            )
        else:
            # Release for retry
            await outbox_repo.mark_failed(job.id, f"{error_code}: {error_message}")
            logger.warning(f"Job {job.id} will be retried (attempt {job.attempt_count + 1})")


# Global worker instance
worker = EnrichmentWorker()

