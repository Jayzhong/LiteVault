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
| `GET` | `/items/:id/attachments` | List attachments for item | ✓ |
| `GET` | `/library` | List archived items (timeline) | ✓ |
| `GET` | `/search` | Search library (lexical, V1) | ✓ |
| `GET` | `/tags` | List all tags | ✓ |
| `POST` | `/tags` | Create new tag | ✓ |
| `PATCH` | `/tags/:id` | Rename tag | ✓ |
| `DELETE` | `/tags/:id` | Delete tag | ✓ |
| `POST` | `/tags/merge` | Merge tags | ✓ |
| `POST` | `/uploads/initiate` | Get presigned PUT URL for upload | ✓ |
| `POST` | `/uploads/complete` | Complete upload and create attachment | ✓ |
| `GET` | `/uploads/:id` | Get upload status | ✓ |
| `DELETE` | `/uploads/:id` | Delete upload | ✓ |
| `GET` | `/attachments/:id/download_url` | Get presigned download URL | ✓ |
| `DELETE` | `/attachments/:id` | Delete attachment | ✓ |

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
  "enrich": true,
  "tagIds": ["uuid", "uuid"]
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `rawText` | string | Yes | - | Captured text content |
| `enrich` | boolean | No | `true` | If true, triggers AI enrichment (ENRICHING). If false, saves directly to ARCHIVED. |
| `tagIds` | string[] | No | `[]` | Tag UUIDs to associate with item. Validated: must belong to user and not be deleted. |

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

When `enrich=false` (Direct Save to Library):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "rawText": "Meeting notes from the product review...",
  "title": "Meeting notes from the product review",
  "summary": null,
  "tags": [{"id": "tag-uuid", "name": "Work", "color": "#3B82F6"}],
  "status": "ARCHIVED",
  "sourceType": "NOTE",
  "enrichmentMode": "MANUAL",
  "createdAt": "2025-12-27T13:00:00.000Z",
  "updatedAt": "2025-12-27T13:00:00.000Z",
  "confirmedAt": "2025-12-27T13:00:00.000Z"
}
```

> **Note**: When `enrich=false`:
> - Item is created directly as ARCHIVED (no pending review step)
> - Title is auto-generated from the first 60 characters of the first non-empty line
> - `confirmedAt` is set to creation time
> - Any provided `tagIds` are validated and associated

**Error Cases**
| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | rawText empty or too long, or invalid tagIds |
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
  "tags": [{"id": "tag-1", "name": "Meetings", "color": "#6B7280"}],
  "suggestedTags": [
    {"id": "sug-1", "name": "Q1 Planning", "status": "PENDING", "confidence": 0.92},
    {"id": "sug-2", "name": "Product", "status": "PENDING", "confidence": 0.87}
  ],
  "status": "READY_TO_CONFIRM",
  "sourceType": "NOTE",
  "createdAt": "2025-12-27T13:00:00.000Z",
  "updatedAt": "2025-12-27T13:05:00.000Z",
  "confirmedAt": null,
  "attachmentCount": 2,
  "attachments": [
    {
      "id": "att-uuid-1",
      "uploadId": "upload-uuid-1",
      "displayName": "screenshot.png",
      "mimeType": "image/png",
      "sizeBytes": 524288,
      "kind": "image",
      "createdAt": "2025-12-27T13:03:00.000Z"
    }
  ]
}
```

> **Note**: `suggestedTags` contains AI-generated tag suggestions stored in `item_tag_suggestions` table. For ARCHIVED items, `suggestedTags` shows historical accepted/rejected decisions. For READY_TO_CONFIRM items, it shows PENDING suggestions requiring user review.

**Error Cases**
| Status | Code | Description |
|--------|------|-------------|
| 404 | `NOT_FOUND` | Item does not exist |

---

#### `PATCH /items/:id` — Update Item

Used for: editing fields, confirming, or discarding.

