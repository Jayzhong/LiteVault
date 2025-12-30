# LiteVault Data Model V1

> Database schema design for LiteVault backend
> Aligned with API_CONTRACT_V1.md and state_machine.md

---

## 1. Overview

### Database

- **Development**: SQLite (for simplicity) or PostgreSQL
- **Production**: PostgreSQL 15+

### Conventions

- **IDs**: UUID v4 format, stored as `VARCHAR(36)` for cross-DB compatibility
- **Timestamps**: UTC, stored as `TIMESTAMP WITH TIME ZONE`
- **Soft Delete**: `DISCARDED` items retained with status change, not physically deleted
- **Case Sensitivity**: Tag names case-preserving, matching case-insensitive

---

## 2. Entity-Relationship Diagram

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│    users    │       │      items      │       │    tags     │
├─────────────┤       ├─────────────────┤       ├─────────────┤
│ id (PK)     │──┐    │ id (PK)         │    ┌──│ id (PK)     │
│ email       │  │    │ user_id (FK)    │◀───┘  │ user_id (FK)│◀──┐
│ name        │  │    │ raw_text        │       │ name        │   │
│ plan        │  └───▶│ title           │       │ name_lower  │   │ (unique per user)
│ created_at  │       │ summary         │       │ usage_count │   │
└─────────────┘       │ status          │       │ last_used   │   │
                      │ source_type     │       │ created_at  │   │
                      │ created_at      │       └─────────────┘   │
                      │ updated_at      │                         │
                      │ confirmed_at    │                         │
                      └────────┬────────┘                         │
                               │                                  │
                               │ M:N                              │
                               ▼                                  │
                      ┌─────────────────┐                         │
                      │   item_tags     │                         │
                      ├─────────────────┤                         │
                      │ item_id (FK)    │─────────────────────────┤
                      │ tag_id (FK)     │─────────────────────────┘
                      │ created_at      │
                      └─────────────────┘

┌─────────────────────┐       ┌─────────────────────────┐
│  idempotency_keys   │       │   enrichment_outbox     │
├─────────────────────┤       ├─────────────────────────┤
│ id (PK)             │       │ id (PK)                 │
│ user_id (FK)        │       │ item_id (FK)            │
│ idempotency_key     │       │ status                  │
│ response_item_id    │       │ attempt_count           │
│ created_at          │       │ claimed_at              │
│ expires_at          │       │ last_error              │
└─────────────────────┘       │ created_at              │
                              └─────────────────────────┘
```

---

## 3. Table Definitions

### 3.1 `users`

Stores user accounts. With Clerk authentication, users are identified by `clerk_user_id`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key (internal) |
| `clerk_user_id` | VARCHAR(255) | Yes | - | Clerk user ID (`user_xxx`), null for dev users |
| `email` | VARCHAR(255) | No | - | Email (from Clerk or generated for dev) |
| `display_name` | VARCHAR(100) | No | - | Display name from Clerk |
| `nickname` | VARCHAR(40) | Yes | - | App-owned nickname (overrides display_name) |
| `avatar_url` | TEXT | Yes | - | Custom profile image URL |
| `bio` | VARCHAR(200) | Yes | - | User bio |
| `preferences_json` | JSONB | No | '{}' | User preferences (language, timezone, AI toggle) |
| `plan` | VARCHAR(20) | No | 'free' | 'free' or 'pro' |
| `created_at` | TIMESTAMPTZ | No | NOW() | First authentication time |
| `updated_at` | TIMESTAMPTZ | No | NOW() | Last update time |

> ⚠️ **Note**: `password_hash` is NOT stored. Authentication is handled entirely by Clerk.

**Preferences JSON Schema:**
```json
{
  "defaultLanguage": "en",   // "en" | "zh"
  "timezone": "UTC",         // IANA timezone string
  "aiSuggestionsEnabled": true
}
```

**Constraints:**
```sql
PRIMARY KEY (id)
UNIQUE (clerk_user_id)
CHECK (plan IN ('free', 'pro'))
```

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
```

---

### 3.2 `items`

