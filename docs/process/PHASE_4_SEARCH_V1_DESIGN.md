# Phase 4: Search V1 Design

> Minimal Search (No LLM, No Semantic)
> Design + Schema + Prototype only — no full backend implementation

---

## 1. Overview

### Goal
Implement Search V1 as a simple, deterministic search with two modes:
- **Mode A (Tag-only)**: Query starts with `#` → match tags only
- **Mode B (Combined)**: Otherwise → match text (title/summary/rawText) + tags

### Key Points
- No LLM usage in Search V1
- No semantic/vector search
- Results ordered by recency (`confirmed_at DESC, id DESC`)
- Cursor-based pagination
- Search V2 (semantic) is documented but deferred

---

## 2. Scope

### In Scope
- [x] Update API Contract for Search V1 (new `GET /search` or updated `POST /search`)
- [x] Update use_cases_v1.md with Search V1 use case
- [x] Update data_model_v1.md with index strategy for text search
- [x] Update UI_INTERACTION_SPEC.md for Search V1 behavior
- [x] Update MICROCOPY.md with new search-related strings
- [x] Create DB migration for text search indexes (if needed)
- [x] Update frontend Search page to reflect V1 rules (no synthesized answer)

### Out of Scope
- Full backend search endpoint implementation
- Semantic/vector search (Search V2)
- LLM answer synthesis
- Evidence scoring
- Search analytics

### Assumptions
- Search V1 operates only on `ARCHIVED` items (confirmed items in library)
- Tag matching is case-insensitive
- Text matching uses ILIKE (case-insensitive pattern matching)
- Empty query returns empty results (not an error)

---

## 3. Plan Checklist

### A) Process Doc
- [x] Create `docs/process/PHASE_4_SEARCH_V1_DESIGN.md` (this file)

### B) Architecture Docs
- [x] `docs/architecture/API_CONTRACT_V1.md` — Update Search section
- [x] `docs/architecture/use_cases_v1.md` — Add Search V1 use case
- [x] `docs/architecture/data_model_v1.md` — Add search index strategy

### C) Design Docs
- [x] `docs/design/UI_INTERACTION_SPEC.md` — Update Search page spec
- [x] `docs/design/MICROCOPY.md` — Add Search V1 microcopy keys

### D) Database Migration
- [x] Evaluate if `pg_trgm` extension is needed
- [x] Add migration for text search indexes (if needed)

### E) Frontend Prototype
- [x] Update Search page to remove synthesized answer UI
- [x] Add tag-only mode hint
- [x] Update empty/loading/error states

---

## 4. Progress Checklist

- [x] API Contract updated
- [x] Use Cases updated
- [x] Data Model updated
- [x] UI Spec updated
- [x] Microcopy updated
- [x] DB migration created (if needed)
- [x] Frontend prototype updated
- [ ] Manual verification completed

---

## 5. Technical Decisions

### 5.1 Query Parsing Rules

| Query | Mode | Behavior |
|-------|------|----------|
| `#work` | Tag-only | Match items with tag containing "work" |
| `#ai agent` | Tag-only | Match items with tag containing "ai agent" |
| `meeting notes` | Combined | Match items where title/summary/rawText OR tag contains "meeting notes" |
| (empty) | N/A | Return empty results |

**Parsing Logic:**
```
if query.startsWith("#"):
    mode = "tag_only"
    search_term = query[1:].strip()  # Remove "#"
else:
    mode = "combined"
    search_term = query.strip()
```

### 5.2 Search Behavior

**Tag-only mode (`#xxx`):**
- Match `tags.name_lower ILIKE '%xxx%'`
- Do NOT match item text fields

**Combined mode:**
- Match: `item.title ILIKE '%xxx%' OR item.summary ILIKE '%xxx%' OR item.raw_text ILIKE '%xxx%'`
- OR: `tags.name_lower ILIKE '%xxx%'`

### 5.3 Ordering

All results ordered by:
1. `confirmed_at DESC` (most recent first)
2. `id DESC` (tiebreaker for stable ordering)

### 5.4 Pagination

- Cursor-based (consistent with Library endpoint)
- Cursor contains: `{ confirmed_at, id }`
- Default limit: 20, max: 100

### 5.5 API Design Decision

**Option A: Update `GET /library` with enhanced `q` parameter**
- Pros: Reuses existing endpoint, simpler
- Cons: Conflates library browsing with searching

**Option B: New `GET /search` endpoint (recommended)**
- Pros: Clear separation of concerns, allows mode parameter
- Cons: Additional endpoint

**Decision: Option B** — Create `GET /search` endpoint distinct from semantic `POST /search`

### 5.6 Index Strategy Options

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A. Simple ILIKE | No additional indexes | Zero setup | Slow on large datasets |
| B. pg_trgm extension | Trigram indexes | Fast ILIKE/similarity | Requires extension |
| C. Full-text search (tsvector) | Postgres FTS | Ranking, stemming | Complex setup, overkill for V1 |

