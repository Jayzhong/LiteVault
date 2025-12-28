"""Application configuration via pydantic-settings."""

from enum import Enum
from pydantic_settings import BaseSettings, SettingsConfigDict


class AuthMode(str, Enum):
    """Authentication mode."""
    CLERK = "clerk"  # Clerk JWT only
    MIXED = "mixed"  # Clerk JWT preferred, dev fallback allowed
    DEV = "dev"      # Dev fallback only (no Clerk verification)


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
    enrichment_poll_interval_secs: int = 2
    enrichment_max_retries: int = 3

    # Logging
    log_level: str = "INFO"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    @property
    def is_development(self) -> bool:
        return self.env == "development"

    @property
    def requires_clerk_auth(self) -> bool:
        """Check if Clerk auth is required (not dev-only mode)."""
        return self.auth_mode in (AuthMode.CLERK, AuthMode.MIXED)

    @property
    def allows_dev_fallback(self) -> bool:
        """Check if dev auth fallback is allowed."""
        return self.auth_mode in (AuthMode.MIXED, AuthMode.DEV)


settings = Settings()
