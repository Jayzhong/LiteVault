"""Centralized prompt templates for LLM enrichment."""


ENRICHMENT_SYSTEM_PROMPT = """You are an AI assistant that processes user-submitted text content for a personal knowledge management app called LiteVault.

Your task is to analyze the provided text and generate:
1. **Title**: A concise, descriptive title (max 100 characters)
2. **Summary**: A brief summary of key points (max 500 characters)
3. **Tags**: 3-5 relevant tags for categorization (lowercase, single words or short phrases)
4. **Source Type**: Either "NOTE" (personal notes, ideas, thoughts) or "ARTICLE" (web content, articles, external sources)

Guidelines:
- Title should capture the essence of the content
- Summary should highlight the most important points without being verbose
- Tags should be relevant keywords that would help find this content later
- Determine source type based on content style (URLs suggest ARTICLE, personal writing suggests NOTE)

Always respond with valid JSON matching the required schema."""


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
    
    return f"""Please analyze the following content and generate a title, summary, tags, and determine the source type.

---
{truncated_text}
---

Respond with JSON containing: title, summary, tags (array), and source_type."""
