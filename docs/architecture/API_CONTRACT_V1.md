# LiteVault API Contract V1

> Frontend-Backend contract for LiteVault Web V1
> Generated from frontend implementation analysis

---

## 1. Overview

### Purpose
This document defines the REST API contract between the LiteVault frontend and backend. All endpoints are designed to support the current UI behaviors implemented in the frontend.

### Scope
- V1 MVP endpoints only
- Supports: Items, Library, Search, Tags, Auth
- Single-user context (multi-tenancy out of scope)

### Base URL
```
Development: http://localhost:8080/api/v1
Production:  https://api.litevault.app/api/v1
```

---

## 2. Authentication Strategy

### Development Mode (Phase 0-2)
For local development, use a simple header-based approach:
```
X-Dev-User-Id: user-123
```
Backend should create a mock user session when this header is present.

### Production Path (Future)
- JWT tokens in `Authorization: Bearer <token>` header
- Refresh token rotation via HTTP-only cookies
- OAuth 2.0 support for Google/GitHub providers

### Auth Endpoints (V1)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /auth/signup` | TBD | Email/password registration |
| `POST /auth/login` | TBD | Email/password login |
| `POST /auth/logout` | TBD | Invalidate session |
| `GET /auth/me` | TBD | Get current user |

> **Note**: Auth UI exists in frontend but endpoints are mocked. Backend should implement these before production.

---

## 3. API Endpoint Summary

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `POST` | `/items` | Create new item (triggers enrichment) | ✓ |
| `GET` | `/items/pending` | List pending items | ✓ |
| `GET` | `/items/:id` | Get single item | ✓ |
| `PATCH` | `/items/:id` | Update item (edit/confirm/discard) | ✓ |
| `POST` | `/items/:id/retry` | Retry failed enrichment | ✓ |
| `GET` | `/library` | List archived items (timeline) | ✓ |
| `POST` | `/search` | Query vault, get answer + evidence | ✓ |
| `GET` | `/tags` | List all tags | ✓ |
| `POST` | `/tags` | Create new tag | ✓ |
| `PATCH` | `/tags/:id` | Rename tag | ✓ |
| `DELETE` | `/tags/:id` | Delete tag | ✓ |
| `POST` | `/tags/merge` | Merge tags | ✓ |

---

## 4. Data Conventions

### IDs
- Format: UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- Generated server-side

### Timestamps
- Format: ISO-8601 UTC (e.g., `2025-12-27T13:00:00.000Z`)
- Fields: `createdAt`, `updatedAt`, `confirmedAt`

### Sorting
- Default: descending by `createdAt`
- Library: descending by `confirmedAt`

### Tag Normalization
- Trim whitespace
- Case-preserving storage, case-insensitive matching
- Max length: 50 characters
- Allowed characters: alphanumeric, spaces, hyphens, underscores

### Pagination
```json
{
  "cursor": "string | null",
  "limit": 20,
  "hasMore": true
}
```
- Cursor-based pagination for Library and Tags
- Default limit: 20, max: 100

---

## 5. Endpoint Specifications

### 5.1 Items

#### `POST /items` — Create Item

Creates a new item and triggers async AI enrichment.

**Idempotency**: Use `Idempotency-Key` header to prevent duplicates.

**Request**
```json
{
  "rawText": "string (required, max 10000 chars)"
}
```

**Headers**
```
Idempotency-Key: <uuid> (recommended)
```

