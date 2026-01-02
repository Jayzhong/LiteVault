"""Health check endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.persistence.database import get_db_session

router = APIRouter()


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint (always returns ok if app is running)."""
    return {"status": "ok"}


@router.get("/readyz")
async def readiness_check(
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    """Readiness check endpoint (returns ok only if DB is reachable)."""
    try:
        await session.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "error", "db": "disconnected", "detail": str(e)}
