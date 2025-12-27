# LiteVault Error Handling Specification

> Standardized error handling for LiteVault API V1
> Defines error envelope, HTTP status mapping, retry policies, and correlation

---

## 1. Standard Error Envelope

All API errors return a consistent JSON structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The rawText field is required.",
    "requestId": "req-550e8400-e29b-41d4-a716-446655440000",
    "details": {
      "field": "rawText",
      "constraint": "required"
    }
  }
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `error.code` | string | ✓ | Machine-readable error code (SCREAMING_SNAKE_CASE) |
| `error.message` | string | ✓ | Human-readable message for developers |
| `error.requestId` | string | ✓ | Unique request identifier for tracing |
| `error.details` | object | ✗ | Additional context (field errors, limits, etc.) |

---

## 2. HTTP Status Code Mapping

### Client Errors (4xx)

| Status | Code(s) | When to Use |
|--------|---------|-------------|
| 400 | `VALIDATION_ERROR`, `INVALID_REQUEST` | Malformed request, missing/invalid fields |
| 401 | `UNAUTHORIZED`, `TOKEN_EXPIRED` | Missing/invalid authentication |
| 403 | `FORBIDDEN`, `INSUFFICIENT_PERMISSIONS` | Authenticated but not authorized |
| 404 | `NOT_FOUND`, `RESOURCE_NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT`, `DUPLICATE_REQUEST`, `TAG_EXISTS`, `INVALID_STATE_TRANSITION` | State conflict or duplicate |
| 422 | `UNPROCESSABLE_ENTITY` | Semantically invalid (valid JSON but business logic fails) |
| 429 | `RATE_LIMITED` | Too many requests |

### Server Errors (5xx)

| Status | Code(s) | When to Use |
|--------|---------|-------------|
| 500 | `INTERNAL_ERROR`, `UNEXPECTED_ERROR` | Unhandled server error |
| 502 | `BAD_GATEWAY` | Upstream service error |
| 503 | `SERVICE_UNAVAILABLE`, `AI_SERVICE_UNAVAILABLE` | Temporary unavailability |
| 504 | `GATEWAY_TIMEOUT` | Upstream timeout |

---

## 3. Error Code Registry

### General Errors
| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INVALID_REQUEST` | 400 | Malformed request body |
| `UNAUTHORIZED` | 401 | Authentication required |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Domain-Specific Errors
| Code | HTTP | Description |
|------|------|-------------|
| `DUPLICATE_REQUEST` | 409 | Idempotency key already used |
| `INVALID_STATE_TRANSITION` | 409 | Cannot perform action in current state |
| `INVALID_STATE` | 400 | Resource is not in expected state |
| `TAG_EXISTS` | 409 | Tag with name already exists |
| `AI_SERVICE_UNAVAILABLE` | 503 | AI/search backend is down |
| `ENRICHMENT_FAILED` | 500 | AI enrichment processing failed |

---

## 4. Frontend Retry Policy

### Retryable Errors (Auto-Retry)

These errors may be automatically retried with exponential backoff:

| Code | Retry Strategy |
|------|----------------|
| `RATE_LIMITED` | Retry after `Retry-After` header value |
| `SERVICE_UNAVAILABLE` | Retry 3 times with 1s, 2s, 4s delays |
| `GATEWAY_TIMEOUT` | Retry 2 times with 2s delay |
| Network errors | Retry 3 times with exponential backoff |

### Non-Retryable Errors (User Action Required)

These errors should NOT be auto-retried:

| Code | UI Behavior |
|------|-------------|
| `VALIDATION_ERROR` | Show inline field errors |
| `UNAUTHORIZED` | Redirect to login |
| `FORBIDDEN` | Show access denied message |
| `NOT_FOUND` | Show "not found" state |
| `DUPLICATE_REQUEST` | Treat as success (idempotent) |
| `TAG_EXISTS` | Show inline error on form field |
| `INVALID_STATE_TRANSITION` | Show toast, refresh state |

---

## 5. UI Error Display Guidelines

### Toast Notifications (High-Level Feedback)

Use for:
- Transient errors that don't block workflow
- Success confirmations after recovery
- Rate limit warnings

```typescript
// Error codes that show toast only
const TOAST_ONLY_ERRORS = [
  'RATE_LIMITED',
  'SERVICE_UNAVAILABLE',
  'GATEWAY_TIMEOUT',
  'INTERNAL_ERROR',
];
```

**Example Toast Messages:**

| Error | Message |
|-------|---------|
| Network error | "Network error. Please check your connection." |
| Rate limited | "Too many requests. Please wait a moment." |
| Server error | "Something went wrong. Please try again." |

### Inline Banner + Retry Button

Use for:
- Errors on data fetching (lists, search results)
- Errors that can be resolved by retrying

```typescript
// Error codes that show inline banner
const INLINE_BANNER_ERRORS = [
  'AI_SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
];
```

**Example:**
```
┌──────────────────────────────────────────────┐
│  ⚠️  Search failed. Please try again.        │
│                                    [Retry]   │
└──────────────────────────────────────────────┘
```

### Inline Field Errors

Use for:
- Validation errors on form fields
- Duplicate/conflict errors

**Example:**
```
Email address
┌──────────────────────────────────────────────┐
│  name@example.com                            │
└──────────────────────────────────────────────┘
  ✗ This email is already registered.
