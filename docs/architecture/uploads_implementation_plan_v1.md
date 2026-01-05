# Uploads Implementation Plan V1

> Implementation roadmap for file upload feature in LiteVault
> Status: IN PROGRESS

---

## 1. Implementation Slices

### Slice 0: Documentation ✅ Complete
- [x] uploads_object_storage_v1.md
- [x] api_upload_contract_v1.md
- [x] data_model_uploads_v1.md
- [x] UI_UPLOADS_SPEC_V1.md
- [x] minio_docker_setup.md
- [x] uploads_implementation_plan_v1.md

### Slice 1: Infrastructure ✅ Complete (2025-01-05)
**Goal:** MinIO running locally, backend can connect

- [x] Add MinIO to docker-compose.yml (with minio-init bucket creation)
- [x] Add S3 settings to backend/app/config.py
- [x] Create backend/app/infrastructure/storage/s3_client.py
- [x] Add boto3 to dependencies
- [x] Update .env.example with S3 variables
- [x] Verify connection (presigned URL generation works)

**Completed:** ~1 hour

### Slice 2: Database
**Goal:** Tables created, migrations working

- [ ] Create alembic migration for `uploads` table
- [ ] Create alembic migration for `item_attachments` table
- [ ] Add SQLAlchemy models:
  - backend/app/infrastructure/persistence/models/upload_model.py
  - backend/app/infrastructure/persistence/models/item_attachment_model.py
- [ ] Create repositories:
  - backend/app/infrastructure/persistence/repositories/upload_repository.py
  - backend/app/infrastructure/persistence/repositories/item_attachment_repository.py
- [ ] Run migrations, verify schema

**Estimated:** 3-4 hours

### Slice 3: Backend Endpoints
**Goal:** Upload API working

- [ ] Create upload service: backend/app/application/uploads/upload_service.py
- [ ] Create API routes: backend/app/api/v1/uploads.py
- [ ] Create attachment routes: backend/app/api/v1/attachments.py
- [ ] Register routes in main.py
- [ ] Implement:
  - POST /uploads/initiate
  - POST /uploads/complete
  - GET /uploads/{id}
  - DELETE /uploads/{id}
  - GET /attachments/{id}/download_url
  - GET /items/{id}/attachments
- [ ] Add request validation (size, type limits)
- [ ] Add error handling

**Estimated:** 6-8 hours

### Slice 4: Backend Tests
**Goal:** Integration tests passing

- [ ] Test upload initiate (happy path)
- [ ] Test upload complete (happy path)
- [ ] Test file too large rejection
- [ ] Test invalid MIME type rejection
- [ ] Test presigned URL generation
- [ ] Test attachment listing
- [ ] Test user isolation (can't access other user's uploads)
- [ ] Test idempotency

**Estimated:** 4-5 hours

### Slice 5: Frontend Components
**Goal:** Upload UI working

- [ ] Create AttachButton component
- [ ] Create UploadProgress component
- [ ] Create AttachmentPreview component
- [ ] Create AttachmentsList component
- [ ] Add upload hooks: useUpload.ts
- [ ] Integrate with Home page capture area
- [ ] Integrate with Library item detail modal
- [ ] Add microcopy to microcopy.ts
- [ ] Add feature flag for attachment enrichment (disabled)

**Estimated:** 8-10 hours

### Slice 6: Frontend Tests
**Goal:** Manual verification passing

- [ ] Upload image from Home page
- [ ] Upload PDF from Home page
- [ ] View attachment in Library
- [ ] Download attachment
- [ ] Delete attachment
- [ ] Error handling (large file)
- [ ] Error handling (wrong type)
- [ ] Upload with existing item (via modal)

**Estimated:** 2-3 hours

### Slice 7: E2E Integration
**Goal:** Full flow working

- [ ] Create item with text + attachment
- [ ] Verify item in Library has attachment
- [ ] Verify AI enrichment ONLY processes text (not attachment)
- [ ] Verify presigned URLs work in browser
- [ ] Test in different browsers (Chrome, Safari, Firefox)

**Estimated:** 2-3 hours

---

## 2. Test Plan

### Backend Integration Tests

| Test | Description |
|------|-------------|
| `test_initiate_upload_success` | Valid request returns presigned URL |
| `test_initiate_upload_too_large` | 413 for oversized file |
| `test_initiate_upload_invalid_type` | 415 for unsupported MIME |
| `test_complete_upload_success` | Finalize creates attachment |
| `test_complete_upload_idempotent` | Repeat returns same response |
| `test_complete_upload_not_found` | 404 for invalid upload_id |
| `test_complete_upload_expired` | 410 for expired upload |
| `test_download_url_success` | Returns valid presigned GET |
| `test_download_url_forbidden` | 403 for other user's attachment |
| `test_list_attachments` | Returns all for item |
| `test_delete_upload` | Soft deletes correctly |

