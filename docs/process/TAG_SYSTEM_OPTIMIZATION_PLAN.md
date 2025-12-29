# Tag System Optimization Plan

> Based on TAG_SYSTEM_REVIEW_REPORT.md
> Target: Address all 4 checkpoints systematically

---

## Plan Overview

| Slice | Focus | Priority | Complexity |
|-------|-------|----------|------------|
| **A** | Unify TagPicker with debounced backend search | 🔴 High | Medium |
| **B** | Backend upsert semantics (same-name → same id) | 🔴 High | Low |
| **C** | AppContext → Real API tags fetch | 🟡 Medium | Low |
| **D** | Tag colors (schema + API + UI) | 🟢 Low | Medium |

---

## Slice A: Debounced Backend Tag Search

### Scope
Modify `TagPicker` to call `GET /tags?q=...` with debounce when user types, instead of client-side filtering.

### Files to Change

| File | Change |
|------|--------|
| `frontend/src/components/shared/TagPicker.tsx` | Add debounced search call |
| `frontend/src/lib/hooks/useTagSearch.ts` | **NEW** - Dedicated hook for tag search with debounce |
| `frontend/src/lib/api/client.ts` | Already supports `getTags({q})` ✅ |

### Implementation Details

1. **Create `useTagSearch` hook:**
```typescript
// useTagSearch.ts
export function useTagSearch(query: string, options?: { debounceMs?: number }) {
  const debouncedQuery = useDebounce(query, options?.debounceMs ?? 300);
  
  return useQuery({
    queryKey: ['tags', 'search', debouncedQuery],
    queryFn: () => apiClient.getTags({ q: debouncedQuery, limit: 20 }),
    enabled: debouncedQuery.length > 0,
    staleTime: 60000,
  });
}
```

2. **Update TagPicker:**
- Add `useTagSearch(searchQuery)` 
- Show loading state during fetch
- Cancel stale requests via TanStack Query's built-in behavior
- Fall back to `availableTags` prop when empty query

### Acceptance Criteria
- [ ] Typing in tag search calls backend after 300ms debounce
- [ ] Loading spinner shown during fetch
- [ ] Empty/error states handled
- [ ] Works in: InsightSummaryModal, ItemDetailModal, (future) inline tag add

### Test Plan
- **Frontend**: Manual test typing speed, verify single request per pause
- **Backend**: Existing `GET /tags?q=` tests sufficient

---

## Slice B: Backend Upsert Semantics

### Scope
Change `POST /tags` behavior from 409 conflict to upsert: return existing tag if name matches.

### Decision Required

| Option | Behavior | Pros | Cons |
|--------|----------|------|------|
| **A: Upsert (Recommended)** | Return existing tag with 200/201 | Simple, idempotent | May mask accidental duplicates |
| **B: 409 with existingTagId** | Return 409 + `details.existingTagId` | Explicit | Frontend must handle conflict |

**Recommendation:** Option A (Upsert) for simplicity.

### Files to Change

| File | Change |
|------|--------|
| `backend/app/api/v1/tags.py` | Modify `create_tag` to return existing if found |
| `docs/architecture/API_CONTRACT_V1.md` | Update POST /tags behavior docs |

### Implementation

```python
# tags.py - create_tag endpoint
existing = await tag_repo.get_by_name(name, current_user.id)
if existing:
    # Upsert: return existing tag instead of 409
    return tag_to_response(existing)

# Otherwise create new tag...
```

### Response Change

```json
// POST /tags with existing name
{
  "id": "existing-tag-id",  // Returns existing, not new
  "name": "Design",
  "usageCount": 5,
  ...
}
```

**Status Code:** `200 OK` if existing, `201 Created` if new.

### Acceptance Criteria
- [ ] POST /tags with existing name returns the existing tag
- [ ] Response includes correct status code (200 vs 201)
- [ ] API contract doc updated
- [ ] No duplicate tags possible per user

### Test Plan
- **Backend Integration:**
  - `test_create_tag_upsert_existing` - POST same name twice returns same ID
  - `test_create_tag_case_insensitive_upsert` - "Design" and "design" return same tag
- **Migration**: None needed

---

## Slice C: AppContext Fetches Real Tags

### Scope
Replace `mockTags` fixture in AppContext with real API fetch.

### Files to Change