```

---

## 6. Correlation & Tracing

### Request ID Generation

Every request receives a unique `requestId`:
- Format: `req-<uuid-v4>`
- Generated by: API gateway or backend
- Returned in: Response body and `X-Request-Id` header

### Propagation

```
Client Request
    │
    ▼
┌─────────────────────────┐
│   X-Request-Id: req-123 │  ← Header (optional)
│   Response:             │
│   {                     │
│     "error": {          │
│       "requestId": "req-123"
│     }                   │
│   }                     │
└─────────────────────────┘
```

### Frontend Integration

When reporting errors to logging/monitoring:
```typescript
try {
  await api.createItem(data);
} catch (error) {
  logger.error({
    requestId: error.response?.data?.error?.requestId,
    code: error.response?.data?.error?.code,
    message: error.message,
  });
}
```

---

## 7. Error Examples

### Validation Error (400)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "requestId": "req-550e8400-e29b-41d4-a716-446655440000",
    "details": {
      "fields": [
        {
          "field": "rawText",
          "message": "rawText is required",
          "constraint": "required"
        },
        {
          "field": "rawText",
          "message": "rawText must be at most 10000 characters",
          "constraint": "maxLength",
          "value": 10000
        }
      ]
    }
  }
}
```

### Authentication Error (401)
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "requestId": "req-660f9500-f39c-52e5-b827-557766551111"
  }
}
```

### State Transition Error (409)
```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Cannot confirm item in ENRICHING state",
    "requestId": "req-770g0600-g40d-63f6-c938-668877662222",
    "details": {
      "currentState": "ENRICHING",
      "attemptedAction": "confirm",
      "allowedActions": ["cancel"]
    }
  }
}
```

### Rate Limit Error (429)
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Please try again later.",
    "requestId": "req-880h1700-h51e-74g7-d049-779988773333",
    "details": {
      "limit": 10,
      "window": "1 minute",
      "retryAfter": 45
    }
  }
}
```

**Response Headers:**
```
HTTP/1.1 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1703682400
```

### Server Error (500)
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred. Please try again.",
    "requestId": "req-990i2800-i62f-85h8-e150-880099884444"
  }
}
```

> **Note:** Internal server errors should not expose stack traces or internal details in production.

---

## 8. Frontend Error Handler Pattern

```typescript
// Centralized error handler
function handleApiError(error: ApiError): void {
  const { code, message, requestId } = error.response?.data?.error ?? {};

  // Log for debugging
  console.error(`[${requestId}] ${code}: ${message}`);

  switch (code) {
    case 'UNAUTHORIZED':
    case 'TOKEN_EXPIRED':
      // Redirect to login
      router.push('/auth/login');
      break;

    case 'VALIDATION_ERROR':
      // Let form handle field errors
      throw error;

    case 'RATE_LIMITED':
      toast.warning('Too many requests. Please wait a moment.');
      break;

    case 'SERVICE_UNAVAILABLE':
    case 'AI_SERVICE_UNAVAILABLE':
      toast.error('Service temporarily unavailable. Please try again.');
      break;

    case 'INTERNAL_ERROR':
    default:
      toast.error('Something went wrong. Please try again.');
      break;
  }
}
```