Stores captured content and enrichment results.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `user_id` | UUID | No | - | Owner reference |
| `raw_text` | TEXT | No | - | Original user input |
| `title` | VARCHAR(255) | Yes | - | AI-generated title |
| `summary` | TEXT | Yes | - | AI-generated summary |
| `status` | VARCHAR(20) | No | 'ENRICHING' | Item lifecycle status |
| `source_type` | VARCHAR(20) | Yes | - | 'NOTE' or 'ARTICLE' |
| `created_at` | TIMESTAMPTZ | No | NOW() | Capture time |
| `updated_at` | TIMESTAMPTZ | No | NOW() | Last modification |
| `confirmed_at` | TIMESTAMPTZ | Yes | - | When confirmed to library |
| `enrichment_mode` | VARCHAR(10) | No | 'AI' | 'AI' or 'MANUAL' |
| `tags` | ARRAY(VARCHAR) | No | [] | Denormalized tag lookup (V1 source of truth) |

**Constraints:**
```sql
PRIMARY KEY (id)
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
CHECK (status IN ('ENRICHING', 'READY_TO_CONFIRM', 'ARCHIVED', 'DISCARDED', 'FAILED'))
CHECK (source_type IS NULL OR source_type IN ('NOTE', 'ARTICLE'))
```

**Indexes:**
```sql
-- For GET /items/pending (user's pending items)
CREATE INDEX idx_items_user_pending ON items(user_id, created_at DESC)
    WHERE status IN ('ENRICHING', 'READY_TO_CONFIRM', 'FAILED');

-- For GET /library (user's archived items, cursor pagination)
CREATE INDEX idx_items_user_archived ON items(user_id, confirmed_at DESC)
    WHERE status = 'ARCHIVED';

-- For item lookup
CREATE INDEX idx_items_user_id ON items(user_id);

-- For GET /search (pg_trgm trigram indexes for ILIKE search)
-- Requires: CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_items_title_trgm ON items USING GIN (title gin_trgm_ops);
CREATE INDEX idx_items_summary_trgm ON items USING GIN (summary gin_trgm_ops);
CREATE INDEX idx_items_raw_text_trgm ON items USING GIN (raw_text gin_trgm_ops);
```

---

### 3.3 `tags`

Stores user-created tags. Supports soft-delete via `deleted_at` column.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `user_id` | UUID | No | - | Owner reference |
| `name` | VARCHAR(50) | No | - | Display name (preserved case) |
| `name_lower` | VARCHAR(50) | No | - | Lowercase for uniqueness |
| `color` | VARCHAR(7) | No | '#6B7280' | Hex color code |
| `usage_count` | INT | No | 0 | Number of items using tag |
| `last_used` | TIMESTAMPTZ | Yes | - | Last time tag was applied |
| `created_at` | TIMESTAMPTZ | No | NOW() | Creation time |
| `updated_at` | TIMESTAMPTZ | No | NOW() | Last update time |
| `deleted_at` | TIMESTAMPTZ | Yes | - | Soft-delete timestamp (NULL = active) |

**Soft-Delete Semantics:**
- DELETE /tags/:id sets `deleted_at=now()` instead of removing the row
- GET /tags and all tag displays filter `WHERE deleted_at IS NULL`
- Creating a tag with same name as a deleted tag "revives" it (same ID preserved)
- UNIQUE constraint on `(user_id, name_lower)` applies to ALL rows (including deleted)

**Constraints:**
```sql
PRIMARY KEY (id)
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
UNIQUE (user_id, name_lower)  -- Case-insensitive unique per user (includes deleted)
CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 50)
```

**Indexes:**
```sql
-- For tag lookup and uniqueness
CREATE UNIQUE INDEX idx_tags_user_name ON tags(user_id, name_lower);

-- For GET /tags with sorting (only active tags)
CREATE INDEX idx_tags_user_active ON tags(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tags_user_name_asc ON tags(user_id, name ASC) WHERE deleted_at IS NULL;
CREATE INDEX idx_tags_user_usage_desc ON tags(user_id, usage_count DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_tags_user_lastused_desc ON tags(user_id, last_used DESC NULLS LAST) WHERE deleted_at IS NULL;
```

---

### 3.4 `item_tags`

Junction table for items ↔ tags many-to-many relationship.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `item_id` | UUID | No | - | Item reference |
| `tag_id` | UUID | No | - | Tag reference |
| `created_at` | TIMESTAMPTZ | No | NOW() | When tag was applied |

