"""Stub AI provider for development."""

import hashlib
from dataclasses import dataclass

from app.domain.value_objects import SourceType


@dataclass
class EnrichmentResult:
    """Result of AI enrichment."""

    title: str
    summary: str
    suggested_tags: list[str]
    source_type: SourceType


class StubAIProvider:
    """Stub AI provider that generates deterministic enrichment results."""

    # Predefined tag lists for variety
    TAG_SETS = [
        ["Ideas", "Notes"],
        ["Research", "Learning"],
        ["Work", "Projects"],
        ["Personal", "Ideas"],
        ["Meetings", "Notes"],
        ["Design", "Creative"],
    ]

    async def enrich_item(self, raw_text: str) -> EnrichmentResult:
        """Generate deterministic enrichment from raw text."""
        # Generate deterministic title from first line or first 50 chars
        lines = raw_text.strip().split("\n")
        first_line = lines[0][:50] if lines else raw_text[:50]
        title = first_line.strip()
        if len(title) < len(raw_text):
            title += "..."

        # Generate summary from first 150 chars
        summary = raw_text[:150].strip()
        if len(summary) < len(raw_text):
            summary += "..."

        # Pick tags based on hash of content (deterministic)
        hash_value = int(hashlib.md5(raw_text.encode()).hexdigest()[:8], 16)
        tag_index = hash_value % len(self.TAG_SETS)
        suggested_tags = self.TAG_SETS[tag_index]

        # Detect source type (simple heuristic)
        source_type = SourceType.ARTICLE if "http" in raw_text.lower() else SourceType.NOTE

        return EnrichmentResult(
            title=title,
            summary=summary,
            suggested_tags=suggested_tags,
            source_type=source_type,
        )
