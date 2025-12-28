# Phase 3: Library + Tag Management

> Created: 2025-12-28

## Scope

### In Scope
- **Slice 3.1**: Library API + Frontend (cursor pagination, timeline grouping)
- **Slice 3.2**: Tags List + Create (GET /tags, POST /tags, filters)
- **Slice 3.3**: Tags Rename/Delete (PATCH /tags/:id, DELETE /tags/:id)
- Items ↔ Tags consistency (confirm flow upserts tags)

### Out of Scope
- Search (Phase 4)
- Tag merge (optional, if time permits)
- UI redesign

---

## Plan Checklist

### Slice 3.1 — Library API + Frontend

**Backend:**
- [ ] Create `library.py` router with GET /library endpoint
- [ ] Implement cursor pagination (confirmed_at DESC, id DESC)
- [ ] Return items with tags[] as string array
- [ ] Add integration tests (pagination, invalid cursor, auth)

**Frontend:**
- [ ] Create useLibrary hook with TanStack Query
- [ ] Replace AppContext mock with real API
- [ ] Implement loading/empty/error states
- [ ] Keep timeline grouping (client-side)

---

### Slice 3.2 — Tags List + Create

**Backend:**
- [ ] Create `tags.py` router
- [ ] GET /tags with query, sort, unused, cursor, limit params
- [ ] POST /tags with name validation + duplicate check
- [ ] Tag entity + TagModel (if not exists)
- [ ] Add integration tests

**Frontend:**
- [ ] Create useTags hook
- [ ] Wire settings/tags page to real API
- [ ] Wire search input, sort dropdown, unused toggle
- [ ] Wire Create Tag modal

---

### Slice 3.3 — Tags Rename/Delete

**Backend:**
- [ ] PATCH /tags/:id (rename with duplicate check)
- [ ] DELETE /tags/:id (cascade item_tags)
- [ ] Add integration tests

**Frontend:**
- [ ] Wire Rename modal
- [ ] Wire Delete confirm dialog

---

### Cross-cutting: Items ↔ Tags

- [ ] Update Items confirm to upsert tags
- [ ] Maintain item_tags associations
- [ ] Update usage_count/last_used on tag operations

---

## Progress Checklist

- [x] Slice 3.1 Backend (GET /library, 6 tests)
- [x] Slice 3.1 Frontend (useLibrary, library page)
- [x] Slice 3.2 Backend (GET/POST /tags, 11 tests)
- [x] Slice 3.2 Frontend (useTags, tags page)
- [x] Slice 3.3 Backend (PATCH/DELETE in 3.2)
- [x] Slice 3.3 Frontend (useTags methods)
- [x] Documentation updates

---

## Decisions

| Decision | Choice |
|----------|--------|
| Library ordering | (confirmed_at DESC, id DESC) for stable cursor |
| Cursor encoding | Base64 JSON: {confirmedAt, id} |
| Tag uniqueness | Case-insensitive per user (name_lower) |
| Tag normalization | Trim whitespace, preserve case |
| usageCount | Computed from item_tags count |
| Items confirm | Upserts tags by normalized name |

---

## How to Run

### Backend
```bash
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8080
```

### Frontend
```bash
cd frontend
npm run dev
```

---

## How to Test

### Backend Integration Tests
```bash
cd backend
uv run pytest -v
uv run pytest tests/test_library.py -v
uv run pytest tests/test_tags.py -v
```

---

## Manual Verification

### Slice 3.1 — Library
1. Sign in → Create item → Confirm
2. Go to /library → Item appears
3. Scroll/paginate → More items load
4. Click item → Detail modal opens

### Slice 3.2 — Tags List + Create
1. Go to /settings/tags
2. Search → Filters list
3. Toggle unused → Filters
4. Click "Create New Tag" → Create → Appears in list

### Slice 3.3 — Tags Rename/Delete
1. Click tag Actions → Rename → Save → Name changes
2. Click tag Actions → Delete → Confirm → Removed