> **Note:** V1 primarily uses the `items.tags` array for simplified read/write. This junction table is maintained for potential V2 normalization but may not be the primary source of truth in V1.

**Constraints:**
```sql
PRIMARY KEY (item_id, tag_id)
FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
```

**Indexes:**
```sql
-- For reverse lookup (tags → items)
CREATE INDEX idx_item_tags_tag_id ON item_tags(tag_id);
```

---

### 3.5 `item_tag_suggestions`

Stores AI-generated tag suggestions for items pending review. Suggestions are stored separately from confirmed tags until user accepts them.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `user_id` | UUID | No | - | Owner reference |
| `item_id` | UUID | No | - | Item reference |
| `source` | VARCHAR(20) | No | 'AI' | Source: 'AI' or 'SYSTEM' |
| `suggested_name` | VARCHAR(50) | No | - | Display name (preserved case from AI) |
| `normalized_name` | VARCHAR(50) | No | - | Lowercase for matching/dedup |
| `confidence` | FLOAT | Yes | - | AI confidence score (optional) |
| `status` | VARCHAR(20) | No | 'PENDING' | PENDING / ACCEPTED / REJECTED |
| `created_at` | TIMESTAMPTZ | No | NOW() | Suggestion creation time |
| `reviewed_at` | TIMESTAMPTZ | Yes | - | When user accepted/rejected |
| `meta` | JSONB | No | '{}' | Extensible metadata |

**Status Flow:**
- `PENDING` → initial state from enrichment
- `ACCEPTED` → user accepted, tag created/revived in tags table
- `REJECTED` → user rejected, no tag created

**Constraints:**
```sql
PRIMARY KEY (id)
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
UNIQUE (user_id, item_id, normalized_name)  -- One suggestion per tag name per item
CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED'))
CHECK (source IN ('AI', 'SYSTEM'))
```

**Indexes:**
```sql
-- For loading suggestions by item
CREATE INDEX idx_suggestions_item ON item_tag_suggestions(item_id);

-- For user's pending suggestions (review queue)
CREATE INDEX idx_suggestions_user_pending ON item_tag_suggestions(user_id)
    WHERE status = 'PENDING';
```

---

### 3.6 `idempotency_keys`

Stores idempotency keys for `POST /items`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `user_id` | UUID | No | - | User who made request |
| `idempotency_key` | VARCHAR(36) | No | - | Client-provided key (UUID) |
| `response_item_id` | UUID | Yes | - | Created item ID |
| `created_at` | TIMESTAMPTZ | No | NOW() | Request time |
| `expires_at` | TIMESTAMPTZ | No | NOW() + 24h | TTL |

**Constraints:**
```sql
PRIMARY KEY (id)
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
FOREIGN KEY (response_item_id) REFERENCES items(id) ON DELETE SET NULL
UNIQUE (user_id, idempotency_key)
```

**Indexes:**
```sql
-- For idempotency lookup
CREATE UNIQUE INDEX idx_idempotency_user_key ON idempotency_keys(user_id, idempotency_key);

-- For TTL cleanup
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);
```

---

### 3.7 `enrichment_outbox`

Transactional outbox for async enrichment jobs. Supports LISTEN/NOTIFY wakeups with fallback polling.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `item_id` | UUID | No | - | Item to enrich |
| `job_type` | VARCHAR(50) | No | 'enrichment' | Job type (extensible) |
| `status` | VARCHAR(20) | No | 'PENDING' | PENDING/IN_PROGRESS/DONE/FAILED/DEAD |
| `attempt_count` | INT | No | 0 | Retry attempts |
| `run_at` | TIMESTAMPTZ | No | NOW() | When job becomes runnable (for backoff) |
| `claimed_at` | TIMESTAMPTZ | Yes | - | When worker claimed job |
| `locked_by` | VARCHAR(100) | Yes | - | Worker ID holding claim |
| `lease_expires_at` | TIMESTAMPTZ | Yes | - | Claim expiry (for crash recovery) |
| `last_error_code` | VARCHAR(50) | Yes | - | Error code from last attempt |
| `last_error_message` | TEXT | Yes | - | Error message from last attempt |
| `created_at` | TIMESTAMPTZ | No | NOW() | Job creation time |

