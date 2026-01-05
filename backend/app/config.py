"""Application configuration via pydantic-settings."""

from enum import Enum
from pydantic_settings import BaseSettings, SettingsConfigDict


class AuthMode(str, Enum):
    """Authentication mode."""
    CLERK = "clerk"  # Clerk JWT only
    MIXED = "mixed"  # Clerk JWT preferred, dev fallback allowed
    DEV = "dev"      # Dev fallback only (no Clerk verification)


class LLMProvider(str, Enum):
    """LLM provider selection."""
    STUB = "stub"      # Stub provider for dev/testing (no API calls)
    LITELLM = "litellm"  # LiteLLM + Instructor (real LLM calls)


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = "postgresql+asyncpg://litevault:litevault_dev@localhost:5432/litevault"

    # Environment
    env: str = "development"

    # Authentication
    auth_mode: AuthMode = AuthMode.MIXED
    clerk_jwt_issuer: str | None = None  # e.g., "https://abc-123.clerk.accounts.dev"
    clerk_jwks_url: str | None = None    # e.g., "https://abc-123.clerk.accounts.dev/.well-known/jwks.json"
    clerk_audience: str | None = None    # Optional audience claim validation

    # Enrichment Worker
    enrichment_poll_interval_secs: int = 2  # Legacy: 2s (will raise to 30s with NOTIFY)
    enrichment_max_retries: int = 3

    # Job Dispatch (LISTEN/NOTIFY)
    job_notify_enabled: bool = True  # Enable NOTIFY on job creation
    job_notify_channel: str = "litevault_jobs"  # NOTIFY channel name
    job_poll_interval_secs: int = 30  # Fallback poll interval (when NOTIFY enabled)
    job_lease_seconds: int = 300  # 5 minutes lease
    job_backoff_seconds: list[int] = [0, 30, 300]  # Backoff per attempt: 0s, 30s, 5min
    job_worker_id: str = ""  # Auto-generated if empty

    # LLM Settings
    llm_provider: LLMProvider = LLMProvider.STUB  # stub for dev, litellm for production
    llm_model: str = "openai/gpt-4o-mini"  # LiteLLM model identifier
    llm_fallback_models: str = ""  # Comma-separated fallback models
    llm_temperature: float = 0.3  # Lower for more deterministic output
    llm_max_tokens: int = 1024
    llm_timeout_seconds: int = 30
    llm_max_retries: int = 2  # Instructor retry on validation failure
    llm_concurrency: int = 3  # Max concurrent LLM calls
    llm_system_prompt_path: str = "prompts/enrichment_system.md"  # Path to system prompt

    # Logging
    log_level: str = "INFO"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # Object Storage (S3/MinIO)
    s3_endpoint_url: str = "http://localhost:9000"  # MinIO for local dev
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket_name: str = "litevault-uploads"
    s3_region: str = "us-east-1"
    s3_use_ssl: bool = False  # True for production S3

    # Upload limits
    upload_max_size_bytes: int = 10 * 1024 * 1024  # 10 MB default
    upload_allowed_types: list[str] = [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf", "text/plain", "text/markdown"
    ]
    upload_presigned_url_expiry_seconds: int = 3600  # 1 hour

    @property
    def is_development(self) -> bool:
        return self.env == "development"

    @property
    def requires_clerk_auth(self) -> bool:
        """Check if Clerk auth is required (not dev-only mode)."""
        return self.auth_mode in (AuthMode.CLERK, AuthMode.MIXED)

    @property
    def allows_dev_fallback(self) -> bool:
        """Check if dev auth fallback is allowed. Never in production."""
        if self.env == "production":
            return False
        return self.auth_mode in (AuthMode.MIXED, AuthMode.DEV)

    @property
    def llm_fallback_model_list(self) -> list[str]:
        """Parse fallback models from comma-separated string."""
        if not self.llm_fallback_models:
            return []
        return [m.strip() for m in self.llm_fallback_models.split(",") if m.strip()]

    def validate_production_settings(self) -> None:
        """Validate settings for production environment. Fails fast on misconfiguration."""
        if self.env == "production":
            if self.auth_mode != AuthMode.CLERK:
                raise ValueError(
                    f"SECURITY ERROR: AUTH_MODE must be 'clerk' in production, got '{self.auth_mode.value}'. "
                    "Dev bypass is not allowed in production."
                )
            if not self.clerk_jwt_issuer or not self.clerk_jwks_url:
                raise ValueError(
                    "SECURITY ERROR: CLERK_JWT_ISSUER and CLERK_JWKS_URL must be set in production."
                )


settings = Settings()
settings.validate_production_settings()

