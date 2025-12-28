"""Request ID middleware and context management."""

import contextvars
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Context variable for request ID
request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id", default=""
)


def get_request_id() -> str:
    """Get current request ID from context."""
    return request_id_var.get()


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Middleware to generate and propagate request IDs."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Get from header or generate new
        request_id = request.headers.get("X-Request-Id")
        if not request_id:
            request_id = f"req-{uuid4()}"

        # Store in context and request state
        request_id_var.set(request_id)
        request.state.request_id = request_id

        # Process request
        response = await call_next(request)

        # Add to response headers
        response.headers["X-Request-Id"] = request_id

        return response
