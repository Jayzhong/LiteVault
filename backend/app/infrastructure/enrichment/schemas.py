"""Pydantic schemas for LLM structured output via Instructor."""

from pydantic import BaseModel, Field, field_validator


class EnrichmentSchema(BaseModel):
    """Instructor schema for LLM enrichment output.
    
    This schema is used with Instructor to validate and parse LLM responses.
    """
    
    title: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="A concise, descriptive title for the content (max 100 chars)"
    )
    
    summary: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="A concise summary of the key points (max 500 chars)"
    )
    
    tags: list[str] = Field(
        ...,
        min_length=1,
        max_length=3,
        description="1-3 relevant tags for categorization"
    )
    
    source_type: str = Field(
        ...,
        description="Content type: 'NOTE' for personal notes, 'ARTICLE' for web content or articles"
    )
    
    @field_validator("title")
    @classmethod
    def clean_title(cls, v: str) -> str:
        """Clean and validate title."""
        v = v.strip()
        if not v:
            raise ValueError("Title cannot be empty")
        return v
    
    @field_validator("summary")
    @classmethod
    def clean_summary(cls, v: str) -> str:
        """Clean and validate summary."""
        v = v.strip()
        if not v:
            raise ValueError("Summary cannot be empty")
        return v
    
    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, v: list[str]) -> list[str]:
        """Normalize tags: lowercase, strip, deduplicate."""
        normalized = []
        seen = set()
        for tag in v:
            tag = tag.strip().lower()
            if tag and tag not in seen and len(tag) <= 50:
                normalized.append(tag)
                seen.add(tag)
        if not normalized:
            raise ValueError("At least one valid tag is required")
        return normalized[:3]  # Max 3 tags
    
    @field_validator("source_type")
    @classmethod
    def validate_source_type(cls, v: str) -> str:
        """Validate source type."""
        v = v.upper().strip()
        if v not in ("NOTE", "ARTICLE"):
            # Default to NOTE for unknown types
            return "NOTE"
        return v
