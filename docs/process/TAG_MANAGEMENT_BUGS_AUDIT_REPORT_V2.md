# Tag Management Bugs V2 - Audit Report

**Date:** 2025-12-29  
**Status:** Investigation Complete

---

## Executive Summary

| Bug | Status | Root Cause Layer |
|-----|--------|------------------|
| 1. Rename not propagating | **Confirmed** | Backend + Frontend |
| 2. Color not propagating | **Confirmed** | Backend + Frontend |
| 3. UNUSED shown incorrectly | **Confirmed** | Backend |
| 4. Delete fails but works | **Confirmed** | Frontend |
| 5. Tags disappear on refresh | **Needs Info** | Frontend (likely) |
| 6. Show Unused works | **Confirmed** | Working correctly |

**Critical Finding:** Items store tags as `list[str]` (tag names) instead of using `item_tags` junction table with tag IDs. This is the root cause for bugs 1, 2, and 3.

---

## Bug 1: Rename Not Propagating to Items

### Repro Steps
1. Create item with tag "Work"
2. Go to Settings > Tags > Rename "Work" to "Office"
3. View item - still shows "Work"

### Expected vs Actual
- **Expected:** Item shows "Office" (new name)
- **Actual:** Item shows "Work" (old name)

### Evidence

**Backend Schema (ItemResponse):**
```python
# backend/app/api/schemas/items.py:21
tags: list[str]  # ← Tag names as strings, not objects!
```

**Item Entity stores tags as strings:**
```python
# backend/app/domain/entities/item.py
tags: list[str] = field(default_factory=list)
```

**UpdateItemUseCase just stores tag names:**
```python
# backend/app/application/items/update_item.py:35
item.confirm(tags=input.tags)  # ← tags are strings, not IDs
# Line 48:
item.tags = input.tags  # ← Just stores string[]
```

**Frontend displays tag name directly:**
```tsx
// frontend/src/components/shared/ItemCard.tsx
{tags.slice(0, 3).map((tag) => (
    <ColoredTagBadge key={tag} name={tag} />  // ← Uses string name
))}
```

### Root Cause
Items store tag names as denormalized `list[str]` in the item entity. Renaming a tag updates the `tags` table but NOT the stored strings in items. The data model docs specify `item_tags` junction table, but it's **not being used**.

### Fix Options

**Option A (Recommended): Migrate to item_tags junction table**
1. Create item_tags table (already in schema)
2. Modify item entity to use tag IDs
3. Update confirm/edit flows to create item_tags associations
4. Item API returns joined tag objects
- **Tradeoff:** Significant refactor, but correct normalization

**Option B: Rewrite tags on rename**
1. When renaming tag X→Y, update all items with X in their tags array
2. Add `findByTag` repository method
- **Tradeoff:** O(n) update, doesn't solve color propagation

---

## Bug 2: Color Not Propagating to Items

### Repro Steps
1. Create item with tag "Design"
2. Set "Design" color to red in Settings > Tags
3. View item - tag badge is gray

### Expected vs Actual
- **Expected:** Tag badge shows red color
- **Actual:** Tag badge shows default gray

### Evidence

**ColoredTagBadge lookup:**
```tsx
// frontend/src/components/shared/ColoredTagBadge.tsx:15-20
const { tags } = useAppContext();
const tagObject = tags?.find(t => t.name.toLowerCase() === name.toLowerCase());
const tagColor = tagObject?.color || DEFAULT_COLOR;
```

**AppContext initializes empty, fetches async:**
```tsx
// frontend/src/lib/store/AppContext.tsx:62
const [tags, setTags] = useState<Tag[]>([]);
// Line 121-139: API fetch happens after mount
```

**Problem:** ColoredTagBadge looks up tag by name from AppContext, but:
1. AppContext may not have fetched yet (race)
2. Item tags are strings, lookup relies on name match
3. If tag was renamed, old name won't find the new tag record

### Root Cause
Same as Bug 1 - items store tag names, not IDs. ColoredTagBadge does name lookup which:
- Fails if AppContext not loaded
- Fails if tag was renamed (name mismatch)

### Fix Options
Same as Bug 1 - requires tag normalization via item_tags table. Item API should return tag objects with id, name, color.

---

## Bug 3: UNUSED Shown Incorrectly

### Repro Steps
1. Create item with tag "Project"
2. Confirm item to library
3. Go to Settings > Tags
4. "Project" shows usageCount=0 (UNUSED)

### Expected vs Actual
- **Expected:** usageCount=1
- **Actual:** usageCount=0

### Evidence

**Tags created with usage_count=0:**
```python
# backend/app/api/v1/tags.py:100
usage_count=0,  # ← Always 0 on create
```

**get_or_create also sets 0:**
```python
# backend/app/infrastructure/persistence/repositories/tag_repository_impl.py:139
usage_count=0,  # ← Never incremented
```