**Constraints:**
```sql
PRIMARY KEY (id)
FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
CHECK (status IN ('PENDING', 'IN_PROGRESS', 'DONE', 'FAILED', 'DEAD'))
```

**Indexes:**
```sql
-- For worker claiming (runnable jobs where run_at is due)
CREATE INDEX idx_outbox_runnable ON enrichment_outbox(run_at, created_at)
    WHERE status = 'PENDING';

-- For expired lease reclaim (crashed workers)
CREATE INDEX idx_outbox_expired_lease ON enrichment_outbox(lease_expires_at)
    WHERE status = 'IN_PROGRESS' AND lease_expires_at IS NOT NULL;
```

**Job Dispatch Pattern:**
```
1. Producer: INSERT job + NOTIFY litevault_jobs (after commit)
2. Consumer: LISTEN litevault_jobs → drain() on wakeup
3. Fallback: Poll every 30s + startup scan
4. Claiming: FOR UPDATE SKIP LOCKED + lease expiry
5. Idempotency: Check item.status before write
```

---

## 4. Cursor Pagination Strategy

### Library (`GET /library`)

**Cursor Composition:**
```json
{
  "confirmed_at": "2025-12-27T13:05:00.000Z",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Encoding:** Base64-encoded JSON

**Query Pattern:**
```sql
SELECT * FROM items
WHERE user_id = :user_id
  AND status = 'ARCHIVED'
  AND (confirmed_at, id) < (:cursor_confirmed_at, :cursor_id)
ORDER BY confirmed_at DESC, id DESC
LIMIT :limit + 1;  -- +1 to detect hasMore
```

**Why (confirmed_at, id)?**
- `confirmed_at` alone is not unique (multiple items confirmed same second)
- Adding `id` ensures deterministic ordering

### Tags (`GET /tags`)

**Sorting Options:**

| Sort | Cursor Fields |
|------|---------------|
| `name` | `(name_lower, id)` |
| `usage` | `(usage_count, id)` |
| `lastUsed` | `(last_used, id)` |

**Query Pattern (sort by name):**
```sql
SELECT * FROM tags
WHERE user_id = :user_id
  AND (name_lower, id) > (:cursor_name, :cursor_id)
ORDER BY name_lower ASC, id ASC
LIMIT :limit + 1;
```

### Cursor Implementation

```python
import base64
import json
from dataclasses import dataclass

@dataclass
class LibraryCursor:
    confirmed_at: datetime
    id: str

    def encode(self) -> str:
        return base64.b64encode(
            json.dumps({
                "confirmed_at": self.confirmed_at.isoformat(),
                "id": self.id
            }).encode()
        ).decode()

    @classmethod
    def decode(cls, cursor: str) -> "LibraryCursor":
        data = json.loads(base64.b64decode(cursor))
        return cls(
            confirmed_at=datetime.fromisoformat(data["confirmed_at"]),
            id=data["id"]
        )
```

---

## 5. Transaction Boundaries

### 5.1 Create Item (`POST /items`)

```
BEGIN TRANSACTION;
  1. Check idempotency key (if provided)
  2. INSERT INTO items (status='ENRICHING')
  3. INSERT INTO enrichment_outbox
  4. INSERT INTO idempotency_keys (if key provided)
COMMIT;
```

**Rationale:** All operations must succeed together. If outbox insert fails, item should not be created.

### 5.2 Confirm Item (`PATCH /items/:id` action=confirm)

```
BEGIN TRANSACTION;
  1. SELECT item FOR UPDATE (lock row)
  2. Validate status = 'READY_TO_CONFIRM'
  3. UPDATE item SET status='ARCHIVED', confirmed_at=NOW()
  4. For each tag in request:
     a. Get or create tag (INSERT ... ON CONFLICT DO NOTHING)
     b. INSERT INTO item_tags (if not exists)
     c. UPDATE tag SET usage_count = usage_count + 1, last_used = NOW()
COMMIT;
```

### 5.3 Discard Item (`PATCH /items/:id` action=discard)

```
BEGIN TRANSACTION;
  1. SELECT item FOR UPDATE
  2. Validate status in ('READY_TO_CONFIRM', 'FAILED')
  3. UPDATE item SET status='DISCARDED', updated_at=NOW()
  4. DELETE FROM enrichment_outbox WHERE item_id = :id
