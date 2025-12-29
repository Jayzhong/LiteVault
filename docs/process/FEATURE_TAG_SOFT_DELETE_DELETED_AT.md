# Feature: Soft-Delete Tags via deleted_at

**Status:** 🚧 In Progress  
**Created:** 2025-12-29

---

## Scope

### In Scope
- Add `deleted_at TIMESTAMPTZ NULL` column to `tags` table
- Change DELETE /tags/:id to soft-delete (set `deleted_at=now()`)
- Filter deleted tags from GET /tags by default
- Filter deleted tags from item endpoints (items, library, search)
- Revive deleted tags when creating tag with same name (same id preserved)
- Idempotent delete (deleting already-deleted tag returns success)
- Frontend: immediate UI update on delete, hide deleted tags everywhere

### Out of Scope
- Admin UI to view/restore deleted tags
- Bulk delete/restore
- UI redesign
- Scheduled purge of old deleted tags

---

## Key Decisions

### Decision 1: Item Display Behavior

**Chosen: Option A** — Hide deleted tags from item display

- Item endpoints join tags with `deleted_at IS NULL`
- Deleted tags simply disappear from item chips
- No "(deleted)" marker needed
- Simpler implementation, cleaner UX

### Decision 2: Uniqueness with Deleted Tags

**Approach:** Revive on re-create

- Keep UNIQUE constraint on `(user_id, name_lower)` for ALL rows
- When POST /tags creates a tag whose name matches a deleted tag:
  - Revive it: set `deleted_at=NULL`, optionally update `color`
  - Return same id (201 status)
- This ensures stable tag IDs and prevents duplicate confusion

### Decision 3: Delete Response

- Current: 204 No Content
- After soft-delete: Keep 204 No Content for consistency
- Idempotent: Deleting already-deleted tag returns 204 (no error)

---

## Slice Plan

### Slice A: Docs Updates
- [ ] Update `data_model_v1.md` — add `deleted_at` column + index
- [ ] Update `API_CONTRACT_V1.md` — soft delete behavior + revive semantics
- [ ] Update `use_cases_v1.md` — DeleteTag and CreateTag flows

**Files:**
- `docs/architecture/data_model_v1.md`
- `docs/architecture/API_CONTRACT_V1.md`
- `docs/architecture/use_cases_v1.md`

**Acceptance:** Docs reflect soft-delete semantics

---

### Slice B: DB Migration
- [ ] Create Alembic migration adding `deleted_at` column
- [ ] Add partial index for efficient filtering
- [ ] Run migration

**Files:**
- `backend/alembic/versions/009_add_tags_deleted_at.py`

**Acceptance:** `uv run alembic upgrade head` succeeds

---

### Slice C: Backend Implementation
- [ ] Update TagModel with `deleted_at` field
- [ ] Update TagRepository `get_*` methods to filter `deleted_at IS NULL`
- [ ] Update `delete_tag` to set `deleted_at=now()` instead of DELETE
- [ ] Update `create_or_get_by_name` to revive deleted tags
- [ ] Update item endpoints' tag resolution to filter deleted tags

**Files:**
- `backend/app/infrastructure/persistence/models/tag_model.py`
- `backend/app/infrastructure/persistence/repositories/tag_repository_impl.py`
- `backend/app/api/v1/tags.py`
- `backend/app/api/v1/items.py` (tag resolution)
- `backend/app/api/v1/library.py` (tag resolution)
- `backend/app/api/v1/search.py` (tag resolution)

**Acceptance:** DELETE sets deleted_at, GET excludes deleted tags, revive works

---

### Slice D: Integration Tests
- [ ] Test: Create → Delete → GET excludes it
- [ ] Test: Delete twice → 204 (idempotent)
- [ ] Test: Create → Delete → Create same name → revive (same id)
- [ ] Test: Item with tag → delete tag → item endpoint excludes tag
- [ ] Test: 404 for non-existent tag

**Files:**
- `backend/tests/test_tags.py`

**Acceptance:** `uv run pytest tests/test_tags.py` passes with new tests

---

### Slice E: Frontend Adaptation
- [ ] Verify delete mutation works (204 handling already done)
- [ ] Ensure tags query invalidation removes deleted tag from UI
- [ ] Verify TagPicker excludes deleted tags (backend filters)
- [ ] Verify item chips exclude deleted tags (backend filters)

**Files:**
- `frontend/src/lib/hooks/useTags.ts` (verify invalidation)
- (No changes expected if backend filtering works)

**Acceptance:** Frontend build passes, deleted tags disappear immediately

---

### Slice F: Manual Verification
- [ ] Delete tag in Settings → disappears immediately
- [ ] Refresh page → still absent
- [ ] Tag search doesn't show deleted tag
- [ ] Re-create same tag name → same tag ID appears
- [ ] Item that had tag → tag chip gone

---

## Progress Checklist

- [x] Slice A: Docs Updates
- [x] Slice B: DB Migration
- [x] Slice C: Backend Implementation
- [x] Slice D: Integration Tests
- [x] Slice E: Frontend Adaptation
- [x] Slice F: Manual Verification

---

## How to Run

### Backend
```bash
cd backend
uv sync
uv run alembic upgrade head
uv run pytest
uv run uvicorn app.main:app --reload --port 8080
```

### Frontend
```bash
cd frontend
npm run dev
```

---

## How to Test

```bash
# All tests
cd backend && uv run pytest

# Tags tests only
cd backend && uv run pytest tests/test_tags.py -v

# Frontend build
cd frontend && npm run build
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| Existing items reference deleted tag | Tag resolution filters by deleted_at=NULL, so they disappear gracefully |
| UNIQUE constraint blocks revive | No - we revive (update) existing row, not insert new |
| Performance of filtering | Partial index on `(user_id) WHERE deleted_at IS NULL` ensures fast queries |
| Data migration needed? | No - existing tags have deleted_at=NULL by default |
