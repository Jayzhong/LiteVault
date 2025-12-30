"""Domain exceptions.

All exceptions map to the error code registry in docs/architecture/error_handling.md.
"""


class DomainException(Exception):
    """Base domain exception."""

    code: str = "INTERNAL_ERROR"
    http_status: int = 500
    details: dict | None = None

    def __init__(self, message: str, details: dict | None = None):
        super().__init__(message)
        self.message = message
        if details:
            self.details = details


# Validation Errors (400)
class ValidationException(DomainException):
    """Request validation failed."""

    code = "VALIDATION_ERROR"
    http_status = 400


class InvalidCursorException(DomainException):
    """Invalid pagination cursor."""

    code = "INVALID_CURSOR"
    http_status = 400


class InvalidStateException(DomainException):
    """Resource is not in expected state."""

    code = "INVALID_STATE"
    http_status = 400


# Auth Errors (401, 403)
class UnauthorizedException(DomainException):
    """Authentication required."""

    code = "UNAUTHORIZED"
    http_status = 401


class ForbiddenException(DomainException):
    """Access denied."""

    code = "FORBIDDEN"
    http_status = 403


# Not Found (404)
class ItemNotFoundException(DomainException):
    """Item does not exist."""

    code = "NOT_FOUND"
    http_status = 404


class TagNotFoundException(DomainException):
    """Tag does not exist."""

    code = "NOT_FOUND"
    http_status = 404


class UserNotFoundException(DomainException):
    """User does not exist."""

    code = "NOT_FOUND"
    http_status = 404


# Conflict (409)
class DuplicateRequestException(DomainException):
    """Idempotency key already used."""

    code = "DUPLICATE_REQUEST"
    http_status = 409


class InvalidStateTransitionException(DomainException):
    """Cannot perform action in current state."""

    code = "INVALID_STATE_TRANSITION"
    http_status = 409


class TagExistsException(DomainException):
    """Tag with name already exists."""

    code = "TAG_EXISTS"
    http_status = 409


# Rate Limit (429)
class RateLimitException(DomainException):
    """Rate limit exceeded."""

    code = "RATE_LIMITED"
    http_status = 429


class QuotaExceededException(DomainException):
    """Daily AI quota exceeded."""

    code = "DAILY_QUOTA_EXCEEDED"
    http_status = 429


class ConcurrencyLimitExceededException(DomainException):
    """Concurrent AI job limit exceeded."""

    code = "CONCURRENCY_LIMIT_EXCEEDED"
    http_status = 429



# Service Errors (503)
class AIServiceUnavailableException(DomainException):
    """AI/search backend is down."""

    code = "AI_SERVICE_UNAVAILABLE"
    http_status = 503
