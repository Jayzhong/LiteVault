# Tag System Review Report

> Audit Date: 2025-12-29
> Auditor: Antigravity AI

---

## Executive Summary

| Checkpoint | Status | Summary |
|------------|--------|---------|
| **(1) Add Tag Search: Backend + Debounce** | ⚠️ PARTIAL | TagPicker uses **client-side filtering only**. No backend `GET /tags?q=` call. No debounce. |
| **(2) Settings Tag Management uses same API** | ✅ PASS | Settings page uses `useTags` hook → `apiClient.createTag()` → `POST /tags`. Same as other flows. |
| **(3) Same-name → Same id (No duplicates)** | ⚠️ PARTIAL | Backend enforces `UNIQUE(user_id, name_lower)` + 409 conflict. But frontend lacks upsert handling. |
| **(4) Tag Colors Plan** | ❌ NOT IMPLEMENTED | No `color` column in schema. No color support in API or UI. |

---

## Checkpoint Details

### (1) Add Tag Search Behavior

**Verification Scope:**
- Home Pending Review (InsightSummaryModal)
- Search result modals (ItemDetailModal)
- Library modals (ItemDetailModal)

**Evidence:**

| File | Observation |
|------|-------------|
| [TagPicker.tsx](file:///Users/jayzhong/projects/vibe_coding/gemini/LiteVault/frontend/src/components/shared/TagPicker.tsx#L53-L59) | Client-side filtering only: `allTags.filter((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))` |
| [InsightSummaryModal.tsx](file:///Users/jayzhong/projects/vibe_coding/gemini/LiteVault/frontend/src/components/shared/InsightSummaryModal.tsx#L54) | Gets `availableTags` from AppContext (`existingTags?.map((t) => t.name)`) |
| [ItemDetailModal.tsx](file:///Users/jayzhong/projects/vibe_coding/gemini/LiteVault/frontend/src/components/shared/ItemDetailModal.tsx#L52) | Same pattern - uses AppContext tags |
| [AppContext.tsx](file:///Users/jayzhong/projects/vibe_coding/gemini/LiteVault/frontend/src/lib/store/AppContext.tsx#L62) | Tags initialized from `mockTags` fixture, not fetched from API |

**API Capability (Unused):**
```typescript
// client.ts L312-324
async getTags(params?: { q?: string; ... }): Promise<TagsListResponse> {
    if (params?.q) searchParams.set('q', params.q);
    ...
}
```

**Backend Supports Query:**
```python
# tags.py L49
q: str | None = Query(None, description="Search by name"),
```

**Gaps:**
- ❌ No debounce in TagPicker
- ❌ No backend search call when user types
- ❌ No request cancellation for stale queries
- ❌ No loading/error states for tag search

---

### (2) Settings Tag Management Uses Same API

**Evidence:**

| Component | API Call | 
|-----------|----------|
| Settings `/settings/tags` page | `useTags` hook → `createMutation` → `apiClient.createTag(name)` |
| TagPicker create | Local state only: `onChange([...selectedTags, newTag])` (no API call) |

**Flows Compared:**

| Flow | API Used | Persisted? |
|------|----------|------------|
| Settings > Create Tag | `POST /tags` | ✅ Yes |
| TagPicker > "+ Create {name}" | Local state | ❌ No (only on item confirm) |
| Item Confirm with new tag | Via item's tags array | ⚡ Eventually (when item confirmed) |

**Verdict:** Settings uses proper API. TagPicker creates temporary local tags that only persist when the parent item is confirmed.

---

### (3) Same-Name Tag Guarantees Same ID

**Database Constraint:**
```python
# tag_model.py L35-37
__table_args__ = (
    Index("idx_tags_user_name_lower", "user_id", "name_lower", unique=True),
)
```

**Backend Duplicate Check:**
```python
# tags.py L77-84
existing = await tag_repo.get_by_name(name, current_user.id)
if existing:
    raise TagExistsException(f"Tag '{name}' already exists")
```

**API Response on Duplicate:**
- Returns `409 TAG_EXISTS` with `details.tagName`
- **Does NOT return existing tag ID** → Frontend cannot resolve to existing tag

**Repository Lookup:**
```python
# tag_repository_impl.py L44-53
async def get_by_name(self, name: str, user_id: str) -> Tag | None:
    ...TagModel.name_lower == name.lower().strip()
```

**Gaps:**
- ⚠️ 409 response lacks `existingTagId` field
- ⚠️ Frontend has no upsert/conflict-resolution logic
- ⚠️ When user types same tag name in different modals, they may create duplicates at confirm time

---

### (4) Tag Colors Plan

**Current State:**
- No `color` column in `tags` table
- No color in API response DTOs
- No color rendering in UI

**Schema Proposal:**
```sql
ALTER TABLE tags ADD COLUMN color VARCHAR(7) DEFAULT '#6B7280';
-- Palette-based or hex color
```

**Files Requiring Changes:**
- `tag_model.py` - add column
- `tag_repository_impl.py` - map column
- `tags.py` (API) - include in response, add PATCH support
- `TagResponse` schema - add `color` field
- Frontend `Tag` type - add `color`
- Badge components - render color

---

## Risks & Recommendations

| Risk | Impact | Recommendation |
|------|--------|----------------|
| TagPicker doesn't call backend | Missing tags for users with many tags | Implement debounced backend search |
| 409 without existing ID | Cannot resolve duplicates gracefully | Change to upsert semantics (return existing) or include `existingTagId` in 409 |
| Tags only persist on confirm | User may lose tag if they discard item | Accept as design choice OR auto-create tags |
| No tag colors | Missed product feature | Implement in Slice D |

---

## File References Summary

| Category | Key Files |
|----------|-----------|
| Frontend TagPicker | `frontend/src/components/shared/TagPicker.tsx` |
| Frontend Context | `frontend/src/lib/store/AppContext.tsx` |
| Frontend useTags | `frontend/src/lib/hooks/useTags.ts` |
| Frontend API | `frontend/src/lib/api/client.ts` |
| Backend API | `backend/app/api/v1/tags.py` |
| Backend Repository | `backend/app/infrastructure/persistence/repositories/tag_repository_impl.py` |
| Backend Model | `backend/app/infrastructure/persistence/models/tag_model.py` |
| Data Model Doc | `docs/architecture/data_model_v1.md` |
| API Contract | `docs/architecture/API_CONTRACT_V1.md` |
