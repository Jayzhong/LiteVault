"""Tag domain entity."""

from dataclasses import dataclass
from datetime import datetime


@dataclass
class Tag:
    """Tag entity for categorizing items."""
    
    id: str
    user_id: str
    name: str
    name_lower: str
    usage_count: int = 0
    last_used: datetime | None = None
    created_at: datetime | None = None
    color: str = "gray"  # Default color ID