**Response** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "rawText": "Meeting notes from the product review...",
  "title": null,
  "summary": null,
  "tags": [],
  "status": "ENRICHING",
  "sourceType": null,
  "createdAt": "2025-12-27T13:00:00.000Z",
  "updatedAt": "2025-12-27T13:00:00.000Z",
  "confirmedAt": null
}
```

**Error Cases**
| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | rawText empty or too long |
| 401 | `UNAUTHORIZED` | Missing/invalid auth |
| 409 | `DUPLICATE_REQUEST` | Idempotency key already used |

---

#### `GET /items/pending` — List Pending Items

Returns items with status `ENRICHING`, `READY_TO_CONFIRM`, or `FAILED`.

**Response** `200 OK`
```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "rawText": "Meeting notes...",
      "title": "Product Review Meeting Notes",
      "summary": "Product review discussing Q1 roadmap...",
      "tags": ["Meetings", "Product"],
      "status": "READY_TO_CONFIRM",
      "sourceType": "NOTE",
      "createdAt": "2025-12-27T13:00:00.000Z",
      "updatedAt": "2025-12-27T13:02:00.000Z",
      "confirmedAt": null
    }
  ],
  "total": 1
}
```

---

#### `GET /items/:id` — Get Item by ID

**Response** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "rawText": "Meeting notes...",
  "title": "Product Review Meeting Notes",
  "summary": "Product review discussing Q1 roadmap...",
  "tags": ["Meetings", "Product"],
  "status": "ARCHIVED",
  "sourceType": "NOTE",
  "createdAt": "2025-12-27T13:00:00.000Z",
  "updatedAt": "2025-12-27T13:05:00.000Z",
  "confirmedAt": "2025-12-27T13:05:00.000Z"
}
```

**Error Cases**
| Status | Code | Description |
|--------|------|-------------|
| 404 | `NOT_FOUND` | Item does not exist |

---

#### `PATCH /items/:id` — Update Item

Used for: editing fields, confirming, or discarding.

**Request — Confirm**
```json
{
  "action": "confirm",
  "tags": ["Meetings", "Product"]
}
```

**Request — Discard**
```json
{
  "action": "discard"
}
```

**Request — Edit**
```json
{
  "title": "Updated Title",
  "summary": "Updated summary",
  "tags": ["NewTag"]
}
```

**Response** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "ARCHIVED",
  "confirmedAt": "2025-12-27T13:05:00.000Z",
  "updatedAt": "2025-12-27T13:05:00.000Z"
}
```

**Error Cases**
| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_STATE_TRANSITION` | Cannot confirm item in ENRICHING state |
| 404 | `NOT_FOUND` | Item does not exist |

---

#### `POST /items/:id/retry` — Retry Enrichment

Retries AI enrichment for a `FAILED` item.

**Request**: Empty body

**Response** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "ENRICHING",
  "updatedAt": "2025-12-27T13:06:00.000Z"
}
```

**Error Cases**
| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_STATE` | Item is not in FAILED state |

---

### 5.2 Library

#### `GET /library` — List Archived Items

Returns items with status `ARCHIVED`, sorted by `confirmedAt` descending.

