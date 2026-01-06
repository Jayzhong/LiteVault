# Upload API Contract V1

> REST API specification for file/image upload endpoints
> Extends: [API_CONTRACT_V1.md](./API_CONTRACT_V1.md)

---

## Base URL

```
/api/v1/uploads
/api/v1/attachments
```

## Authentication

All endpoints require valid Clerk JWT:
```
Authorization: Bearer <Clerk session JWT>
```

---

## 1. Initiate Upload

**Endpoint:** `POST /api/v1/uploads/initiate`

Creates an upload intent and returns a presigned PUT URL for direct upload to object storage.

### Request Body

```json
{
  "filename": "document.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 1048576,
  "kind": "file",
  "checksum": "sha256:abc123...",
  "itemId": "550e8400-e29b-41d4-a716-446655440000",
  "idempotencyKey": "client-generated-uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filename` | string | Yes | Original filename (max 255 chars) |
| `mimeType` | string | Yes | MIME type (e.g., `image/jpeg`, `application/pdf`) |
| `sizeBytes` | integer | Yes | File size in bytes |
| `kind` | string | Yes | `"image"` or `"file"` |
| `checksum` | string | No | Optional content hash for integrity verification |
| `itemId` | string | No | Optional: attach to existing item |
| `idempotencyKey` | string | No | Client-provided UUID for dedup |

### Response `201 Created`

```json
{
  "uploadId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "objectKey": "550e8400/a1b2c3d4/document.pdf",
  "presignedPutUrl": "https://minio.example.com/litevault-uploads/...",
  "headersToInclude": {
    "Content-Type": "application/pdf",
    "Content-Length": "1048576"
  },
  "expiresAt": "2025-01-05T11:00:00.000Z",
  "status": "INITIATED"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `uploadId` | string | Unique upload identifier |
| `objectKey` | string | Storage object key |
| `presignedPutUrl` | string | URL for direct PUT upload |
| `headersToInclude` | object | Headers client MUST include in PUT |
| `expiresAt` | string | ISO 8601 timestamp when URL expires |
| `status` | string | Upload status (`INITIATED`) |

### Client Upload Instructions

```javascript
// After receiving presigned URL:
await fetch(presignedPutUrl, {
  method: 'PUT',
  headers: headersToInclude,
  body: fileBlob
});
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_REQUEST` | Missing or malformed fields |
| 401 | `UNAUTHORIZED` | No valid auth token |
| 413 | `FILE_TOO_LARGE` | `sizeBytes` exceeds limit (10 MB default) |
| 415 | `INVALID_FILE_TYPE` | `mimeType` not in allowed list |
| 422 | `VALIDATION_ERROR` | Invalid field values |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many initiate requests |

**Error Response Body:**
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size 52428800 exceeds maximum of 10485760 bytes",
    "details": {
      "maxSizeBytes": 10485760,
      "requestedSizeBytes": 52428800
    }
  },
  "requestId": "req-abc123"
}
```

---

## 2. Complete Upload

**Endpoint:** `POST /api/v1/uploads/complete`

Finalizes an upload after the client has successfully PUT the file to object storage.

### Request Body

```json
{
  "uploadId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "etag": "\"abc123def456\""
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uploadId` | string | Yes | Upload ID from initiate response |
| `etag` | string | No | ETag returned by S3/MinIO (for verification) |

### Response `200 OK`

```json
{
  "upload": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "objectKey": "550e8400/a1b2c3d4/document.pdf",
    "filename": "document.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 1048576,
    "kind": "file",
    "status": "COMPLETED",
    "createdAt": "2025-01-05T10:00:00.000Z",
    "completedAt": "2025-01-05T10:01:00.000Z"
  },
  "attachment": {
    "id": "attach-uuid-here",
    "uploadId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "itemId": "550e8400-e29b-41d4-a716-446655440000",
    "displayName": "document.pdf",
    "kind": "file",
    "createdAt": "2025-01-05T10:01:00.000Z"
  }
}
```

### Idempotency

