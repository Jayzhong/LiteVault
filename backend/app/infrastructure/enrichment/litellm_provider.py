"""LiteLLM + Instructor enrichment provider implementation."""

import asyncio
import logging
from typing import Any

import instructor
import litellm
from pydantic import ValidationError

from app.config import settings
from app.domain.value_objects import SourceType
from app.infrastructure.enrichment.provider_interface import (
    EnrichmentProvider,
    EnrichmentResult,
    EnrichmentError,
)
from app.infrastructure.enrichment.schemas import EnrichmentSchema
from app.infrastructure.enrichment.prompts import (
    ENRICHMENT_SYSTEM_PROMPT,
    build_enrichment_user_prompt,
)


logger = logging.getLogger(__name__)


class LiteLLMProvider(EnrichmentProvider):
    """LiteLLM + Instructor provider for real LLM enrichment.
    
    Uses LiteLLM for model-agnostic API calls and Instructor for
    structured output validation.
    """

    def __init__(self):
        """Initialize the LiteLLM provider."""
        # Patch litellm with instructor for structured outputs
        self.client = instructor.from_litellm(litellm.acompletion)
        
        # Configure litellm
        litellm.set_verbose = False  # Reduce logging noise
        
    async def enrich_item(self, raw_text: str) -> EnrichmentResult:
        """Enrich raw text using LLM.
        
        Args:
            raw_text: The original user input text.
            
        Returns:
            EnrichmentResult with AI-generated fields.
            
        Raises:
            EnrichmentError: On LLM call failure.
        """
        try:
            # Build messages
            messages = [
                {"role": "system", "content": ENRICHMENT_SYSTEM_PROMPT},
                {"role": "user", "content": build_enrichment_user_prompt(raw_text)},
            ]
            
            # Make async LLM call with Instructor schema validation
            response: EnrichmentSchema = await asyncio.wait_for(
                self._call_llm(messages),
                timeout=settings.llm_timeout_seconds,
            )
            
            # Convert to EnrichmentResult
            source_type = SourceType.ARTICLE if response.source_type == "ARTICLE" else SourceType.NOTE
            
            return EnrichmentResult(
                title=response.title,
                summary=response.summary,
                suggested_tags=response.tags,
                source_type=source_type,
            )
            
        except asyncio.TimeoutError:
            logger.error(f"LLM call timed out after {settings.llm_timeout_seconds}s")
            raise EnrichmentError(
                "LLM request timed out",
                error_code="LLM_TIMEOUT"
            )
        except ValidationError as e:
            logger.error(f"LLM validation failed: {e}")
            raise EnrichmentError(
                "LLM output validation failed",
                error_code="LLM_VALIDATION_ERROR"
            )
        except litellm.exceptions.APIError as e:
            logger.error(f"LLM API error: {e}")
            raise EnrichmentError(
                self._sanitize_error(str(e)),
                error_code="LLM_API_ERROR"
            )
        except Exception as e:
            logger.exception(f"Unexpected LLM error: {e}")
            raise EnrichmentError(
                self._sanitize_error(str(e)),
                error_code="LLM_ERROR"
            )
    
    async def _call_llm(self, messages: list[dict[str, Any]]) -> EnrichmentSchema:
        """Make the actual LLM call with Instructor.
        
        Args:
            messages: Chat messages for LLM.
            
        Returns:
            Validated EnrichmentSchema from LLM response.
        """
        # Use instructor's create method with response_model
        response = await self.client.create(
            model=settings.llm_model,
            messages=messages,
            response_model=EnrichmentSchema,
            max_retries=settings.llm_max_retries,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
        )
        
        return response
    
    def _sanitize_error(self, error_message: str) -> str:
        """Sanitize error message to remove sensitive info.
        
        Args:
            error_message: Raw error message.
            
        Returns:
            Sanitized error safe for storage.
        """
        # Remove potential API keys
        sanitized = error_message
        for keyword in ["api_key", "api-key", "apikey", "sk-", "key=", "token="]:
            if keyword.lower() in sanitized.lower():
                # Replace the entire message if it might contain a key
                return "LLM API error (details redacted for security)"
        
        # Truncate long messages
        if len(sanitized) > 200:
            sanitized = sanitized[:200] + "..."
        
        return sanitized