**Request — Confirm** (from READY_TO_CONFIRM)
```json
{
  "action": "confirm",
  "acceptedSuggestionIds": ["sug-1"],
  "rejectedSuggestionIds": ["sug-2"],
  "addedTagIds": ["existing-tag-uuid"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `acceptedSuggestionIds` | string[] | No | Suggestion IDs to accept (creates/revives tags) |
| `rejectedSuggestionIds` | string[] | No | Suggestion IDs to reject |
| `addedTagIds` | string[] | No | Existing tag IDs to associate with item |
| `title` | string | No | Override AI-generated title |
| `summary` | string | No | Override AI-generated summary |
| `originalText` | string | No | Edit original text payload |

**Request — Discard** (from READY_TO_CONFIRM, FAILED, or ARCHIVED)
```json
{
  "action": "discard"
}
```

> **Note**: Discard from ARCHIVED status is used for "Library Discard" — removing an item from the library. The item transitions to DISCARDED status and is hidden from all queries.

**Request — Edit** (ARCHIVED items only)
```json
{
  "title": "Updated Title",
  "summary": "Updated summary",
  "originalText": "Updated original text content...",
  "addedTagIds": ["tag-uuid"],
  "removedTagIds": ["tag-uuid-2"]
}
```

> **Note**: Editing `originalText` does NOT trigger AI regeneration. Title, summary, and tags remain unchanged unless explicitly modified.

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
| 409 | `INVALID_STATE_TRANSITION` | Cannot confirm/discard item in ENRICHING state |
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
      "rawText": "Meeting notes...",
      "title": "Product Review Meeting Notes",
      "summary": "Product review discussing Q1 roadmap...",
      "tags": [{"id": "tag-1", "name": "Meetings", "color": "#6B7280"}],
      "status": "ARCHIVED",
      "sourceType": "NOTE",
      "createdAt": "2025-12-27T13:00:00.000Z",
      "confirmedAt": "2025-12-27T13:05:00.000Z",
      "attachmentCount": 2
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
      "tags": [{"id": "tag-1", "name": "Meetings", "color": "#6B7280"}],
      "sourceType": "NOTE",
      "createdAt": "2025-12-27T13:00:00.000Z",
      "confirmedAt": "2025-12-27T13:05:00.000Z",
      "attachmentCount": 2
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
      "createdAt": "2025-12-01T00:00:00.000Z",
      "color": "#6B7280"
    }
  ],
  "total": 8
}
```

---

#### `POST /tags` — Create or Get Tag (Upsert)

Creates a new tag or returns existing tag if name already exists (case-insensitive match).

**Revive Behavior:** If a soft-deleted tag with the same name exists, it is "revived":
- `deleted_at` is set to NULL
- The same tag ID is returned
- Optionally updates `color` if provided

**Request**
```json
{
  "name": "Design",
  "color": "#3B82F6"
}
```

**Response** `201 Created` (new tag or revived)
```json
{
  "id": "tag-uuid-new",
  "name": "Design",
  "usageCount": 0,
  "lastUsed": null,
  "createdAt": "2025-12-27T13:10:00.000Z",
  "color": "#3B82F6"
}
```

**Response** `200 OK` (existing active tag returned)
```json
{
  "id": "tag-uuid-existing",
  "name": "Design",
  "usageCount": 5,
  "lastUsed": "2025-12-26T10:00:00.000Z",
  "createdAt": "2025-12-01T00:00:00.000Z",
  "color": "#6B7280"
}
```

> **Note:** Tag matching is case-insensitive. Posting "design" when "Design" exists returns the existing tag (or revives a deleted "Design").

**Error Cases**
| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Name empty or too long |

---

#### `PATCH /tags/:id` — Update Tag (Name and/or Color)

Updates a tag's name and/or color. Both fields are optional.

**Request**
```json
{
  "name": "Meetings & Notes",
  "color": "#3B82F6"
}
```

**Response** `200 OK`
```json
{
  "id": "tag-uuid-1",
  "name": "Meetings & Notes",
  "usageCount": 12,
  "lastUsed": "2025-12-27T13:00:00.000Z",
  "createdAt": "2025-12-01T00:00:00.000Z",
  "color": "#3B82F6"
}
```