Repeated calls with the same `uploadId` for a completed upload return:
- Same response with `200 OK`
- Does not re-create attachment

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `UPLOAD_VERIFICATION_FAILED` | Object not found in storage |
| 401 | `UNAUTHORIZED` | No valid auth token |
| 403 | `FORBIDDEN` | Upload belongs to different user |
| 404 | `UPLOAD_NOT_FOUND` | Invalid `uploadId` |
| 409 | `INVALID_UPLOAD_STATE` | Upload already completed, failed, or expired |
| 410 | `UPLOAD_EXPIRED` | Presigned URL expired, must re-initiate |

---

## 3. Get Upload (Optional)

**Endpoint:** `GET /api/v1/uploads/{uploadId}`

Get status of an upload.

### Response `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "objectKey": "550e8400/a1b2c3d4/document.pdf",
  "filename": "document.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 1048576,
  "kind": "file",
  "status": "INITIATED",
  "createdAt": "2025-01-05T10:00:00.000Z",
  "completedAt": null,
  "expiresAt": "2025-01-05T11:00:00.000Z"
}
```

### Status Values

| Status | Description |
|--------|-------------|
| `INITIATED` | Presigned URL generated, awaiting upload |
| `COMPLETED` | File uploaded and verified |
| `FAILED` | Upload failed (verification error) |
| `EXPIRED` | Presigned URL expired without completion |
| `DELETED` | Soft-deleted by user |

---

## 4. Delete Upload

**Endpoint:** `DELETE /api/v1/uploads/{uploadId}`

Soft-delete an upload. Object is marked for deletion but retained for cleanup window.

### Response `204 No Content`

No response body.

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | No valid auth token |
| 403 | `FORBIDDEN` | Upload belongs to different user |
| 404 | `UPLOAD_NOT_FOUND` | Invalid `uploadId` |

---

## 5. Get Attachment Download URL

**Endpoint:** `GET /api/v1/attachments/{attachmentId}/download_url`

Generate a presigned GET URL for downloading an attachment.

### Response `200 OK`

```json
{
  "downloadUrl": "https://minio.example.com/litevault-uploads/...",
  "expiresAt": "2025-01-05T11:00:00.000Z",
  "filename": "document.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 1048576
}
```

### Usage

```javascript
// Client redirects or opens in new tab:
window.open(downloadUrl, '_blank');
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | No valid auth token |
| 403 | `FORBIDDEN` | Attachment belongs to different user |
| 404 | `ATTACHMENT_NOT_FOUND` | Invalid `attachmentId` |
| 410 | `ATTACHMENT_DELETED` | Attachment was deleted |

---

## 6. List Item Attachments

**Endpoint:** `GET /api/v1/items/{itemId}/attachments`

List all attachments for a specific item.

### Response `200 OK`

```json
{
  "attachments": [
    {
      "id": "attach-uuid-1",
      "uploadId": "upload-uuid-1",
      "displayName": "document.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 1048576,
      "kind": "file",
      "createdAt": "2025-01-05T10:00:00.000Z"
    },
    {
      "id": "attach-uuid-2",
      "uploadId": "upload-uuid-2",
      "displayName": "photo.jpg",
      "mimeType": "image/jpeg",
      "sizeBytes": 524288,
      "kind": "image",
      "createdAt": "2025-01-05T10:05:00.000Z"
    }
  ],
  "total": 2
}
```

---

## 7. Future Endpoints (V2 - Disabled)

### Enqueue Enrichment from Attachment

**Endpoint:** `POST /api/v1/uploads/{uploadId}/enqueue_enrichment`

> **V1: Returns 501 Not Implemented**

Triggers AI processing for an attachment (e.g., OCR, image captioning).

```json
// V1 Response
{
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "AI enrichment for attachments is not available in this version"
  }
}
```

---

## 8. Request ID Header

All responses include:

```
X-Request-Id: req-abc123def456
```

Include this ID when reporting issues.

---

## 9. Rate Limits

| Endpoint | Limit |
|----------|-------|
| `POST /uploads/initiate` | 60 / hour per user |
| `POST /uploads/complete` | 60 / hour per user |
| `GET /attachments/{id}/download_url` | 300 / hour per user |

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704450000
```
