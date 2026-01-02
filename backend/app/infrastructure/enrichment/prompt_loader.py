"""Prompt loader for externalized system prompts.

Loads prompt files at startup, caches in memory, and provides
access to prompts without repeated disk I/O.
"""

import logging
from pathlib import Path
from typing import ClassVar

from app.config import settings


logger = logging.getLogger(__name__)


class PromptLoader:
    """Loads and caches system prompts from files.
    
    Prompts are loaded once at application startup and cached in memory.
    In production, missing or empty prompts cause fail-fast errors.
    """
    
    _cache: ClassVar[dict[str, str]] = {}
    _loaded: ClassVar[bool] = False
    
    @classmethod
    def load(cls) -> None:
        """Load all prompts at startup.
        
        Must be called once during application startup.
        Fails fast if required prompts are missing in production.
        
        Raises:
            RuntimeError: If prompt file is missing or empty in production.
        """
        if cls._loaded:
            logger.debug("PromptLoader already loaded, skipping")
            return
        
        cls._load_enrichment_prompt()
        cls._loaded = True
        logger.info("PromptLoader initialized successfully")
    
    @classmethod
    def _load_enrichment_prompt(cls) -> None:
        """Load the enrichment system prompt."""
        prompt_path = settings.llm_system_prompt_path
        
        # Resolve path relative to working directory (backend root)
        path = Path(prompt_path)
        if not path.is_absolute():
            # In Docker: /app is WORKDIR, prompts/ is at /app/prompts
            # Locally: backend/ is CWD, prompts/ is at backend/prompts
            # Use CWD which works for both cases
            path = Path.cwd() / prompt_path
        
        if not path.exists():
            error_msg = f"System prompt file not found: {path}"
            if settings.env == "production":
                raise RuntimeError(error_msg)
            else:
                logger.warning(f"{error_msg} - using fallback in dev mode")
                cls._cache["enrichment"] = cls._get_fallback_prompt()
                return
        
        content = path.read_text(encoding="utf-8").strip()
        
        if not content:
            error_msg = f"System prompt file is empty: {path}"
            if settings.env == "production":
                raise RuntimeError(error_msg)
            else:
                logger.warning(f"{error_msg} - using fallback in dev mode")
                cls._cache["enrichment"] = cls._get_fallback_prompt()
                return
        
        cls._cache["enrichment"] = content
        logger.info(f"Loaded enrichment prompt from {path} ({len(content)} chars)")
    
    @classmethod
    def get_enrichment_prompt(cls) -> str:
        """Get the cached enrichment system prompt.
        
        Returns:
            The system prompt string.
            
        Raises:
            RuntimeError: If load() has not been called.
        """
        if not cls._loaded:
            raise RuntimeError(
                "PromptLoader.load() must be called before get_enrichment_prompt()"
            )
        return cls._cache["enrichment"]
    
    @classmethod
    def _get_fallback_prompt(cls) -> str:
        """Fallback prompt for development when file is missing."""
        return """You are an AI assistant for LiteVault.

Analyze text and generate:
1. Title (max 100 chars)
2. Summary (max 500 chars, faithful to source)
3. Tags (1-3 keywords, lowercase)
4. Source Type: NOTE or ARTICLE

Rules:
- Output in the same language as input
- Maximum 3 tags
- No hallucinated facts

Respond with valid JSON."""
    
    @classmethod
    def reset(cls) -> None:
        """Reset the loader state. For testing only."""
        cls._cache.clear()
        cls._loaded = False