**Error Cases**
| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid color format (must be #RRGGBB) |
| 404 | `NOT_FOUND` | Tag does not exist |
| 409 | `TAG_EXISTS` | New name conflicts with existing tag |

---

#### `DELETE /tags/:id` — Soft-Delete Tag

Soft-deletes a tag by setting `deleted_at=now()`. The tag is hidden from all queries but preserved in the database. Items that referenced the tag will no longer display it.

**Behavior:**
- Sets `deleted_at=now()` (does NOT physically remove the row)
- Deleted tags are excluded from GET /tags and all item displays
- **Idempotent:** Deleting an already-deleted tag returns success

**Response** `204 No Content`

**Error Cases**
| Status | Code | Description |
|--------|------|-------------|
| 404 | `TAG_NOT_FOUND` | Tag does not exist (never existed) |

> **Note:** Re-creating a tag with the same name after deletion will "revive" the original tag, returning the same ID. See POST /tags.

---


#### `POST /tags/merge` — Merge Tags

> ⚠️ **NOT IMPLEMENTED**: This endpoint is planned but not yet implemented.

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

### 5.5 Uploads & Attachments

File uploads use a **presigned URL workflow** for direct client-to-storage uploads:

1. Client calls `POST /uploads/initiate` with file metadata
2. Backend returns presigned PUT URL for object storage
3. Client uploads file directly to storage using presigned URL
4. Client calls `POST /uploads/complete` to finalize
5. Backend verifies upload and creates attachment record

#### `POST /uploads/initiate` — Initiate Upload

Returns a presigned PUT URL for direct upload to object storage (MinIO/S3).

**Request**
```json
{
  "filename": "document.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 1048576,
  "kind": "file",
  "itemId": "550e8400-e29b-41d4-a716-446655440000",
  "idempotencyKey": "abc123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filename` | string | Yes | Original filename (max 255 chars) |
| `mimeType` | string | Yes | MIME type of file |
| `sizeBytes` | number | Yes | File size in bytes |
| `kind` | string | Yes | `image` or `file` |
| `itemId` | string | No | Item to attach to (can be set on complete) |
| `idempotencyKey` | string | No | Unique key to prevent duplicates |

**Response** `201 Created`
```json
{
  "uploadId": "upload-uuid",
  "objectKey": "user-id/upload-id/document.pdf",
  "presignedPutUrl": "https://minio.example.com/bucket/...",
  "headersToInclude": {
    "Content-Type": "application/pdf",
    "Content-Length": "1048576"
  },
  "expiresAt": "2025-12-27T14:00:00.000Z",
  "status": "INITIATED"
}
```

**Error Cases**
| Status | Code | Description |
|--------|------|-------------|
| 413 | `FILE_TOO_LARGE` | File exceeds size limit |
| 415 | `INVALID_FILE_TYPE` | MIME type not allowed |
| 409 | `DUPLICATE_REQUEST` | Idempotency key already used |

---

#### `POST /uploads/complete` — Complete Upload

Verifies the file exists in storage and creates an attachment record.

**Request**
```json
{
  "uploadId": "upload-uuid",
  "itemId": "550e8400-e29b-41d4-a716-446655440000",
  "etag": "\"abc123\"" 
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uploadId` | string | Yes | Upload ID from initiate |
| `itemId` | string | Yes | Item to attach to |
| `etag` | string | No | ETag from S3 PUT response |

**Response** `200 OK`
```json
{
  "upload": {
    "id": "upload-uuid",
    "objectKey": "user-id/upload-id/document.pdf",
    "filename": "document.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 1048576,
    "kind": "file",
    "status": "COMPLETED",
    "createdAt": "2025-12-27T13:00:00.000Z",
    "completedAt": "2025-12-27T13:01:00.000Z"
  },
  "attachment": {
    "id": "attachment-uuid",
    "uploadId": "upload-uuid",
    "itemId": "item-uuid",
    "displayName": "document.pdf",
    "kind": "file",
    "createdAt": "2025-12-27T13:01:00.000Z"
  }
}
```

**Error Cases**
| Status | Code | Description |
|--------|------|-------------|
| 404 | `UPLOAD_NOT_FOUND` | Upload does not exist |
| 410 | `UPLOAD_EXPIRED` | Presigned URL has expired |
| 409 | `INVALID_UPLOAD_STATE` | Upload not in INITIATED state |
| 400 | `UPLOAD_VERIFICATION_FAILED` | File not found in storage |

---

#### `GET /uploads/:id` — Get Upload Status

**Response** `200 OK`
```json
{
  "id": "upload-uuid",
  "objectKey": "user-id/upload-id/document.pdf",
  "filename": "document.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 1048576,
  "kind": "file",
  "status": "COMPLETED",
  "createdAt": "2025-12-27T13:00:00.000Z",
  "completedAt": "2025-12-27T13:01:00.000Z",
  "expiresAt": "2025-12-27T14:00:00.000Z"
}
```

---

#### `DELETE /uploads/:id` — Delete Upload

Soft-deletes an upload record.

**Response** `204 No Content`

---

#### `GET /items/:id/attachments` — List Item Attachments

Returns all attachments for an item.

**Response** `200 OK`
```json
{
  "attachments": [
    {
      "id": "attachment-uuid",
      "uploadId": "upload-uuid",
      "displayName": "document.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 1048576,
      "kind": "file",
      "createdAt": "2025-12-27T13:01:00.000Z"
    },
    {
      "id": "attachment-uuid-2",
      "uploadId": "upload-uuid-2",
      "displayName": "screenshot.png",
      "mimeType": "image/png",
      "sizeBytes": 524288,
      "kind": "image",
      "createdAt": "2025-12-27T13:02:00.000Z"
    }
  ],
  "total": 2
}
```

---

#### `GET /attachments/:id/download_url` — Get Download URL

Returns a presigned download URL for an attachment.

**Query Parameters**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `preview` | boolean | false | If true, returns inline URL for in-browser viewing (PDF preview) |

**Response** `200 OK`
```json
{
  "downloadUrl": "https://minio.example.com/bucket/...",
  "expiresAt": "2025-12-27T14:00:00.000Z",
  "filename": "document.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 1048576
}
```

> **Note:** When `preview=true`, the URL returns `Content-Disposition: inline` for in-browser viewing. When `preview=false` (default), returns `Content-Disposition: attachment` for download.

---

#### `DELETE /attachments/:id` — Delete Attachment

Soft-deletes an attachment record.

**Response** `204 No Content`

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

## 8. Rate Limiting & Quotas

### 8.1 API Rate Limits (Burst)

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /items` | 10 | 1 minute |
| `POST /search` | 20 | 1 minute |
| `*` (default) | 100 | 1 minute |

**Response Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1703682400 (Unix timestamp)
```

### 8.2 AI Usage Quotas (Daily)

Limits on successful AI enrichment operations per user per UTC day.

| Plan | Daily Quota | Concurrency Limit |
|------|-------------|-------------------|
| Free | 2 | 1 |
| Pro | 10 | 3 |

**Response Headers (on AI-related endpoints):**
```
X-AI-Quota-Limit: 50
X-AI-Quota-Remaining: 49
X-AI-Quota-Reset: 1703721600 (Seconds until UTC midnight)
```

**Error Response (Quota Exceeded):**
```json
{
  "error": {
    "code": "DAILY_QUOTA_EXCEEDED",
    "message": "You have reached your daily AI enrichment limit (50/day).",
    "requestId": "req-...",
    "details": {
      "limit": 50,
      "resetAt": "2025-12-31T00:00:00Z"
    }
  }
}
```

**Error Response (Concurrency Limit):**
```json
{
  "error": {
    "code": "CONCURRENCY_LIMIT_EXCEEDED",
    "message": "Too many items are being processed simultaneously.",
    "requestId": "req-...",
    "details": {
      "activeJobs": 3,
      "limit": 3
    }
  }
}
```