### Frontend Manual Checks

| Check | Steps | Expected |
|-------|-------|----------|
| Attach image | Click 📎, select JPG, click Save | Image uploads, appears in preview |
| Attach PDF | Click 📎, select PDF, click Save | PDF uploads, shows icon |
| Upload progress | Attach large file | Progress bar shown |
| Cancel upload | Start upload, click Cancel | Upload cancelled, no attachment |
| File too large | Select 15MB file | Error toast shown |
| Wrong type | Select .exe file | Error toast shown |
| Download attachment | Click 🔗 on attachment | File downloads |
| Delete attachment | Click 🗑, confirm | Attachment removed |
| Multiple files | Select 3 images | All upload successfully |

---

## 3. Risks & Mitigations

### Risk 1: Content-Type Spoofing
**Description:** Client claims MIME type that doesn't match actual content.

**Mitigation:**
- Validate Content-Type header in presigned PUT
- HEAD request on complete verifies actual content matches
- Future: Magic bytes validation on server

### Risk 2: Size Limit Bypass
**Description:** Client claims small size but uploads large file.

**Mitigation:**
- Presigned URL includes `Content-Length` header requirement
- HEAD request on complete verifies actual size
- S3/MinIO rejects mismatched Content-Length

### Risk 3: Presigned URL Expiration
**Description:** User takes too long between initiate and upload.

**Mitigation:**
- 1-hour expiry (configurable)
- Frontend shows countdown warning at 5 min
- Automatic retry with new presigned URL

### Risk 4: CORS Configuration
**Description:** Browser blocks presigned URL PUT request.

**Mitigation:**
- Document MinIO CORS setup
- Dev environment CORS pre-configured
- Fallback: Offer proxy upload pattern

### Risk 5: Orphaned Objects
**Description:** Objects in S3 without database records.

**Mitigation:**
- Cleanup job scans for expired INITIATED uploads
- Object keys include upload_id for correlation
- Daily reconciliation job (V2)

### Risk 6: Large File Memory Pressure
**Description:** Large uploads consume server memory.

**Mitigation:**
- V1: Direct-to-S3 via presigned URL (no server proxy)
- Backend only handles metadata
- 10 MB limit reduces risk

---

## 4. Rollout Strategy

### Phase 1: Internal Testing
- Deploy to staging environment
- Team tests upload flow
- Fix critical bugs

### Phase 2: Feature Flag
- Add `ENABLE_UPLOADS` feature flag
- Enabled for beta users only
- Collect feedback

### Phase 3: Gradual Rollout
- Enable for 10% of users
- Monitor error rates and storage usage
- Increase to 50%, then 100%

### Phase 4: Full Release
- Remove feature flag
- Update documentation
- Announce feature

---

## 5. Dependencies

### Backend
- boto3 ≥ 1.26 (S3 SDK)
- python-multipart (for potential future proxy uploads)

### Frontend
- No new dependencies (uses native fetch for uploads)

### Infrastructure
- MinIO (local) or S3 (production)
- Storage bucket created and accessible

---

## 6. Open Questions

| Question | Status | Decision |
|----------|--------|----------|
| Should uploads work without associated item? | Decided | V1: No, must attach to item |
| Max attachments per item? | Decided | 10 attachments |
| Support multipart upload? | Deferred | V2: Yes for files > 100 MB |
| Thumbnail generation? | Deferred | V1: Client-side only |
| Malware scanning? | Deferred | V2: Integrate ClamAV |

---

## 7. Success Criteria

- [ ] User can upload image from Home page
- [ ] User can upload PDF from Home page
- [ ] Uploads appear in item detail
- [ ] Downloads work via presigned URL
- [ ] AI enrichment still works for text (unchanged)
- [ ] AI enrichment does NOT process attachments
- [ ] Error handling covers all failure modes
- [ ] 95%+ upload success rate in production

---

## 8. Timeline Estimate

| Slice | Duration | Dependencies |
|-------|----------|--------------|
| Slice 0: Docs | ✅ Complete | - |
| Slice 1: Infrastructure | 2-3 hours | - |
| Slice 2: Database | 3-4 hours | Slice 1 |
| Slice 3: Backend API | 6-8 hours | Slice 2 |
| Slice 4: Backend Tests | 4-5 hours | Slice 3 |
| Slice 5: Frontend | 8-10 hours | Slice 3 |
| Slice 6: Frontend Tests | 2-3 hours | Slice 5 |
| Slice 7: E2E | 2-3 hours | Slice 4, 6 |

**Total Estimate:** 28-40 hours (3-5 days)
