# Uploads &amp; Object Storage Architecture V1

> Design document for file and image upload support in LiteVault
> Status: DRAFT - Pending implementation

---

## 1. Goals

### In Scope (V1)
- Allow users to upload files and images via presigned PUT URLs
- Store objects in S3-compatible storage (MinIO for dev, S3 for production)
- User-scoped access control (users can only access their own uploads)
- Robust error handling, idempotency, and cleanup for abandoned uploads
- Associate attachments with items without triggering AI enrichment
- Reserve API hooks for future AI enrichment from attachments

### Non-Goals (V1)
- **AI enrichment from uploads** — UI disabled, backend hooks reserved
- Multipart upload for large files (V2)
- Malware/virus scanning (explicitly out of scope, noted for V2)
- Image thumbnails/transformations (V2)
- Public sharing of attachments (V2)

---

## 2. Architecture Overview

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Home Capture   │  │  Library Item   │  │   Attach UI     │  │
│  │  (paperclip)    │  │  Detail Modal   │  │   Components    │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │           │
└───────────┼────────────────────┼────────────────────┼───────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Upload Service                          │    │
│  │  - POST /uploads/initiate → presigned PUT URL           │    │
│  │  - POST /uploads/complete → finalize upload             │    │
│  │  - GET /attachments/{id}/download_url → presigned GET   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────┐  ┌──────────────────┐  ┌─────────────────┐    │
│  │   uploads    │  │ item_attachments │  │    items        │    │
│  │   (table)    │  │     (table)      │  │   (existing)    │    │
│  └──────┬───────┘  └────────┬─────────┘  └─────────────────┘    │
│         │                   │                                    │
└─────────┼───────────────────┼────────────────────────────────────┘
          │                   │
          ▼                   │
┌─────────────────────────────────────────────────────────────────┐
│              MinIO / S3 Object Storage                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Bucket: litevault-uploads                               │    │
│  │  Key format: {user_id}/{upload_id}/{filename}           │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Upload Flow (Sequence Diagram)

```
Client                    Backend                    MinIO/S3
  │                          │                          │
  │ POST /uploads/initiate   │                          │
  │ {filename, mime, size}   │                          │
  │─────────────────────────▶│                          │
  │                          │ validate size/type       │
  │                          │ generate object_key      │
  │                          │ create upload record     │
  │                          │ generate presigned PUT   │
  │                          │─────────────────────────▶│
  │                          │◀─────────────────────────│
  │◀─────────────────────────│                          │
  │ {upload_id, presigned_url, expires_at}              │
  │                          │                          │
  │ PUT presigned_url        │                          │
  │ (file bytes directly to MinIO)─────────────────────▶│
  │                          │                          │
  │◀─────────────────────────────────────(200 + ETag)───│
  │                          │                          │
  │ POST /uploads/complete   │                          │
  │ {upload_id, etag?}       │                          │
  │─────────────────────────▶│                          │
  │                          │ verify object exists     │
  │                          │─────────────────────────▶│
  │                          │◀───────(HEAD response)───│
  │                          │ update status=COMPLETED  │
  │                          │ create item_attachment   │
  │◀─────────────────────────│                          │
  │ {upload, attachment_id}  │                          │
  │                          │                          │
```

### 2.3 Download/View Flow

**Decision: Presigned GET URLs (not proxy)**

Rationale:
- Direct download reduces backend load
- Supports large files without memory pressure
- Standard S3 pattern, well-supported by browsers

```
Client                    Backend                    MinIO/S3
  │                          │                          │
  │ GET /attachments/{id}/download_url                  │
  │─────────────────────────▶│                          │
  │                          │ verify ownership         │
  │                          │ generate presigned GET   │
  │                          │─────────────────────────▶│
  │◀─────────────────────────│                          │
  │ {download_url, expires_at}                          │
  │                          │                          │
  │ GET download_url         │                          │
  │─────────────────────────────────────────────────────▶│
  │◀────────────────────────────────────(file bytes)────│
```

---

## 3. Components

### 3.1 Backend Upload Service

**Location:** `backend/app/application/uploads/upload_service.py`

**Responsibilities:**
- Validate file type and size
- Generate unique object keys with user partitioning
- Generate presigned PUT/GET URLs via boto3/MinIO SDK
- Track upload lifecycle (INITIATED → COMPLETED | FAILED | DELETED)
- Create `item_attachment` records on successful completion

**Dependencies:**
- boto3 or minio SDK
- Database repositories for uploads and item_attachments

### 3.2 Storage Configuration

**Settings class additions:**

```python
# backend/app/config.py
class Settings(BaseSettings):
    # ... existing settings ...
    
    # Object Storage
    s3_endpoint_url: str = "http://localhost:9000"  # MinIO local
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_bucket_name: str = "litevault-uploads"
    s3_region: str = "us-east-1"
    s3_use_ssl: bool = False  # True for production S3
    
    # Upload limits
    upload_max_size_bytes: int = 10 * 1024 * 1024  # 10 MB default
    upload_allowed_types: list[str] = [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf", "text/plain", "text/markdown"
    ]
    upload_presigned_url_expiry_seconds: int = 3600  # 1 hour
```

### 3.3 Database Tables

See: [data_model_uploads_v1.md](./data_model_uploads_v1.md)

---

## 4. Security Model

### 4.1 Authentication
- All upload endpoints require valid Clerk JWT (Authorization: Bearer)
- No anonymous uploads

### 4.2 Object Key Naming Strategy

**Format:** `{user_id}/{upload_id}/{sanitized_filename}`

