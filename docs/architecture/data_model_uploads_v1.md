# Data Model: Uploads V1

> Database schema for file uploads and item attachments
> Extends: [data_model_v1.md](./data_model_v1.md)

---

## 1. Overview

This document defines the database tables for supporting file and image uploads in LiteVault.

### Design Decisions

1. **Separate `uploads` and `item_attachments` tables**
   - `uploads` tracks the upload lifecycle (presigned URL → completion)
   - `item_attachments` tracks the association with items
   - Allows uploads without immediate item attachment (future use)

2. **Attachments belong to items**
   - For V1, attachments are associated with existing items
   - No standalone uploads (must reference an item)
   - AI enrichment NOT triggered from attachments

3. **Soft delete for both tables**
   - Enables recovery and audit trail
   - Objects retained in storage during cleanup window

---

## 2. Entity-Relationship Diagram

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│    users    │       │     uploads     │       │    items    │
├─────────────┤       ├─────────────────┤       ├─────────────┤
│ id (PK)     │──┐    │ id (PK)         │    ┌──│ id (PK)     │
│ email       │  │    │ user_id (FK)    │◀───┤  │ user_id (FK)│
│ ...         │  └───▶│ object_key      │    │  │ raw_text    │
└─────────────┘       │ bucket          │    │  │ status      │
                      │ status          │    │  │ ...         │
                      │ mime_type       │    │  └─────────────┘
                      │ size_bytes      │    │
                      │ kind            │    │
                      │ ...             │    │
                      └────────┬────────┘    │
                               │             │
                               │ 1:1         │
                               ▼             │
                      ┌─────────────────┐    │
                      │ item_attachments│    │
                      ├─────────────────┤    │
                      │ id (PK)         │    │
                      │ user_id (FK)    │────┘
                      │ item_id (FK)    │────────────┐
                      │ upload_id (FK)  │◀───────────┤
                      │ display_name    │            │
                      │ kind            │            │
                      │ ...             │            │
                      └─────────────────┘            │
                                                     │
                          (items ← item_attachments: 1:N)
