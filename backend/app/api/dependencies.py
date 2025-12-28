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


async def get_user_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SQLAlchemyUserRepository:
    """Get user repository."""
    return SQLAlchemyUserRepository(session)


async def get_item_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SQLAlchemyItemRepository:
    """Get item repository."""
    return SQLAlchemyItemRepository(session)


async def get_idempotency_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SQLAlchemyIdempotencyRepository:
    """Get idempotency repository."""
    return SQLAlchemyIdempotencyRepository(session)


async def get_outbox_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SQLAlchemyOutboxRepository:
    """Get outbox repository."""
    return SQLAlchemyOutboxRepository(session)


async def get_current_user(
    request: Request,
    user_repo: SQLAlchemyUserRepository = Depends(get_user_repository),
) -> User:
    """
    Get current user with auth precedence:
    1. Authorization: Bearer <Clerk JWT> (if AUTH_MODE is clerk or mixed)
    2. X-Dev-User-Id header (if AUTH_MODE is mixed or dev)
    3. 401 Unauthorized
    """
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
