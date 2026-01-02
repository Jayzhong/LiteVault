"""Tests for PromptLoader."""

import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from app.infrastructure.enrichment.prompt_loader import PromptLoader


class TestPromptLoader:
    """Tests for PromptLoader functionality."""
    
    def setup_method(self):
        """Reset loader state before each test."""
        PromptLoader.reset()
    
    def test_load_caches_prompt_from_file(self, tmp_path: Path):
        """Test that load() reads and caches prompt from file."""
        # Create temp prompt file
        prompt_file = tmp_path / "test_prompt.md"
        prompt_content = "Test system prompt content"
        prompt_file.write_text(prompt_content)
        
        # Mock settings to point to temp file
        with patch("app.infrastructure.enrichment.prompt_loader.settings") as mock_settings:
            mock_settings.llm_system_prompt_path = str(prompt_file)
            mock_settings.env = "development"
            
            PromptLoader.load()
            
            result = PromptLoader.get_enrichment_prompt()
            assert result == prompt_content
    
    def test_load_is_idempotent(self, tmp_path: Path):
        """Test that multiple load() calls don't re-read file."""
        prompt_file = tmp_path / "test_prompt.md"
        prompt_file.write_text("Original content")
        
        with patch("app.infrastructure.enrichment.prompt_loader.settings") as mock_settings:
            mock_settings.llm_system_prompt_path = str(prompt_file)
            mock_settings.env = "development"
            
            PromptLoader.load()
            
            # Modify file
            prompt_file.write_text("Modified content")
            
            # Load again - should not re-read
            PromptLoader.load()
            
            result = PromptLoader.get_enrichment_prompt()
            assert result == "Original content"
    
    def test_load_fails_if_file_missing_in_production(self, tmp_path: Path):
        """Test that missing prompt file fails fast in production."""
        with patch("app.infrastructure.enrichment.prompt_loader.settings") as mock_settings:
            mock_settings.llm_system_prompt_path = str(tmp_path / "nonexistent.md")
            mock_settings.env = "production"
            
            with pytest.raises(RuntimeError, match="System prompt file not found"):
                PromptLoader.load()
    
    def test_load_uses_fallback_in_dev_if_missing(self, tmp_path: Path):
        """Test that missing prompt uses fallback in development."""
        with patch("app.infrastructure.enrichment.prompt_loader.settings") as mock_settings:
            mock_settings.llm_system_prompt_path = str(tmp_path / "nonexistent.md")
            mock_settings.env = "development"
            
            PromptLoader.load()
            
            result = PromptLoader.get_enrichment_prompt()
            assert "LiteVault" in result  # Fallback contains app name
    
    def test_load_fails_if_file_empty_in_production(self, tmp_path: Path):
        """Test that empty prompt file fails fast in production."""
        prompt_file = tmp_path / "empty_prompt.md"
        prompt_file.write_text("")
        
        with patch("app.infrastructure.enrichment.prompt_loader.settings") as mock_settings:
            mock_settings.llm_system_prompt_path = str(prompt_file)
            mock_settings.env = "production"
            
            with pytest.raises(RuntimeError, match="System prompt file is empty"):
                PromptLoader.load()
    
    def test_get_prompt_fails_if_not_loaded(self):
        """Test that get_enrichment_prompt fails if load() not called."""
        with pytest.raises(RuntimeError, match="load.*must be called"):
            PromptLoader.get_enrichment_prompt()
