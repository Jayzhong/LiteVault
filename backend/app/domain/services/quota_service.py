"""Quota Service."""

from app.domain.value_objects import UserPlan


class QuotaService:
    """Service for determining user quotas."""

    # Daily Enrichment Limits
    DAILY_LIMIT_FREE = 2
    DAILY_LIMIT_PRO = 10

    # Concurrency Limits
    CONCURRENCY_FREE = 1
    CONCURRENCY_PRO = 3

    @staticmethod
    def get_daily_limit(plan: UserPlan) -> int:
        """Get daily enrichment limit for plan."""
        if plan == UserPlan.PRO:
            return QuotaService.DAILY_LIMIT_PRO
        return QuotaService.DAILY_LIMIT_FREE

    @staticmethod
    def get_concurrency_limit(plan: UserPlan) -> int:
        """Get concurrency limit for plan."""
        if plan == UserPlan.PRO:
            return QuotaService.CONCURRENCY_PRO
        return QuotaService.CONCURRENCY_FREE