**Decision: Option B (pg_trgm)**
- Use PostgreSQL `pg_trgm` extension for trigram-based indexes
- Create GIN indexes on `title`, `summary`, `raw_text` columns
- Enables fast ILIKE pattern matching
- Document path to Option C for Search V2 (semantic)

**Required Migration:**
```sql
-- Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram indexes for search
CREATE INDEX idx_items_title_trgm ON items USING GIN (title gin_trgm_ops);
CREATE INDEX idx_items_summary_trgm ON items USING GIN (summary gin_trgm_ops);
CREATE INDEX idx_items_raw_text_trgm ON items USING GIN (raw_text gin_trgm_ops);
```

---

## 6. API Contract Changes

### New: `GET /search`

```
GET /api/v1/search?q=meeting+notes&cursor=xxx&limit=20

Headers:
  Authorization: Bearer <token>

Query Parameters:
  q       - Search query (required, non-empty after trimming)
  cursor  - Pagination cursor (optional)
  limit   - Results per page (default: 20, max: 100)

Response 200 OK:
{
  "items": [
    {
      "id": "uuid",
      "title": "Meeting Notes from Sprint Review",
      "summary": "Discussed Q1 roadmap...",
      "tags": ["meetings", "product"],
      "sourceType": "NOTE",
      "confirmedAt": "2025-12-28T10:00:00Z"
    }
  ],
  "mode": "combined" | "tag_only",
  "pagination": {
    "cursor": "xxx",
    "hasMore": true
  },
  "total": 42
}

Error Cases:
  400 VALIDATION_ERROR - Query empty after trimming
  400 INVALID_CURSOR - Malformed cursor
  401 UNAUTHORIZED - Missing/invalid auth
```

### Existing `POST /search` (Semantic — V2 Placeholder)

Mark as **NOT IMPLEMENTED** in API Contract. Future endpoint for LLM-based search.

---

## 7. UI Changes

### Search Page Behavior (V1)

| State | UI |
|-------|----|
| Empty (no query) | Hero greeting + search input |
| Searching | Loading skeleton (simple list) |
| Results | Item cards list (no synthesized answer) |
| No results | Empty state message |
| Error | Error banner with retry |

### Removed for V1
- ❌ "Synthesized Answer" section
- ❌ "Evidence" section with source cards
- ❌ Feedback buttons (Helpful / Not helpful)

### Added for V1
- ✅ Search mode hint: "Use #tag to search tags only"
- ✅ Mode indicator in results: "Showing tag matches" / "Showing all matches"

---

## 8. Search V2 Roadmap (Semantic Search)

> Documented for future reference — NOT implemented in this phase

### V2 Features
- Semantic similarity using embeddings
- LLM-synthesized answer
- Evidence cards with relevance scores
- Feedback collection (helpful/not helpful)

### API Changes for V2
```
POST /api/v1/search
{
  "query": "How do I organize my design references?",
  "mode": "semantic"  // "lexical" | "semantic" | "hybrid"
}

Response:
{
  "answer": "Based on your notes...",
  "evidence": [...],
  "totalSources": 3
}
```

### Infrastructure Required
- Vector database (pgvector extension or external)
- Embedding model (text-embedding-ada-002 or similar)
- LLM for answer synthesis (existing LiteLLM infra)

---

## 9. Risks & Open Questions

| Risk/Question | Mitigation/Decision |
|---------------|---------------------|
| ILIKE performance on large datasets | Accept for V1, add pg_trgm if needed |
| Partial word matching ("meet" → "meeting") | ILIKE `%meet%` handles this |
| Tag name with spaces | Parse entire string after `#` as tag query |
| Multiple search terms | V1: treat as single phrase. V2: tokenize |
| Highlight matches in results | Defer to V2 |

---

## 10. Verification Checklist

### Manual Tests (after implementation)
- [ ] Query `#work` → only returns items with "work" tag
- [ ] Query `meeting` → returns items with "meeting" in title/summary/rawText OR tags
- [ ] Empty query → shows empty state, not error
- [ ] Query with no results → shows "No matches found"
- [ ] Pagination works correctly
- [ ] UI shows correct mode indicator
- [ ] "Synthesized Answer" section is NOT present
- [ ] Search input shows hint for tag mode

---

## 11. Files to Update

| File | Change Type | Priority |
|------|-------------|----------|
| `docs/architecture/API_CONTRACT_V1.md` | Update | High |
| `docs/architecture/use_cases_v1.md` | Update | High |
| `docs/architecture/data_model_v1.md` | Update | Medium |
| `docs/design/UI_INTERACTION_SPEC.md` | Update | High |
| `docs/design/MICROCOPY.md` | Update | High |
| `frontend/src/app/search/page.tsx` | Update | Medium |
| `frontend/src/components/domain/search/*` | Update | Medium |

---

*Created: 2025-12-28*
*Status: Done (Design Phase Complete)*