COMMIT;
```

### 5.4 Delete Tag (`DELETE /tags/:id`)

```
BEGIN TRANSACTION;
  1. SELECT tag FOR UPDATE
  2. DELETE FROM item_tags WHERE tag_id = :id
  3. DELETE FROM tags WHERE id = :id
  -- Note: usage_count on other tags not affected
COMMIT;
```

### 5.5 Merge Tags (`POST /tags/merge`)

```
BEGIN TRANSACTION;
  1. Validate all source and target tags exist and belong to user
  2. For each source tag:
     a. UPDATE item_tags SET tag_id = :target_id WHERE tag_id = :source_id
        ON CONFLICT (item_id, tag_id) DO NOTHING
     b. DELETE FROM item_tags WHERE tag_id = :source_id
     c. DELETE FROM tags WHERE id = :source_id
  3. Recalculate target tag usage_count:
     UPDATE tags SET 
       usage_count = (SELECT COUNT(*) FROM item_tags WHERE tag_id = :target_id)
     WHERE id = :target_id
COMMIT;
```

---

## 6. Enum Definitions (Application-Level)

### ItemStatus

```python
class ItemStatus(str, Enum):
    ENRICHING = "ENRICHING"
    READY_TO_CONFIRM = "READY_TO_CONFIRM"
    ARCHIVED = "ARCHIVED"
    DISCARDED = "DISCARDED"
    FAILED = "FAILED"
```

### SourceType

```python
class SourceType(str, Enum):
    NOTE = "NOTE"
    ARTICLE = "ARTICLE"
```

### UserPlan

```python
class UserPlan(str, Enum):
    FREE = "free"
    PRO = "pro"
```

---

## 7. Migration Strategy

### Alembic Configuration

```python
# alembic/env.py
from app.infrastructure.persistence.models import Base

target_metadata = Base.metadata
```

### Initial Migration

```bash
alembic revision --autogenerate -m "initial_schema"
alembic upgrade head
```

### Migration Best Practices

1. **Additive changes first**: Add columns as nullable, backfill, then add constraints
2. **No breaking changes in single migration**: Split into multiple migrations
3. **Test migrations both ways**: `upgrade` and `downgrade`

---

## 8. Questions / Proposed Resolutions

| Question | Resolution |
|----------|------------|
| Should we store tags as array on items or separate table? | Separate table (normalized) for count/rename/merge operations |
| How to handle tag name case conflicts on merge? | Target tag name preserved, source tags deleted |
| Should idempotency keys be cleaned up? | Yes, cron job to delete expired keys daily |
| How to handle concurrent enrichment claims? | `FOR UPDATE SKIP LOCKED` ensures single processing |
| Should we add full-text search index? | V1: Use pg_trgm extension with GIN indexes for fast ILIKE. V2: consider `tsvector` or vector embeddings |

---

### 3.8 `ai_daily_usage`

Tracks daily AI usage totals per user for quota enforcement.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `user_id` | UUID | No | - | FK to users |
| `day_date` | DATE | No | - | Usage date (UTC) |
| `enrichment_count` | INT | No | 0 | Number of enrichments used |
| `updated_at` | TIMESTAMPTZ | No | NOW() | Last update time |
| `limit_override` | INT | Yes | - | Custom limit for this user/day |

**Constraints:**
```sql
PRIMARY KEY (user_id, day_date)
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

### 3.9 `ai_usage_ledger`

Immutable ledger of AI usage events for audit and idempotency.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `user_id` | UUID | No | - | FK to users |
| `action` | VARCHAR(50) | No | - | Event type (e.g. 'ENRICH_ITEM') |
| `resource_id` | UUID | No | - | Reference to item/resource caused charge |
| `cost_units` | INT | No | 1 | Cost amount |
| `created_at` | TIMESTAMPTZ | No | NOW() | Event time |

**Constraints:**
```sql
PRIMARY KEY (id)
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

**Indexes:**
```sql
-- Dedup index: prevent double-billing
CREATE UNIQUE INDEX idx_ledger_dedup ON ai_usage_ledger(user_id, resource_id, action);
```