| File | Change |
|------|--------|
| `frontend/src/lib/store/AppContext.tsx` | Fetch tags from API on mount |
| `frontend/src/lib/fixtures/items.ts` | Keep for fallback/dev mode |

### Implementation

```typescript
// AppContext.tsx
const [tags, setTags] = useState<Tag[]>(mockTags);

useEffect(() => {
  if (isUsingRealApi) {
    apiClient.getTags({ limit: 100 }).then(res => {
      setTags(res.tags.map(parseTag));
    }).catch(() => {
      // Fallback to mock tags
    });
  }
}, []);
```

### Acceptance Criteria
- [ ] Tags fetched from API when `USE_REAL_API=true`
- [ ] Fallback to mockTags on error or dev mode
- [ ] TagPicker shows real user tags

### Test Plan
- **Manual**: Verify tags API called on app load
- **Integration**: NA (existing useTags hook tests cover API)

---

## Slice D: Tag Colors (V1)

### Scope
Add color support to tags with minimal V1 implementation.

### Schema Migration

```sql
-- Migration: add_tag_color_column
ALTER TABLE tags ADD COLUMN color VARCHAR(7) DEFAULT '#6B7280';

-- Default is neutral gray
-- Format: hex color code
```

### Palette Options (V1)

```typescript
const TAG_COLORS = {
  gray: '#6B7280',
  red: '#EF4444',
  orange: '#F97316',
  amber: '#F59E0B',
  green: '#22C55E',
  teal: '#14B8A6',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
};
```

### Files to Change

| File | Change |
|------|--------|
| `backend/app/infrastructure/persistence/models/tag_model.py` | Add `color` column |
| `backend/alembic/versions/xxx_add_tag_color.py` | **NEW** - Migration |
| `backend/app/domain/entities/tag.py` | Add `color` field |
| `backend/app/api/schemas/tags.py` | Add `color` to TagResponse |
| `backend/app/api/v1/tags.py` | Include color in PATCH endpoint |
| `frontend/src/lib/types/index.ts` | Add `color?: string` to Tag type |
| `frontend/src/lib/api/client.ts` | Add color to TagResponse |
| `frontend/src/components/ui/badge.tsx` | Support dynamic background color |
| Various modals/components | Render tag badges with color |

### API Changes

**GET /tags Response:**
```json
{
  "id": "tag-1",
  "name": "Design",
  "color": "#8B5CF6",
  ...
}
```

**PATCH /tags/:id Request:**
```json
{
  "name": "Design",      // optional
  "color": "#EF4444"     // optional
}
```

### UI Rendering

```tsx
// Badge with dynamic color
<Badge style={{ backgroundColor: tag.color || '#6B7280' }}>
  {tag.name}
</Badge>
```

### Acceptance Criteria
- [ ] Tags have color column with default gray
- [ ] API returns color in tag responses
- [ ] PATCH /tags/:id accepts color update
- [ ] Tag badges display color in all views
- [ ] Settings tag management allows color selection

### Test Plan
- **Backend Integration:**
  - `test_create_tag_has_default_color`
  - `test_update_tag_color`
- **Frontend**: Visual verification of colored badges
- **Migration**: Run `alembic upgrade head`, existing tags get default color

---

## Rollout Strategy

```
Phase 1: Slice B + C (Low risk, high value)
├── Backend upsert semantics
├── AppContext real tags fetch
└── No frontend breaking changes

Phase 2: Slice A (Medium risk)
├── TagPicker debounced search
├── Feature flag: TAG_SEARCH_LIVE=true
└── Gradual rollout

Phase 3: Slice D (Additive feature)
├── Color column migration
├── API + UI updates
└── No breaking changes
```

### Safety Checks
- [ ] Each slice has own PR
- [ ] Backend changes deployed before frontend
- [ ] Feature flags for gradual rollout
- [ ] Rollback plan: revert migration + API changes

---

## Dependencies

| Slice | Depends On |
|-------|------------|
| A | C (needs real tags in context first) |
| B | None |
| C | None |
| D | None |

**Recommended Order:** B → C → A → D

---

## Open Questions

1. **Upsert vs 409:** Confirm upsert is preferred over 409 with conflict resolution
2. **Color picker UI:** Palette dropdown vs color wheel?
3. **Default color assignment:** Random from palette or fixed gray?
4. **Tag colors in search?** Should search results show colored tags?
