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

### Production Mode (Phase 2+)

Authentication is handled by [Clerk](https://clerk.com/). Protected endpoints require a valid Clerk session token.

**Request Header:**
```
Authorization: Bearer <Clerk session JWT>
```

**Token Validation:**
- Backend verifies JWT signature using Clerk JWKS
- Validates: `exp`, `nbf`, `iss`, `aud` claims
- Extracts `sub` claim as `clerk_user_id`
- User record created/updated just-in-time on first request

**Supported Auth Methods (via Clerk):**
- Email/password
- OAuth: Google, GitHub

### Development Fallback

For local development without Clerk, use header-based auth:
```
X-Dev-User-Id: user-123
```

**Precedence:** If `Authorization: Bearer` header is present and valid, Clerk auth is used. Otherwise, `X-Dev-User-Id` is checked (only if `AUTH_MODE=mixed|dev`).

> ⚠️ **DEPRECATED**: The following endpoints from initial planning are NOT implemented. Use Clerk's hosted auth UI instead.
> - `POST /auth/signup` — Use Clerk SignUp component
> - `POST /auth/login` — Use Clerk SignIn component
> - `POST /auth/logout` — Use Clerk signOut()

### Auth Endpoints (V1)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /auth/me` | ✅ | Get current authenticated user with profile + preferences |
| `PATCH /auth/me/profile` | ✅ | Update profile fields (nickname, avatarUrl, bio) |
| `PATCH /auth/me/preferences` | ✅ | Update preferences (language, timezone, AI toggle) |

#### `GET /auth/me` — Get Current User

Returns the currently authenticated user's profile with preferences.

**Response** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "clerkUserId": "user_2abc123...",
  "email": "user@example.com",
  "displayName": "John Doe",
  "nickname": "Johnny",
  "avatarUrl": "https://...",
  "bio": "A knowledge enthusiast",
  "preferences": {
    "defaultLanguage": "en",
    "timezone": "America/New_York",
    "aiSuggestionsEnabled": true
  },
  "plan": "free",
  "createdAt": "2025-12-27T13:00:00.000Z",
  "updatedAt": "2025-12-28T10:00:00.000Z"
}
```

**Error Cases**
| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | No valid auth token |

#### `PATCH /auth/me/profile` — Update Profile

Update app-owned profile fields (nickname, avatarUrl, bio).

**Request Body**
```json
{
  "nickname": "Johnny",
  "avatarUrl": "https://example.com/avatar.png",
  "bio": "A knowledge enthusiast"
}
```

All fields are optional. Send only fields to update.

**Validation Rules**
| Field | Constraint |
|-------|------------|
| `nickname` | 1-40 characters, trimmed |
| `avatarUrl` | Must be http:// or https:// URL |
| `bio` | Max 200 characters |

**Response** `200 OK` — Same as GET /auth/me

**Error Cases**
| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | No valid auth token |
| 422 | `VALIDATION_ERROR` | Invalid field values |

#### `PATCH /auth/me/preferences` — Update Preferences

Update user preferences.

**Request Body**
```json
{
  "defaultLanguage": "zh",
  "timezone": "Asia/Shanghai",
  "aiSuggestionsEnabled": false
}
```

All fields are optional. Send only fields to update.

**Validation Rules**
| Field | Constraint |
|-------|------------|
| `defaultLanguage` | `en` or `zh` |
| `timezone` | IANA timezone string |
| `aiSuggestionsEnabled` | Boolean |

**Response** `200 OK` — Same as GET /auth/me

**Error Cases**
| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | No valid auth token |
| 422 | `VALIDATION_ERROR` | Invalid field values |

---

## 3. API Endpoint Summary

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `GET` | `/auth/me` | Get current user with profile + preferences | ✓ |
| `PATCH` | `/auth/me/profile` | Update profile (nickname, avatarUrl, bio) | ✓ |
| `PATCH` | `/auth/me/preferences` | Update preferences (language, timezone, AI) | ✓ |
| `POST` | `/items` | Create new item (triggers enrichment) | ✓ |
| `GET` | `/items/pending` | List pending items | ✓ |
| `GET` | `/items/:id` | Get single item | ✓ |
| `PATCH` | `/items/:id` | Update item (edit/confirm/discard) | ✓ |
| `POST` | `/items/:id/retry` | Retry failed enrichment | ✓ |
| `GET` | `/library` | List archived items (timeline) | ✓ |
| `GET` | `/search` | Search library (lexical, V1) | ✓ |
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

Creates a new item. Optionally triggers async AI enrichment.

**Idempotency**: Use `Idempotency-Key` header to prevent duplicates.

**Request**
```json
{
  "rawText": "string (required, max 10000 chars)",
  "enrich": true
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `rawText` | string | Yes | - | Captured text content |
| `enrich` | boolean | No | `true` | If true, triggers AI enrichment (ENRICHING). If false, creates READY_TO_CONFIRM immediately. |

**Headers**
```
Idempotency-Key: <uuid> (recommended)
```

**Response** `201 Created`

When `enrich=true` (default):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "rawText": "Meeting notes from the product review...",
  "title": null,
  "summary": null,
  "tags": [],
  "status": "ENRICHING",
  "sourceType": null,
  "enrichmentMode": "AI",
  "createdAt": "2025-12-27T13:00:00.000Z",
  "updatedAt": "2025-12-27T13:00:00.000Z",
  "confirmedAt": null
}
```

When `enrich=false`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "rawText": "Meeting notes from the product review...",
  "title": "Meeting notes from the product review",
  "summary": null,
  "tags": [],
  "status": "READY_TO_CONFIRM",
  "sourceType": "NOTE",
  "enrichmentMode": "MANUAL",
  "createdAt": "2025-12-27T13:00:00.000Z",
  "updatedAt": "2025-12-27T13:00:00.000Z",
  "confirmedAt": null
}
```

