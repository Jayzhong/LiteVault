"""Job notification service for LISTEN/NOTIFY support.

This module provides NOTIFY functionality for job dispatch. NOTIFY is sent
after a job is created to wake up workers immediately.

Note: NOTIFY is best-effort. The worker has fallback polling for reliability.
"""

import logging
from typing import Callable, Awaitable

from app.config import settings

logger = logging.getLogger(__name__)

# Global callback for NOTIFY handling
# Set by the worker when it starts
_notify_callback: Callable[[], Awaitable[None]] | None = None


def set_notify_callback(callback: Callable[[], Awaitable[None]]) -> None:
    """Register a callback to be called when NOTIFY is triggered.
    
    The worker registers its trigger_drain method here.
    """
    global _notify_callback
    _notify_callback = callback
    logger.info("NOTIFY callback registered")


def clear_notify_callback() -> None:
    """Clear the NOTIFY callback (for testing or shutdown)."""
    global _notify_callback
    _notify_callback = None


async def notify_job_created() -> None:
    """Notify that a new job was created.
    
    This triggers the worker to drain pending jobs immediately.
    Falls back to no-op if callback not registered (worker not running).
    """
    if not settings.job_notify_enabled:
        return
        
    if _notify_callback is None:
        # Worker not running in this process, skip notify
        # Worker will pick up via fallback polling
        logger.debug("NOTIFY callback not registered, skipping")
        return
    
    try:
        await _notify_callback()
        logger.debug("NOTIFY callback triggered")
    except Exception as e:
        # Never let NOTIFY failure affect the request
        logger.warning(f"NOTIFY callback failed: {e}")
