"""Error handlers for domain exceptions."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.domain.exceptions import DomainException
from app.api.middleware import get_request_id


def register_error_handlers(app: FastAPI) -> None:
    """Register exception handlers on the FastAPI app."""

    @app.exception_handler(DomainException)
    async def domain_exception_handler(
        request: Request, exc: DomainException
    ) -> JSONResponse:
        """Handle domain exceptions with standard error envelope."""
        request_id = getattr(request.state, "request_id", get_request_id())
        return JSONResponse(
            status_code=exc.http_status,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "requestId": request_id,
                    "details": exc.details,
                }
            },
            headers={"X-Request-Id": request_id},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Handle Pydantic validation errors with standard error envelope."""
        request_id = getattr(request.state, "request_id", get_request_id())
        
        # Extract first error message for user-friendly message
        errors = exc.errors()
        
        # Serialize errors to be JSON-safe (remove non-serializable ctx values)
        serializable_errors = []
        for error in errors:
            safe_error = {
                "type": error.get("type"),
                "loc": error.get("loc"),
                "msg": error.get("msg"),
                "input": error.get("input"),
            }
            serializable_errors.append(safe_error)
        
        if errors:
            first_error = errors[0]
            field = ".".join(str(loc) for loc in first_error.get("loc", [])[1:])
            message = first_error.get("msg", "Validation failed")
            if field:
                message = f"{field}: {message}"
        else:
            message = "Validation failed"

        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": message,
                    "requestId": request_id,
                    "details": {"errors": serializable_errors},
                }
            },
            headers={"X-Request-Id": request_id},
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """Handle unexpected exceptions."""
        request_id = getattr(request.state, "request_id", get_request_id())
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred",
                    "requestId": request_id,
                    "details": None,
                }
            },
            headers={"X-Request-Id": request_id},
        )
