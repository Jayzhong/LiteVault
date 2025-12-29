# Backend Tag Management Gaps Phase

## Scope

Audit Settings / Tag Management page and fill backend capability gaps.

### In Scope
- Document capability matrix (UI feature → backend status)
- Add missing integration tests
- Update API_CONTRACT_V1.md for color field
- Verify all error responses include requestId

### Out of Scope
- Merge tags (UI does not have merge control)
- Cursor-based pagination (current offset works, cursor is future)
- Rename modal UI (frontend stub only - defer to frontend task)

---

## Capability Matrix

| Feature | Frontend Evidence | Backend Status | Action |
|---------|-------------------|----------------|--------|
| **List tags** | `page.tsx:29` uses `useTags()` | ✅ Exists | None |
| **Search (q)** | `page.tsx:30` passes `q: searchQuery` | ✅ Exists | Add test |
| **Sort (name/usage/lastUsed)** | `page.tsx:31` passes `sort: sortBy` | ✅ Exists | Add test |
| **Show unused filter** | `page.tsx:32` passes `unused: showUnused` | ✅ Exists | Add test |
| **Create tag (upsert)** | `page.tsx:35-41` calls `createTag()` | ✅ Exists (upsert) | ✅ Tested |
| **Rename tag** | `TagsTable.tsx:42-44` shows toast stub | ✅ Backend exists | Add test for 404 |
| **Delete tag** | `TagsTable.tsx:46-52` calls `deleteTag()` | ✅ Exists | ✅ Tested |
| **Tag color** | `TagsTable.tsx:54-60` calls `updateTagColor()` | ✅ Exists | Add test, update docs |
| **Merge tags** | Not in UI | ❌ Not implemented | Out of scope |
| **Pagination** | Not in UI (limit only) | Partial (no cursor) | Out of scope |
| **requestId in errors** | Required per error_handling.md | Partial | Verify tests |

---

## Plan - Slices

### Slice A: Missing Integration Tests
**Scope:** Add tests for sort, unused filter, color update, 404 on PATCH

**Tests to add:**
1. `test_get_tags_sort_by_usage` - verify sort=usage ordering
2. `test_get_tags_sort_by_lastUsed` - verify sort=lastUsed ordering
3. `test_get_tags_unused_filter` - verify unused=true filters correctly
4. `test_update_tag_color` - verify PATCH with color updates
5. `test_update_tag_not_found` - verify PATCH on missing tag returns 404
6. `test_error_response_includes_requestId` - verify error envelope

**Files:**
- `backend/tests/test_tags.py`

**Acceptance Criteria:**
- `uv run pytest tests/test_tags.py -v` passes all tests

---

### Slice B: API Contract Documentation Update
**Scope:** Update API_CONTRACT_V1.md for color field and PATCH changes

**Changes:**
1. Add `color` field to TagResponse in GET /tags example
2. Update PATCH /tags/:id section title to "Update Tag (name and/or color)"
3. Add color parameter documentation to PATCH request schema
4. Add hex color validation error to error cases

**Files:**
- `docs/architecture/API_CONTRACT_V1.md`

**Acceptance Criteria:**
- Docs reflect actual API behavior

---

## Progress Checklist

- [x] Slice A: Add missing integration tests (18 tests pass)
- [x] Slice B: Update API contract docs
- [x] Final verification: `uv run pytest` passes

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Merge tags | Out of scope | UI does not expose merge control |
| Cursor pagination | Out of scope | Current limit-based works; cursor is future enhancement |
| Rename modal | Frontend only | Backend PATCH works; frontend stub needs separate task |
| usageCount definition | Count of items associated | Already implemented in schema |

---

## How to Run

```bash
# Backend
cd backend
uv sync
uv run alembic upgrade head
uv run pytest
uv run uvicorn app.main:app --reload --port 8080

# Frontend (if needed)
cd frontend
npm run dev
```

---

## How to Test

```bash
# Run all tag tests
cd backend
uv run pytest tests/test_tags.py -v

# Run specific test
uv run pytest tests/test_tags.py::TestTagFiltering::test_get_tags_sort_by_usage -v
```

---

## Manual Verification Script

1. Start backend: `cd backend && uv run uvicorn app.main:app --reload --port 8080`
2. Start frontend: `cd frontend && npm run dev`
3. Login via Clerk
4. Navigate to Settings > Tags
5. Verify:
   - [ ] List loads with tags
   - [ ] Search filters tags by name
   - [ ] Sort dropdown works (Name, Usage, Last Used)
   - [ ] "Show unused only" toggle works
   - [ ] Create new tag works → appears immediately
   - [ ] Color picker works → persists on refresh
   - [ ] Delete works → tag disappears
6. Record results in this section
