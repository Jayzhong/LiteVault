"""Centralized prompt templates for LLM enrichment."""

from app.infrastructure.enrichment.prompt_loader import PromptLoader


def get_system_prompt() -> str:
    """Get the enrichment system prompt from loader.
    
    Returns:
        The cached system prompt string.
    """
    return PromptLoader.get_enrichment_prompt()


def build_enrichment_user_prompt(raw_text: str) -> str:
    """Build the user prompt for enrichment.
    
    Args:
        raw_text: The original user content to enrich.
        
    Returns:
        Formatted user prompt string.
    """
    # Truncate very long text to avoid token limits
    max_length = 8000  # Leave room for system prompt and response
    if len(raw_text) > max_length:
        truncated_text = raw_text[:max_length] + "\n\n[Content truncated...]"
    else:
        truncated_text = raw_text
    
    return f"""Analyze this content. Generate title, summary, tags (max 3), and source_type.
Output in the SAME LANGUAGE as the input text.

---
{truncated_text}
---

Respond with JSON: {{"title": "...", "summary": "...", "tags": [...], "source_type": "NOTE|ARTICLE"}}"""
