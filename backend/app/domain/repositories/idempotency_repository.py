"""Idempotency repository interface."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class IdempotencyRecord:
    """Idempotency key record."""

    id: str
    user_id: str
    idempotency_key: str
    response_item_id: str | None
    created_at: datetime
    expires_at: datetime


class IdempotencyRepository(ABC):
    """Abstract repository for idempotency keys."""

    @abstractmethod
    async def get(self, user_id: str, key: str) -> IdempotencyRecord | None:
        """Get idempotency record by user and key."""
        ...

    @abstractmethod
    async def create(
        self,
        user_id: str,
        key: str,
        response_item_id: str,
        ttl_hours: int = 24,
    ) -> IdempotencyRecord:
        """Create idempotency record."""
        ...