**Query Parameters**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cursor` | string | null | Pagination cursor |
| `limit` | number | 20 | Items per page (max 100) |
| `q` | string | null | Search filter (title/rawText) |
| `tag` | string | null | Filter by tag name |

**Response** `200 OK`
```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Product Review Meeting Notes",
      "summary": "Product review discussing Q1 roadmap...",
      "tags": ["Meetings", "Product"],
      "status": "ARCHIVED",
      "sourceType": "NOTE",
      "createdAt": "2025-12-27T13:00:00.000Z",
      "confirmedAt": "2025-12-27T13:05:00.000Z"
    }
  ],
  "pagination": {
    "cursor": "eyJjb25maXJtZWRBdCI6IjIwMjUtMTItMjdUMTM6MDU6MDAuMDAwWiJ9",
    "hasMore": true
  }
}
```

---

### 5.3 Search

#### `POST /search` — Query Vault

Performs semantic search and returns synthesized answer with evidence.

**Request**
```json
{
  "query": "How do I organize my design references?"
}
```

**Response** `200 OK`
```json
{
  "answer": "Based on your notes, here are the key insights...",
  "evidence": [
    {
      "itemId": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Dashboard Design References",
      "snippet": "Design references for the new dashboard...",
      "score": 0.95,
      "type": "NOTE",
      "tags": ["Design", "Research"]
    }
  ],
  "totalSources": 3
}
```

**Error Cases**
| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Query is empty |
| 503 | `AI_SERVICE_UNAVAILABLE` | Search backend unavailable |

---

### 5.4 Tags

#### `GET /tags` — List Tags

**Query Parameters**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | null | Search by name |
| `sort` | string | `name` | Sort by: `name`, `usage`, `lastUsed` |
| `unused` | boolean | false | Show only unused tags |
| `cursor` | string | null | Pagination cursor |
| `limit` | number | 50 | Items per page |

**Response** `200 OK`
```json
{
  "tags": [
    {
      "id": "tag-uuid-1",
      "name": "Meetings",
      "usageCount": 12,
      "lastUsed": "2025-12-27T13:00:00.000Z",
      "createdAt": "2025-12-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "cursor": null,
    "hasMore": false
  },
  "total": 8
}
```

---

#### `POST /tags` — Create Tag

**Request**
```json
{
  "name": "Design"
}
```

**Response** `201 Created`
```json
{
  "id": "tag-uuid-new",
  "name": "Design",
  "usageCount": 0,
  "lastUsed": null,
  "createdAt": "2025-12-27T13:10:00.000Z"
}
```

**Error Cases**
| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Name empty or too long |
| 409 | `TAG_EXISTS` | Tag with same name already exists |

---

#### `PATCH /tags/:id` — Rename Tag

**Request**
```json
{
  "name": "Meetings & Notes"
}
```

**Response** `200 OK`
```json
{
  "id": "tag-uuid-1",
  "name": "Meetings & Notes",
  "usageCount": 12,
  "lastUsed": "2025-12-27T13:00:00.000Z",
  "createdAt": "2025-12-01T00:00:00.000Z"
}
```

---

#### `DELETE /tags/:id` — Delete Tag

Removes tag from all items.

**Response** `204 No Content`

**Error Cases**
| Status | Code | Description |
|--------|------|-------------|
| 404 | `NOT_FOUND` | Tag does not exist |

---

#### `POST /tags/merge` — Merge Tags

Merges source tags into target tag.

**Request**
```json
{
  "sourceTagIds": ["tag-uuid-2", "tag-uuid-3"],
  "targetTagId": "tag-uuid-1"
}
```

**Response** `200 OK`
```json
{
  "targetTag": {
    "id": "tag-uuid-1",
    "name": "Meetings",
    "usageCount": 26,
    "lastUsed": "2025-12-27T13:00:00.000Z"
  },
  "mergedCount": 2
}
```

---

## 6. Status Enum Reference

### ItemStatus
| Value | Description |
|-------|-------------|
| `ENRICHING` | AI enrichment in progress |
| `READY_TO_CONFIRM` | Enrichment complete, awaiting user confirmation |
| `ARCHIVED` | Confirmed and saved to library |
| `DISCARDED` | User discarded the item |
| `FAILED` | Enrichment failed, can retry |

### SourceType
| Value | Description |
|-------|-------------|
| `NOTE` | User-captured note |
| `ARTICLE` | Extracted article content |

---

## 7. Async Enrichment

When an item is created:
1. Backend returns immediately with `status: ENRICHING`
2. Async job processes enrichment (title, summary, tags, sourceType)
3. On success: status → `READY_TO_CONFIRM`
4. On failure: status → `FAILED`

### Polling Strategy (V1)
Frontend polls `GET /items/pending` every 3 seconds while items are in `ENRICHING` state.

### Future: WebSocket/SSE
Backend should emit events for real-time updates:
- `item.enrichment.complete`
- `item.enrichment.failed`

---

## 8. Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `POST /items` | 10/minute |
| `POST /search` | 20/minute |
| `*` (default) | 100/minute |

Response when rate limited:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```