> **Note**: When `enrich=false`, title is auto-generated from the first 60 characters of the first non-empty line. No AI processing occurs.

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

#### `GET /search` — Search Library (V1)

Searches archived items using lexical matching. Supports two modes:
- **Tag-only mode**: Query starts with `#` → matches tag names only
- **Combined mode**: Otherwise → matches title/summary/rawText OR tags

**Query Parameters**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | required | Search query (non-empty) |
| `cursor` | string | null | Pagination cursor |
| `limit` | number | 20 | Items per page (max 100) |

**Query Parsing Rules**
| Query | Mode | Behavior |
|-------|------|----------|
| `#work` | tag_only | Match items with tags containing "work" |
| `meeting notes` | combined | Match items where text OR tags contain "meeting notes" |

**Response** `200 OK`
```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Product Review Meeting Notes",
      "summary": "Product review discussing Q1 roadmap...",
      "tags": ["Meetings", "Product"],
      "sourceType": "NOTE",
      "confirmedAt": "2025-12-27T13:05:00.000Z"
    }
  ],
  "mode": "combined",
  "pagination": {
    "cursor": "eyJjb25maXJtZWRBdCI6IjIwMjUtMTItMjdUMTM6MDU6MDAuMDAwWiJ9",
    "hasMore": true
  },
  "total": 42
}
```

**Ordering**: Results ordered by `confirmed_at DESC, id DESC` (most recent first).

**Error Cases**
| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Query empty after trimming |
| 400 | `INVALID_CURSOR` | Malformed pagination cursor |
| 401 | `UNAUTHORIZED` | Missing/invalid auth |

---

#### `POST /search` — Semantic Search (V2 — Not Implemented)

> ⚠️ **NOT IMPLEMENTED**: Reserved for future semantic search with LLM answer synthesis.

Future endpoint for AI-powered search with synthesized answers and evidence.

**Request** (V2 Future)
```json
{
  "query": "How do I organize my design references?",
  "mode": "semantic"
}
```

**Response** (V2 Future)
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
