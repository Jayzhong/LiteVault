"""Tests for enrichment providers and schemas."""

import pytest

from app.infrastructure.enrichment.stub_provider import StubAIProvider
from app.infrastructure.enrichment.provider_interface import EnrichmentResult
from app.infrastructure.enrichment.schemas import EnrichmentSchema
from app.domain.value_objects import SourceType


class TestStubProvider:
    """Tests for StubAIProvider."""

    @pytest.mark.asyncio
    async def test_enrich_item_returns_result(self):
        """Test that stub provider returns valid enrichment result."""
        provider = StubAIProvider()
        result = await provider.enrich_item("This is a test note about programming.")
        
        assert isinstance(result, EnrichmentResult)
        assert result.title is not None
        assert result.summary is not None
        assert len(result.suggested_tags) > 0
        assert result.source_type in (SourceType.NOTE, SourceType.ARTICLE)

    @pytest.mark.asyncio
    async def test_enrich_item_deterministic(self):
        """Test that stub provider is deterministic for same input."""
        provider = StubAIProvider()
        text = "Consistent test input for determinism check."
        
        result1 = await provider.enrich_item(text)
        result2 = await provider.enrich_item(text)
        
        assert result1.title == result2.title
        assert result1.summary == result2.summary
        assert result1.suggested_tags == result2.suggested_tags
        assert result1.source_type == result2.source_type

    @pytest.mark.asyncio
    async def test_enrich_item_detects_article(self):
        """Test that URLs are detected as ARTICLE source type."""
        provider = StubAIProvider()
        result = await provider.enrich_item("Check out this link: https://example.com")
        
        assert result.source_type == SourceType.ARTICLE

    @pytest.mark.asyncio
    async def test_enrich_item_detects_note(self):
        """Test that plain text is detected as NOTE source type."""
        provider = StubAIProvider()
        result = await provider.enrich_item("Just some personal thoughts and ideas.")
        
        assert result.source_type == SourceType.NOTE


class TestEnrichmentSchema:
    """Tests for Instructor schema validation."""

    def test_schema_valid_input(self):
        """Test schema accepts valid input."""
        schema = EnrichmentSchema(
            title="Test Title",
            summary="This is a test summary.",
            tags=["test", "example"],
            source_type="NOTE",
        )
        
        assert schema.title == "Test Title"
        assert schema.summary == "This is a test summary."
        assert schema.tags == ["test", "example"]
        assert schema.source_type == "NOTE"

    def test_schema_normalizes_tags(self):
        """Test that tags are normalized to lowercase."""
        schema = EnrichmentSchema(
            title="Test",
            summary="Summary",
            tags=["TEST", "Example", "  SPACES  "],
            source_type="NOTE",
        )
        
        assert schema.tags == ["test", "example", "spaces"]

    def test_schema_deduplicates_tags(self):
        """Test that duplicate tags are removed."""
        schema = EnrichmentSchema(
            title="Test",
            summary="Summary",
            tags=["test", "TEST", "Test"],
            source_type="NOTE",
        )
        
        assert schema.tags == ["test"]

    def test_schema_rejects_too_many_tags(self):
        """Test that too many tags are rejected by Pydantic validation."""
        with pytest.raises(ValueError):
            EnrichmentSchema(
                title="Test",
                summary="Summary",
                tags=["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10"],
                source_type="NOTE",
            )

    def test_schema_cleans_title(self):
        """Test that title whitespace is cleaned."""
        schema = EnrichmentSchema(
            title="  Test Title  ",
            summary="Summary",
            tags=["test"],
            source_type="NOTE",
        )
        
        assert schema.title == "Test Title"

    def test_schema_defaults_source_type(self):
        """Test that unknown source type defaults to NOTE."""
        schema = EnrichmentSchema(
            title="Test",
            summary="Summary",
            tags=["test"],
            source_type="UNKNOWN",
        )
        
        assert schema.source_type == "NOTE"

    def test_schema_rejects_empty_title(self):
        """Test that empty title is rejected."""
        with pytest.raises(ValueError):
            EnrichmentSchema(
                title="   ",
                summary="Summary",
                tags=["test"],
                source_type="NOTE",
            )

    def test_schema_rejects_empty_tags(self):
        """Test that empty tags list is rejected."""
        with pytest.raises(ValueError):
            EnrichmentSchema(
                title="Test",
                summary="Summary",
                tags=[],
                source_type="NOTE",
            )