```

---

## 3. Table Definitions

### 3.1 `uploads`

Tracks upload lifecycle from initiation to completion.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `user_id` | UUID | No | - | Owner reference |
| `status` | VARCHAR(20) | No | 'INITIATED' | Upload lifecycle status |
| `object_key` | VARCHAR(500) | No | - | S3/MinIO object key |
| `bucket` | VARCHAR(100) | No | - | Storage bucket name |
| `filename` | VARCHAR(255) | No | - | Original filename |
| `mime_type` | VARCHAR(100) | No | - | MIME type (validated) |
| `size_bytes` | BIGINT | No | - | File size in bytes |
| `kind` | VARCHAR(20) | No | - | 'image' or 'file' |
| `checksum` | VARCHAR(100) | Yes | - | Content hash (sha256) |
| `etag` | VARCHAR(100) | Yes | - | S3 ETag from upload |
| `idempotency_key` | VARCHAR(36) | Yes | - | Client-provided dedup key |
| `request_id` | VARCHAR(100) | Yes | - | Request ID for tracing |
| `created_at` | TIMESTAMPTZ | No | NOW() | Initiation time |
| `updated_at` | TIMESTAMPTZ | No | NOW() | Last update |
| `completed_at` | TIMESTAMPTZ | Yes | - | When upload completed |
| `expires_at` | TIMESTAMPTZ | No | - | Presigned URL expiry |
| `deleted_at` | TIMESTAMPTZ | Yes | - | Soft-delete timestamp |

**Status Values:**

| Status | Description |
|--------|-------------|
| `INITIATED` | Presigned URL generated, awaiting client upload |
| `COMPLETED` | File uploaded and verified in storage |
| `FAILED` | Upload verification failed (object not found) |
| `EXPIRED` | Presigned URL expired without completion |
| `DELETED` | Soft-deleted by user or cleanup job |

**Constraints:**
```sql
PRIMARY KEY (id)
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
UNIQUE (object_key)
UNIQUE (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL
CHECK (status IN ('INITIATED', 'COMPLETED', 'FAILED', 'EXPIRED', 'DELETED'))
CHECK (kind IN ('image', 'file'))
```

**Indexes:**
```sql
-- For user's uploads list
CREATE INDEX idx_uploads_user_created ON uploads(user_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- For object key lookup
CREATE UNIQUE INDEX idx_uploads_object_key ON uploads(object_key);

-- For cleanup job (expired/abandoned)
CREATE INDEX idx_uploads_expires ON uploads(expires_at)
    WHERE status = 'INITIATED';

-- For idempotency lookup
CREATE UNIQUE INDEX idx_uploads_idempotency 
    ON uploads(user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL;
```

---

### 3.2 `item_attachments`

Associates uploads with items.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `user_id` | UUID | No | - | Owner reference (denormalized) |
| `item_id` | UUID | No | - | Associated item |
| `upload_id` | UUID | No | - | Reference to uploads table |
| `display_name` | VARCHAR(255) | No | - | Display filename |
| `kind` | VARCHAR(20) | No | - | 'image' or 'file' |
| `sort_order` | INT | No | 0 | Display order within item |
| `created_at` | TIMESTAMPTZ | No | NOW() | Attachment creation |
| `updated_at` | TIMESTAMPTZ | No | NOW() | Last update |
| `deleted_at` | TIMESTAMPTZ | Yes | - | Soft-delete timestamp |

**Reserved Fields (V2 - AI Enrichment):**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `ai_extracted_text` | TEXT | Yes | OCR/transcription result |
| `ai_metadata` | JSONB | Yes | Image captions, doc summaries |
| `enrichment_status` | VARCHAR(20) | Yes | NULL/PENDING/PROCESSING/DONE/FAILED |
| `enriched_at` | TIMESTAMPTZ | Yes | When AI processing completed |

**Constraints:**
```sql
PRIMARY KEY (id)
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE RESTRICT
UNIQUE (upload_id)  -- One attachment per upload
CHECK (kind IN ('image', 'file'))
```

**Indexes:**
```sql
-- For item's attachments list
CREATE INDEX idx_attachments_item ON item_attachments(item_id, sort_order)
    WHERE deleted_at IS NULL;

-- For user's attachments
CREATE INDEX idx_attachments_user ON item_attachments(user_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- For upload FK lookup
CREATE UNIQUE INDEX idx_attachments_upload ON item_attachments(upload_id);
```

---

## 4. Status State Machine

### Upload Status Transitions

```
                    ┌────────────┐
                    │  INITIATED │
                    └─────┬──────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
      ┌──────────┐  ┌──────────┐  ┌──────────┐
      │ COMPLETED│  │  FAILED  │  │ EXPIRED  │
      └────┬─────┘  └──────────┘  └──────────┘
           │
           ▼
      ┌──────────┐
      │ DELETED  │  (via user action or cleanup)
      └──────────┘
```

**Transitions:**

| From | To | Trigger |
|------|----|---------|
| INITIATED | COMPLETED | `POST /uploads/complete` + object verified |
| INITIATED | FAILED | `POST /uploads/complete` + object not found |
| INITIATED | EXPIRED | Cleanup job finds past expires_at |
| COMPLETED | DELETED | `DELETE /uploads/{id}` or cleanup |
| FAILED | - | Terminal state |
| EXPIRED | - | Terminal state |

---

## 5. Cleanup Policy

### Abandoned Uploads (INITIATED → EXPIRED)

**Condition:** `status = 'INITIATED' AND expires_at < NOW() - INTERVAL '1 hour'`

**Action:**
1. Set `status = 'EXPIRED'`
2. Optionally delete object from storage (if partial upload exists)

**Schedule:** Every 6 hours via background job

### Soft-Deleted Objects

**Condition:** `deleted_at < NOW() - INTERVAL '30 days'`

**Action:**
1. Hard-delete row from database
2. Delete object from S3/MinIO

**Schedule:** Daily cleanup job

---

## 6. Integration with Existing Tables

### Items Table

Attachments reference items via `item_attachments.item_id`. 

**No changes to items table structure.**

**Behavioral changes:**
- Items with attachments do NOT trigger AI enrichment from attachments
- Item confirmation flow ignores attachments
- Future: attachments may contribute to item summary

### Item Status (No Change)

Attachments are allowed on items in any status:
- ENRICHING → can add attachments (won't affect enrichment)
- READY_TO_CONFIRM → can add attachments
- ARCHIVED → can add attachments

---

## 7. Migration Strategy

### Alembic Migration

```python
"""Add uploads and item_attachments tables

Revision ID: xxxx
"""

def upgrade():
    # Create uploads table
    op.create_table(
        'uploads',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('status', sa.VARCHAR(20), nullable=False, default='INITIATED'),
        sa.Column('object_key', sa.VARCHAR(500), nullable=False),
        sa.Column('bucket', sa.VARCHAR(100), nullable=False),
        sa.Column('filename', sa.VARCHAR(255), nullable=False),
        sa.Column('mime_type', sa.VARCHAR(100), nullable=False),
        sa.Column('size_bytes', sa.BigInteger(), nullable=False),
        sa.Column('kind', sa.VARCHAR(20), nullable=False),
        sa.Column('checksum', sa.VARCHAR(100), nullable=True),
        sa.Column('etag', sa.VARCHAR(100), nullable=True),
        sa.Column('idempotency_key', sa.VARCHAR(36), nullable=True),
        sa.Column('request_id', sa.VARCHAR(100), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('completed_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('expires_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    
    # Create item_attachments table
    op.create_table(
        'item_attachments',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('item_id', sa.UUID(), nullable=False),
        sa.Column('upload_id', sa.UUID(), nullable=False),
        sa.Column('display_name', sa.VARCHAR(255), nullable=False),
        sa.Column('kind', sa.VARCHAR(20), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['upload_id'], ['uploads.id'], ondelete='RESTRICT'),
    )
    
    # Create indexes
    # ... (as defined above)

def downgrade():
    op.drop_table('item_attachments')
    op.drop_table('uploads')
```

---

## 8. Questions / Decisions

| Question | Decision |
|----------|----------|
| Can uploads exist without item attachment? | V1: No. Attachment created on complete. V2: Allow unattached. |
| How to handle duplicate uploads of same file? | No dedup. Each upload is unique. Use idempotency_key for retry safety. |
| Should attachments affect item.updated_at? | Yes, adding attachment updates item.updated_at |
| Max attachments per item? | V1: 10 attachments. Enforce in application layer. |
