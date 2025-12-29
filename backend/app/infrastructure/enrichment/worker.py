"""In-process enrichment worker with LISTEN/NOTIFY support.

This worker processes enrichment jobs from the outbox table using:
1. LISTEN/NOTIFY for low-latency wakeups (when enabled)
2. Fallback polling for reliability
3. Lease-based claiming for crash recovery
"""

import asyncio
import logging
import os
from uuid import uuid4

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
from app.infrastructure.enrichment.job_notify import set_notify_callback, clear_notify_callback
from app.domain.value_objects import ItemStatus
from app.domain.repositories.outbox_repository import OutboxJob

logger = logging.getLogger(__name__)


def get_enrichment_provider() -> EnrichmentProvider:
    """Factory to get the configured enrichment provider."""
    if settings.llm_provider == LLMProvider.LITELLM:
        from app.infrastructure.enrichment.litellm_provider import LiteLLMProvider
        return LiteLLMProvider()
    else:
        return StubAIProvider()


def generate_worker_id() -> str:
    """Generate a unique worker ID."""
    if settings.job_worker_id:
        return settings.job_worker_id
    hostname = os.environ.get("HOSTNAME", "local")
    pid = os.getpid()
    return f"{hostname}-{pid}-{uuid4().hex[:8]}"


class EnrichmentWorker:
    """Background worker that processes enrichment jobs from outbox.
    
    Uses LISTEN/NOTIFY for low-latency wakeups with fallback polling.
    """

    def __init__(self):
        self.ai_provider = get_enrichment_provider()
        self.worker_id = generate_worker_id()
        self.running = False
        self._poll_task: asyncio.Task | None = None
        self._reclaim_task: asyncio.Task | None = None
        self._drain_lock = asyncio.Lock()
        # Semaphore to limit concurrent LLM calls
        self._semaphore = asyncio.Semaphore(settings.llm_concurrency)

    async def start(self) -> None:
        """Start the worker loops."""
        self.running = True
        
        # Register NOTIFY callback
        set_notify_callback(self.trigger_drain)
        
        # Startup scan - drain any pending jobs
        logger.info(f"Worker {self.worker_id} starting, draining pending jobs...")
        await self._drain_all()
        
        # Start fallback poll loop
        poll_interval = (
            settings.job_poll_interval_secs 
            if settings.job_notify_enabled 
            else settings.enrichment_poll_interval_secs
        )
        self._poll_task = asyncio.create_task(self._poll_loop(poll_interval))
        
        # Start lease reclaim loop
        self._reclaim_task = asyncio.create_task(self._reclaim_loop())
        
        logger.info(
            f"Enrichment worker {self.worker_id} started "
            f"(provider={settings.llm_provider.value}, "
            f"notify={'enabled' if settings.job_notify_enabled else 'disabled'}, "
            f"poll={poll_interval}s, "
            f"concurrency={settings.llm_concurrency})"
        )

    async def stop(self) -> None:
        """Stop the worker loops gracefully."""
        self.running = False
        
        if self._poll_task:
            self._poll_task.cancel()
            try:
                await self._poll_task
            except asyncio.CancelledError:
                pass
                
        if self._reclaim_task:
            self._reclaim_task.cancel()
            try:
                await self._reclaim_task
            except asyncio.CancelledError:
                pass
        
        # Clear NOTIFY callback
        clear_notify_callback()
                
        logger.info(f"Enrichment worker {self.worker_id} stopped")

    async def trigger_drain(self) -> None:
        """Trigger a drain cycle (called externally by NOTIFY handler)."""
        asyncio.create_task(self._drain_all())

    async def _poll_loop(self, interval_seconds: int) -> None:
        """Fallback polling loop."""
        while self.running:
            try:
                await asyncio.sleep(interval_seconds)
                await self._drain_all()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.exception(f"Error in poll loop: {e}")

    async def _reclaim_loop(self) -> None:
        """Periodically reclaim expired leases."""
        while self.running:
            try:
                # Run less frequently than poll (every 2 minutes)
                await asyncio.sleep(120)
                await self._reclaim_expired()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.exception(f"Error in reclaim loop: {e}")

    async def _reclaim_expired(self) -> None:
        """Reclaim jobs with expired leases."""
        async with get_db_session_context() as session:
            outbox_repo = SQLAlchemyOutboxRepository(session)
            count = await outbox_repo.reclaim_expired_leases()
            if count > 0:
                logger.info(f"Reclaimed {count} jobs with expired leases")
                # Trigger drain to process reclaimed jobs
                await self._drain_all()

    async def _drain_all(self, batch_size: int = 10) -> int:
        """Drain pending jobs up to batch_size."""
        async with self._drain_lock:
            processed = 0
            while processed < batch_size and self.running:
                result = await self._process_one_job()
                if not result:
                    break  # No more jobs
                processed += 1
            return processed

    async def _process_one_job(self) -> bool:
        """Process one job from the outbox.
        
        Returns:
            True if a job was processed, False if no jobs available.
        """
        async with get_db_session_context() as session:
            outbox_repo = SQLAlchemyOutboxRepository(session)
            item_repo = SQLAlchemyItemRepository(session)

            # Claim next pending job with lease
            job = await outbox_repo.claim_next_pending(
                worker_id=self.worker_id,
                lease_seconds=settings.job_lease_seconds,
            )
            if job is None:
                return False

            logger.info(
                f"Processing job {job.id} for item {job.item_id} "
                f"(attempt {job.attempt_count}, worker={self.worker_id})"
            )

            try:
                # Get item with row lock (system method - no user scoping)
                item = await item_repo.get_by_id_for_update_system(job.item_id)
                if item is None:
                    # Item was deleted, remove job
                    await outbox_repo.mark_completed(job.id)
                    logger.warning(f"Item {job.item_id} not found, removing job")
                    return True

                # Idempotency check: skip if not in ENRICHING state
                if item.status != ItemStatus.ENRICHING:
                    await outbox_repo.mark_completed(job.id)
                    logger.info(f"Item {job.item_id} is {item.status.value}, skipping (idempotent)")
                    return True

                # Perform enrichment with concurrency limit
                async with self._semaphore:
                    result = await self.ai_provider.enrich_item(item.raw_text)

                # Re-check item status under lock before writing results
                item = await item_repo.get_by_id_for_update_system(job.item_id)
                if item is None or item.status != ItemStatus.ENRICHING:
                    await outbox_repo.mark_completed(job.id)
                    logger.info(f"Item {job.item_id} state changed during enrichment, skipping write")
                    return True

                # Update item with enrichment results
                item.mark_enriched(
                    title=result.title,
                    summary=result.summary,
                    suggested_tags=result.suggested_tags,
                    source_type=result.source_type,
                )
                await item_repo.update(item)

                # Mark job completed (delete)
                await outbox_repo.mark_completed(job.id)
                logger.info(f"Enrichment completed for item {job.item_id}")
                return True

            except EnrichmentError as e:
                logger.error(f"Enrichment error for job {job.id}: {e.error_code} - {e.message}")
                await self._handle_failure(
                    job, item_repo, outbox_repo,
                    error_code=e.error_code,
                    error_message=e.message,
                )
                return True
            except Exception as e:
                logger.exception(f"Unexpected error for job {job.id}: {e}")
                await self._handle_failure(
                    job, item_repo, outbox_repo,
                    error_code="ENRICHMENT_ERROR",
                    error_message=str(e)[:200],
                )
                return True

    async def _handle_failure(
        self,
        job: OutboxJob,
        item_repo: SQLAlchemyItemRepository,
        outbox_repo: SQLAlchemyOutboxRepository,
        error_code: str,
        error_message: str,
    ) -> None:
        """Handle enrichment failure with retry logic."""
        if job.attempt_count >= settings.enrichment_max_retries:
            # Max retries reached - mark item as FAILED, job as DEAD
            item = await item_repo.get_by_id_for_update_system(job.item_id)
            if item and item.status == ItemStatus.ENRICHING:
                item.mark_failed()
                await item_repo.update(item)
            await outbox_repo.mark_dead(job.id, error_code, error_message)
            logger.error(
                f"Max retries ({settings.enrichment_max_retries}) reached for item {job.item_id}: "
                f"{error_code} - {error_message}"
            )
        else:
            # Calculate backoff from config
            backoff_list = settings.job_backoff_seconds
            backoff_idx = min(job.attempt_count, len(backoff_list) - 1)
            backoff = backoff_list[backoff_idx] if backoff_list else 0
            
            await outbox_repo.mark_failed(
                job.id,
                error_code=error_code,
                error_message=error_message,
                backoff_seconds=backoff,
            )
            logger.warning(
                f"Job {job.id} will retry in {backoff}s "
                f"(attempt {job.attempt_count}/{settings.enrichment_max_retries})"
            )


# Global worker instance
worker = EnrichmentWorker()
