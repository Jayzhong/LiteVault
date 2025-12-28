"""Enrichment provider interface and result schema."""

from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.domain.value_objects import SourceType


@dataclass
class EnrichmentResult:
    """Result of AI enrichment."""

    title: str
    summary: str
    suggested_tags: list[str]
    source_type: SourceType


class EnrichmentProvider(ABC):
    """Abstract base class for enrichment providers."""

    @abstractmethod
    async def enrich_item(self, raw_text: str) -> EnrichmentResult:
        """Generate enrichment for raw text.
        
        Args:
            raw_text: The original user input text.
            
        Returns:
            EnrichmentResult with title, summary, tags, and source type.
            
        Raises:
            EnrichmentError: If enrichment fails.
        """
        pass


class EnrichmentError(Exception):
    """Base exception for enrichment failures."""
    
    def __init__(self, message: str, error_code: str = "LLM_ERROR"):
        super().__init__(message)
        self.error_code = error_code
        self.message = message
