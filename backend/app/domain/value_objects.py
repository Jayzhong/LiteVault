"""Domain value objects."""

from enum import Enum


class ItemStatus(str, Enum):
    """Item lifecycle status."""

    ENRICHING = "ENRICHING"
    READY_TO_CONFIRM = "READY_TO_CONFIRM"
    ARCHIVED = "ARCHIVED"
    DISCARDED = "DISCARDED"
    FAILED = "FAILED"


class SourceType(str, Enum):
    """Source type for items."""

    NOTE = "NOTE"
    ARTICLE = "ARTICLE"


class UserPlan(str, Enum):
    """User subscription plan."""

    FREE = "free"
    PRO = "pro"
