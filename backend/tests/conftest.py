"""Test configuration and fixtures."""

import asyncio
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.main import app
from app.infrastructure.persistence.database import Base, get_db_session
from app.config import settings

# Test database URL (use same as main for integration tests)
TEST_DATABASE_URL = settings.database_url


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session_factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with async_session_factory() as session:
        # Reset AI usage quota to prevent rate limiting across tests
        from sqlalchemy import text
        await session.execute(text("DELETE FROM ai_usage_ledger"))
        await session.commit()
        yield session
    
    # Clean up tables after test
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with database session override."""
    
    async def override_get_db_session() -> AsyncGenerator[AsyncSession, None]:
        yield db_session
    
    app.dependency_overrides[get_db_session] = override_get_db_session
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
def dev_user_headers() -> dict:
    """Headers for dev user authentication."""
    return {"X-Dev-User-Id": "test-user-123"}


@pytest.fixture
def idempotency_key() -> str:
    """Generate an idempotency key."""
    import uuid
    return str(uuid.uuid4())
