"""API dependencies for dependency injection."""

from typing import Annotated

from fastapi import Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings, AuthMode
from app.infrastructure.persistence.database import get_db_session
from app.infrastructure.persistence.repositories.user_repository_impl import (
    SQLAlchemyUserRepository,
)
from app.infrastructure.persistence.repositories.item_repository_impl import (
    SQLAlchemyItemRepository,
)
from app.infrastructure.persistence.repositories.idempotency_repository_impl import (
    SQLAlchemyIdempotencyRepository,
)
from app.infrastructure.persistence.repositories.outbox_repository_impl import (
    SQLAlchemyOutboxRepository,
)
from app.infrastructure.auth.clerk import (
    ClerkJWTVerifier,
    ClerkJWTVerificationError,
    get_clerk_verifier,
)
from app.domain.entities.user import User
from app.domain.exceptions import UnauthorizedException


# Session dependency type alias
DbSession = Annotated[AsyncSession, Depends(get_db_session)]


def get_user_repository(session: DbSession) -> SQLAlchemyUserRepository:
    """Get user repository with shared session."""
    return SQLAlchemyUserRepository(session)


def get_item_repository(session: DbSession) -> SQLAlchemyItemRepository:
    """Get item repository with shared session."""
    return SQLAlchemyItemRepository(session)


def get_idempotency_repository(session: DbSession) -> SQLAlchemyIdempotencyRepository:
    """Get idempotency repository with shared session."""
    return SQLAlchemyIdempotencyRepository(session)


def get_outbox_repository(session: DbSession) -> SQLAlchemyOutboxRepository:
    """Get outbox repository with shared session."""
    return SQLAlchemyOutboxRepository(session)


def get_tag_repository(session: DbSession):
    """Get tag repository with shared session."""
    from app.infrastructure.persistence.repositories.tag_repository_impl import (
        SQLAlchemyTagRepository,
    )
    return SQLAlchemyTagRepository(session)


def get_item_tag_repository(session: DbSession):
    """Get item_tag repository with shared session."""
    from app.infrastructure.persistence.repositories.item_tag_repository_impl import (
        SQLAlchemyItemTagRepository,
    )
    return SQLAlchemyItemTagRepository(session)


def get_item_tag_suggestion_repository(session: DbSession):
    """Get item_tag_suggestion repository with shared session."""
    from app.infrastructure.persistence.repositories.item_tag_suggestion_repository_impl import (
        SQLAlchemyItemTagSuggestionRepository,
    )
    return SQLAlchemyItemTagSuggestionRepository(session)


async def get_current_user(
    request: Request,
    session: DbSession,
) -> User:
    """
    Get current user with auth precedence:
    1. Authorization: Bearer <Clerk JWT> (if AUTH_MODE is clerk or mixed)
    2. X-Dev-User-Id header (if AUTH_MODE is mixed or dev)
    3. 401 Unauthorized
    """
    user_repo = SQLAlchemyUserRepository(session)
    
    # 1. Try Clerk JWT from Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        if not settings.requires_clerk_auth:
            # Clerk auth disabled, skip JWT verification
            pass
        else:
            token = auth_header[7:]
            try:
                verifier = get_clerk_verifier(settings)
                principal = verifier.verify_token(token)
                return await user_repo.get_or_create_from_clerk(principal)
            except ClerkJWTVerificationError as e:
                raise UnauthorizedException(f"Invalid authentication token: {e}")
    
    # 2. Try dev fallback (X-Dev-User-Id)
    if settings.allows_dev_fallback:
        dev_user_id = request.headers.get("X-Dev-User-Id")
        if dev_user_id:
            return await user_repo.get_or_create_dev_user(dev_user_id)
    
    # 3. No valid auth
    if settings.auth_mode == AuthMode.DEV:
        raise UnauthorizedException("Missing X-Dev-User-Id header")
    else:
        raise UnauthorizedException("Missing or invalid authentication")