Example: `550e8400-e29b-41d4-a716-446655440000/a1b2c3d4/document.pdf`

**Benefits:**
- User ID prefix enables S3 bucket policies per-user if needed
- Upload ID ensures uniqueness even with same filename
- Sanitized filename preserves readability in storage consoles

**Sanitization Rules:**
- Remove path traversal characters (`..`, `/`, `\`)
- Replace spaces with underscores
- Truncate to 100 characters max
- Preserve extension

### 4.3 Content-Type and Size Limits

| Constraint | Value | Configurable |
|------------|-------|--------------|
| Max file size | 10 MB | Yes (env var) |
| Allowed MIME types | images (jpeg/png/gif/webp), pdf, text | Yes |
| Max filename length | 100 chars | No |

**Validation Points:**
1. **initiate:** Check declared size and MIME type
2. **complete:** HEAD request verifies actual content-length matches

### 4.4 Presigned URL Security
- URLs expire after 1 hour (configurable)
- PUT URLs include Content-Type restriction
- No bucket credentials exposed to client
- GET URLs per-request, no long-lived access

### 4.5 Malware Scanning

> **V1: Out of Scope**
> 
> Future consideration: Integrate ClamAV or AWS GuardDuty on upload completion.
> Object would remain in `SCANNING` status until verified.

---

## 5. Observability

### 5.1 Request ID Propagation
- All upload endpoints include `X-Request-Id` in response headers
- Request ID logged with all upload operations
- Stored in `uploads.request_id` for correlation

### 5.2 Audit Logs

| Event | Logged Fields |
|-------|---------------|
| `upload.initiated` | user_id, upload_id, filename, size, mime_type, request_id |
| `upload.completed` | user_id, upload_id, object_key, etag, request_id |
| `upload.failed` | user_id, upload_id, error_reason, request_id |
| `upload.deleted` | user_id, upload_id, deleted_by, request_id |

### 5.3 Metrics (Future)
- `uploads.initiated.count`
- `uploads.completed.count`
- `uploads.failed.count`
- `uploads.size_bytes.histogram`
- `uploads.abandoned.count` (cleanup job)

---

## 6. Future Hooks for AI Enrichment

### 6.1 Reserved Fields

**uploads table:**
- `enrichment_status`: NULL | PENDING | PROCESSING | COMPLETED | FAILED
- `enrichment_result_json`: JSONB for AI extraction results

**item_attachments table:**
- `ai_extracted_text`: TEXT (for OCR/transcription results)
- `ai_metadata`: JSONB (for image captions, document summaries)

### 6.2 Reserved Endpoints (Disabled in V1)

```
POST /uploads/{id}/enqueue_enrichment
  → Triggers AI processing for attachment
  → V1: Returns 501 Not Implemented
  → UI: Button hidden/disabled
```

### 6.3 V1 Enforcement

- Backend: Endpoints return 501
- Frontend: "Enrich from attachment" UI hidden via feature flag
- AI enrichment flow ignores attachments; only processes raw_text

---

## 7. Error Handling

### 7.1 Pre-Upload Errors

| Code | HTTP | Description |
|------|------|-------------|
| `FILE_TOO_LARGE` | 413 | Exceeds max size |
| `INVALID_FILE_TYPE` | 415 | MIME type not allowed |
| `QUOTA_EXCEEDED` | 429 | Storage quota exceeded (future) |

### 7.2 Upload Errors

| Code | HTTP | Description |
|------|------|-------------|
| `UPLOAD_EXPIRED` | 410 | Presigned URL expired |
| `UPLOAD_NOT_FOUND` | 404 | Upload ID not found |
| `UPLOAD_ALREADY_COMPLETED` | 409 | Duplicate complete call |
| `UPLOAD_VERIFICATION_FAILED` | 400 | Object not found in storage |

### 7.3 Idempotency

**Initiate:** 
- Repeated initiate with same content creates new upload (no dedup)
- Optional: Client can provide `idempotency_key` for dedup

**Complete:**
- Repeated complete with same upload_id returns cached response
- Status check prevents state corruption

---

## 8. Cleanup Strategy

### 8.1 Abandoned Uploads

**Definition:** Upload with `status=INITIATED` older than 24 hours

**Cleanup Job:**
- Runs every 6 hours (cron or background worker)
- Marks as `status=EXPIRED`
- Optionally deletes object from storage (V2)

### 8.2 Soft Delete

**DELETE /uploads/{id}:**
- Sets `deleted_at` timestamp
- Object retained in storage for 30 days (configurable)
- Hard purge via separate cleanup job

---

## 9. Configuration Summary

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `S3_ENDPOINT_URL` | `http://localhost:9000` | MinIO/S3 endpoint |
| `S3_ACCESS_KEY` | - | Access key (required) |
| `S3_SECRET_KEY` | - | Secret key (required) |
| `S3_BUCKET_NAME` | `litevault-uploads` | Bucket name |
| `S3_REGION` | `us-east-1` | AWS region |
| `S3_USE_SSL` | `false` | Use HTTPS for S3 |
| `UPLOAD_MAX_SIZE_BYTES` | `10485760` | 10 MB |
| `UPLOAD_PRESIGNED_EXPIRY` | `3600` | 1 hour |

---

## 10. Related Documents

- [API Upload Contract V1](./api_upload_contract_v1.md)
- [Data Model Uploads V1](./data_model_uploads_v1.md)
- [MinIO Docker Setup](./minio_docker_setup.md)
- [UI Uploads Spec V1](../design/UI_UPLOADS_SPEC_V1.md)