**UpdateItemUseCase doesn't update tag usage:**
```python
# backend/app/application/items/update_item.py:35
item.confirm(tags=input.tags)
# ← No tag repository call, no usage_count increment
```

**No item_tags associations created:**
The junction table `item_tags` is defined in data_model_v1.md but never populated. Items store tags as string array directly.

### Root Cause
`usage_count` is stored in tags table but **never incremented/decremented**:
- Not updated on item confirm (tags are just strings)
- Not updated on tag removal
- No item_tags associations exist to count

### Fix Options

**Option A (With junction table):**
- When confirming item, create item_tags rows
- Increment usage_count for each tag
- Compute on read: `SELECT COUNT(*) FROM item_tags WHERE tag_id = ?`

**Option B (Without junction table):**
- On confirm, increment usage_count via tag repository
- On edit (tag removed), decrement
- Requires tracking add/remove deltas

---

## Bug 4: Delete Fails But Works

### Repro Steps
1. Go to Settings > Tags
2. Click Actions > Delete on any tag
3. Toast shows "Failed to delete tag"
4. Refresh page - tag is gone

### Expected vs Actual
- **Expected:** Toast shows success, tag disappears
- **Actual:** Toast shows failure, but delete succeeded

### Evidence

**Backend returns 204 No Content:**
```python
# backend/app/api/v1/tags.py
@router.delete("/{tag_id}", status_code=204)
async def delete_tag(...):
    ...
    # Returns no body
```

**Frontend fetch always calls .json():**
```typescript
// frontend/src/lib/api/client.ts:207
return response.json() as Promise<T>;  // ← Fails on 204!
```

**deleteTag expects void:**
```typescript
// frontend/src/lib/api/client.ts:361-364
async deleteTag(id: string): Promise<void> {
    await this.fetch<void>(`/api/v1/tags/${id}`, { method: 'DELETE' });
}
```

### Root Cause
`fetch<T>()` helper always calls `response.json()` on success (line 207). For 204 No Content, there's no body, so JSON parsing throws an error. The DELETE actually succeeded on the backend, but the frontend catches the parse error as failure.

### Fix Options

**Option A (Recommended):**
```typescript
// Handle 204 No Content
if (response.status === 204) {
    return undefined as T;
}
return response.json() as Promise<T>;
```

**Option B:**
- Use DELETE endpoint that returns 200 with body
- Less RESTful but avoids client change

---

## Bug 5: Tags Disappear on Refresh

### Repro Steps
1. Go to Settings > Tags (shows tags)
2. Refresh page rapidly multiple times
3. Sometimes shows empty list, then tags reappear

### Expected vs Actual
- **Expected:** Always shows tags or loading state
- **Actual:** Intermittently shows empty list

### Evidence (Likely causes)

**useTags returns empty before API loaded:**
```typescript
// frontend/src/lib/hooks/useTags.ts:54-56
if (!isUsingRealApi) {
    return { tags: [], total: 0 };  // ← Empty if not real API
}
```

**Debounce causes empty state:**
```typescript
// frontend/src/app/settings/tags/page.tsx:49
const debouncedSearchQuery = useDebounce(searchQuery, 300);
// ← On mount, debounce hasn't settled yet
```

**TanStack Query staleTime:**
```typescript
// frontend/src/lib/hooks/useTags.ts:61
staleTime: 30000,  // ← 30 seconds
```

### Root Cause (Likely)
Multiple possible causes:
1. Race between initial render and API response
2. Query key changes triggering refetch
3. `hasInitiallyLoaded` may not prevent all cases
4. Auth token delay causing 401 → empty fallback

### Fix Options

**Option A:** Keep previous data during refetch
```typescript
placeholderData: (prev) => prev,
```

**Option B:** Show skeleton during any loading state
- Distinguish between "no tags" vs "loading"

---

## Bug 6: Show Unused Toggle Works ✅

### Verification
```typescript
// frontend/src/lib/hooks/useTags.ts
params passed to API: { unused: showUnused || undefined }

// backend/app/infrastructure/persistence/repositories/tag_repository_impl.py:73
if unused is True:
    stmt = stmt.where(TagModel.usage_count == 0)
```

Filter is correctly implemented. **Keep this working.**

---

## Contract Mismatch Summary

| Area | Backend | Frontend | Gap |
|------|---------|----------|-----|
| Item tags | `list[str]` (names) | Expects joinable tags | Items should store tag IDs |
| Delete response | 204 No Content | Expects JSON | Handle 204 specially |
| Tag objects | Full object with color | Lookup by name | Should receive tag objects in item |
| usage_count | Stored, never updated | Displayed | Needs increment/decrement logic |

---

## Recommended Fix Path

1. **Fix Bug 4 first** (Quick win: 204 handling)
2. **Design item_tags migration** (Required for bugs 1, 2, 3)
3. **Implement item_tags usage** (Confirm creates associations)
4. **Update item API** (Return tag objects, not strings)
5. **Update usage_count** (Increment/decrement on associations)
6. **Frontend adaptation** (Use tag objects from item)
