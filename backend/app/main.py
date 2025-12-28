"""FastAPI application factory."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.middleware import RequestIdMiddleware
from app.api.error_handlers import register_error_handlers
from app.api.v1.health import router as health_router
from app.api.v1.items import router as items_router
from app.api.v1.auth import router as auth_router
from app.infrastructure.enrichment.worker import worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    await worker.start()
    yield
    # Shutdown
    await worker.stop()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="LiteVault API",
        description="LiteVault Backend API V1",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Add middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestIdMiddleware)

    # Register error handlers
    register_error_handlers(app)

    # Include routers
    app.include_router(health_router)
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(items_router, prefix="/api/v1")

    return app


# Application instance
app = create_app()
