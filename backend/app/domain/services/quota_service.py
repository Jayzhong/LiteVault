"""Quota Service."""

from app.domain.value_objects import UserPlan
from app.config import settings


class QuotaService:
    """Service for determining user quotas."""

    # Daily Enrichment Limits
    DAILY_LIMIT_FREE = 2
    DAILY_LIMIT_PRO = 10
    DAILY_LIMIT_DEV = 10000  # Unlimited for dev/test

    # Concurrency Limits
    CONCURRENCY_FREE = 1
    CONCURRENCY_PRO = 3
    CONCURRENCY_DEV = 100  # Unlimited for dev/test

    @staticmethod
    def get_daily_limit(plan: UserPlan) -> int:
        """Get daily enrichment limit for plan."""
        if settings.is_development:
            return QuotaService.DAILY_LIMIT_DEV
        if plan == UserPlan.PRO:
            return QuotaService.DAILY_LIMIT_PRO
        return QuotaService.DAILY_LIMIT_FREE

    @staticmethod
    def get_concurrency_limit(plan: UserPlan) -> int:
        """Get concurrency limit for plan."""
        if settings.is_development:
            return QuotaService.CONCURRENCY_DEV
        if plan == UserPlan.PRO:
            return QuotaService.CONCURRENCY_PRO
        return QuotaService.CONCURRENCY_FREE
