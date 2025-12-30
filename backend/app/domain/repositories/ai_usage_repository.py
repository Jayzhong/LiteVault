"""AI Usage Repository Interface."""

from abc import ABC, abstractmethod
from datetime import date

# Ideally we should define domain entities, but for ledger it's mostly write-only.
# Let's define simple arguments for now or a dataclass.


class AIUsageRepository(ABC):
    """Repository for tracking AI usage and enforcement."""

    @abstractmethod
    async def increment_daily_usage(self, user_id: str, day: date, amount: int = 1) -> int:
        """
        Atomically increment daily usage counter.
        Returns the NEW total count for the day.
        """
        pass

    @abstractmethod
    async def record_ledger_entry(
        self,
        user_id: str,
        action: str,
        resource_id: str,
        cost_units: int = 1
    ) -> bool:
        """
        Record a ledger entry for auditing and idempotency.
        Returns True if recorded, False if already exists (duplicate/idempotent).
        """
        pass

    @abstractmethod
    async def get_daily_usage(self, user_id: str, day: date) -> int:
        """Get current usage count for the day."""
        pass
