"""Error response schemas."""

from pydantic import BaseModel


class ErrorDetails(BaseModel):
    """Error details model."""

    field: str | None = None
    constraint: str | None = None
    value: int | str | None = None
    currentState: str | None = None
    attemptedAction: str | None = None
    allowedActions: list[str] | None = None


class ErrorBody(BaseModel):
    """Error body model."""

    code: str
    message: str
    requestId: str
    details: ErrorDetails | dict | None = None


class ErrorResponse(BaseModel):
    """Standard error envelope."""

    error: ErrorBody
