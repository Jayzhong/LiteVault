# Phase 4: Search V1 Implementation (pg_trgm + Lexical)

> Backend endpoint, integration tests, frontend wiring, and E2E verification  
> Builds on design phase completed in PHASE_4_SEARCH_V1_DESIGN.md

---

## 1. Overview

### Goal
Implement GET /search endpoint with pg_trgm trigram indexes for fast lexical search.

### Prerequisites (from Design Phase)
- [x] API Contract updated (GET /search defined)
- [x] Use Cases documented (SearchLibrary V1)  
- [x] Data Model updated (pg_trgm indexes documented)
- [x] UI Spec updated (search page V1 behavior)
- [x] DB Migration created (`005_add_search_indexes.py`)
- [x] Frontend prototype updated (no synthesized answer)

---

## 2. Scope

### In Scope
- Apply pg_trgm DB migration
- Implement GET /search backend endpoint
- Add comprehensive integration tests
- Wire frontend to real API
- End-to-end verification

### Out of Scope  
- Semantic/vector search (V2)
- LLM answer synthesis (V2)
- Result highlighting (V2)

---

## 3. Implementation Slices

### Slice 4.2: Apply DB Migration
- [x] Migration exists: `005_add_search_indexes.py`
- [x] Apply migration: `uv run alembic upgrade head`
- [x] Verify pg_trgm extension enabled
- [x] Verify GIN indexes created on items table

### Slice 4.3: Backend Search Endpoint
- [x] Create `backend/app/api/v1/search.py`
- [x] Create search schemas in `backend/app/api/schemas/search.py`
- [x] Register search router in main app
- [x] Implement query parsing (# → tag-only, else combined)
- [x] Implement tag-only search query
- [x] Implement combined search query  
- [x] Handle cursor pagination
- [x] Add integration tests (15 tests)

### Slice 4.4: Frontend Integration
- [x] Update API client with search method
- [x] Wire Search page to real endpoint
- [x] Handle loading/error/empty states
- [ ] Test mode indicator display

### Slice 4.5: E2E Verification
- [ ] Tag-only search returns correct results
- [ ] Combined search returns correct results
- [ ] Pagination works correctly
- [ ] Empty states display properly
- [ ] Error handling works

---

## 4. Technical Decisions

### Query Parsing
```python
def parse_search_mode(query: str) -> tuple[str, str]:
    """Parse query into (mode, search_term)."""
    trimmed = query.strip()
    if trimmed.startswith("#"):
        term = trimmed[1:].strip()
        if not term:
            raise ValidationException("Tag search term cannot be empty")
        return ("tag_only", term)
    if not trimmed:
        return ("combined", "")  # Empty returns empty results
    return ("combined", trimmed)
```

### Search SQL Patterns

**Tag-only mode:**
```sql
SELECT DISTINCT items.* 
FROM items 
JOIN item_tags ON items.id = item_tags.item_id
JOIN tags ON item_tags.tag_id = tags.id
WHERE items.user_id = :user_id 
  AND items.status = 'ARCHIVED'
  AND tags.name_lower ILIKE '%term%'
ORDER BY items.confirmed_at DESC, items.id DESC
```

**Combined mode:**
```sql
SELECT DISTINCT items.* 
FROM items 
LEFT JOIN item_tags ON items.id = item_tags.item_id
LEFT JOIN tags ON item_tags.tag_id = tags.id
WHERE items.user_id = :user_id 
  AND items.status = 'ARCHIVED'
  AND (
    items.title ILIKE '%term%' 
    OR items.summary ILIKE '%term%' 
    OR items.raw_text ILIKE '%term%'
    OR tags.name_lower ILIKE '%term%'
  )
ORDER BY items.confirmed_at DESC, items.id DESC
```

### Cursor Pagination
Uses same pattern as library.py:
- Cursor encodes: `{confirmedAt, id}`
- Filter: `(confirmed_at < cursor_confirmed_at) OR (confirmed_at = cursor_confirmed_at AND id < cursor_id)`

---

## 5. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `backend/app/api/v1/search.py` | CREATE | Search endpoint |
| `backend/app/api/schemas/search.py` | CREATE | Request/response schemas |
| `backend/app/api/v1/__init__.py` | MODIFY | Register search router |
| `backend/tests/test_search.py` | CREATE | Integration tests |
| `frontend/src/lib/api/client.ts` | MODIFY | Add search API method |
| `frontend/src/app/search/page.tsx` | MODIFY | Wire to real API |

---

## 6. How to Run

### Apply Migration
```bash
cd backend
uv run alembic upgrade head
```

### Run Tests
```bash
cd backend
uv run pytest tests/test_search.py -v
```

### Start Backend
```bash
cd backend
uv run uvicorn app.main:app --reload --port 8080
```

### Start Frontend
```bash
cd frontend
npm run dev
```

---

## 7. Manual Verification Checklist

- [ ] `GET /search?q=meeting` returns combined results
- [ ] `GET /search?q=%23work` returns tag-only results  
- [ ] Empty query `GET /search?q=` returns empty list
- [ ] `GET /search?q=%23` returns 400 VALIDATION_ERROR
- [ ] Invalid cursor returns 400 INVALID_CURSOR  
- [ ] Unauthenticated request returns 401
- [ ] Results ordered by confirmed_at DESC
- [ ] Pagination cursor works correctly
- [ ] Frontend displays mode indicator
- [ ] Frontend shows hint for tag search

---

## 8. Progress Log

| Time | Action | Status |
|------|--------|--------|
| Start | Created implementation plan | ✓ |
| +5min | Applied pg_trgm migration | ✓ |
| +10min | Created search.py endpoint + schemas | ✓ |
| +15min | Registered router, 15/15 search tests pass | ✓ |
| +20min | All 84 backend tests pass | ✓ |
| +25min | Added search() to API client | ✓ |
| +30min | Wired Search page to real API | ✓ |
| +35min | Fixed V2 microcopy keys, build passes | ✓ |

---

*Created: 2025-12-28*
*Status: Complete*
