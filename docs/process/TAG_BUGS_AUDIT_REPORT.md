# Tag UI Bugs - Audit Report

**Date:** 2025-12-29  
**Status:** Investigation Complete

---

## Executive Summary

| Bug | Status | Root Cause |
|-----|--------|------------|
| 1. Phantom tags | **Confirmed** | `mockTags` shown before API loads |
| 2. Create not persisting | **Confirmed** | Local-only state update, no API call |
| 3. No scroll in modal | **Likely Not Reproducible** | CSS exists but may be overridden |
| 4. Rename/Delete no effect | **Confirmed** | `handleRename` is a toast stub |
| 5. Search input loses focus | **Confirmed** | Table re-renders on each keystroke via useTags |

---

## Bug 1: Phantom Tags in TagPicker

### Repro Steps
1. Open Pending Review item → Click "Add Tag"
2. Observe tags like "Meetings", "Product", "Design" appear

### Expected vs Actual
- **Expected:** Only user-created tags from backend
- **Actual:** Mock fixture tags appear

### Code Evidence

**Root Cause:** AppContext initializes with mockTags, then fetches real tags.

```tsx
// frontend/src/lib/store/AppContext.tsx:62
const [tags, setTags] = useState<Tag[]>(mockTags);
```

```tsx
// frontend/src/lib/fixtures/items.ts:44-50
export const mockTags: Tag[] = [
    { id: 'tag-1', name: 'Meetings', usageCount: 12, ... },
    { id: 'tag-2', name: 'Product', usageCount: 8, ... },
    ...
];
```

**TagPicker combines sources:**
```tsx
// frontend/src/components/shared/TagPicker.tsx:66-72
const allTags = [
    ...new Set([
        ...searchedTags.map((t) => t.name),
        ...availableTags,  // ← From AppContext.tags (mockTags)
        ...selectedTags,
    ]),
];
```

### Root Cause Analysis
1. `AppContext` initializes `tags` with `mockTags`
2. `InsightSummaryModal` passes `existingTags` to `TagPicker` as `availableTags`
3. API fetch runs async but UI shows mockTags first
4. Even after API loads, `availableTags` prop combines with searchedTags

### Fix Options

**Option A (Recommended):** Initialize with empty array, show loading state
- Change line 62 to `useState<Tag[]>([])`
- Add loading state before API completes
- **Tradeoff:** Brief loading delay on first render

**Option B:** Remove `availableTags` prop entirely
- Use only `useTagSearch` results
- **Tradeoff:** Requires search hook to fetch on open

---

## Bug 2: Create Tag Not Persisting

### Repro Steps
1. Open TagPicker → Type new name → Click "Create X"
2. Tag appears on item but Settings > Tags doesn't show it

### Expected vs Actual
- **Expected:** Tag persists to database, Settings shows it
- **Actual:** Tag only exists in local component state

### Code Evidence

```tsx
// frontend/src/components/shared/TagPicker.tsx:99-105
const handleCreateTag = () => {
    const newTag = searchQuery.trim();
    if (newTag && !selectedTags.includes(newTag)) {
        onChange([...selectedTags, newTag]);  // Local only!
        setSearchQuery('');
    }
};
```

**Missing:** No `apiClient.createTag()` call.

### Root Cause Analysis
`handleCreateTag` only calls `onChange` which updates parent's local `selectedTags` array. The tag name is just a string, never persisted via POST /tags.

### Fix Options

**Option A (Recommended):** Call API, then update local state
```tsx
const handleCreateTag = async () => {
    const response = await apiClient.createTag(searchQuery.trim());
    onChange([...selectedTags, response.name]);
};
```

**Option B:** Use `useTags().createTag` mutation
- Requires prop drilling or hook refactor
- **Tradeoff:** More complex but proper cache invalidation

---

## Bug 3: No Scroll in Tag Modal

### Repro Steps
1. Have many tags → Open TagPicker
2. Try to scroll the tag list

### Expected vs Actual
- **Expected:** List scrolls if > 10 items
- **Actual:** (Needs verification) May or may not scroll

### Code Evidence

```tsx
// frontend/src/components/shared/TagPicker.tsx:166
<div className="max-h-40 overflow-y-auto space-y-1">
```

CSS `max-h-40` = 10rem = ~160px, `overflow-y-auto` should enable scroll.

### Root Cause Analysis
**Likely Not Reproducible** - CSS looks correct. If broken:
1. Parent container may have `overflow-hidden`
2. `PopoverContent` may constrain height

### Fix Options

**Option A:** Verify in browser, adjust if needed
- Check DevTools for computed styles

**Option B:** Increase to `max-h-60` if content is cut off

---

## Bug 4: Rename/Delete Has No Effect

### Repro Steps
1. Settings > Tags → Click Actions (⋮) on any tag
2. Click "Rename" → Nothing happens except toast
3. Click "Delete" → (Actually works)

### Expected vs Actual
- **Expected (Rename):** Modal opens to edit name
- **Actual (Rename):** Toast stub: "Rename dialog would open for X"
- **Delete:** Works correctly, calls `deleteTag`

### Code Evidence

```tsx
// frontend/src/components/domain/tags/TagsTable.tsx:42-44
const handleRename = (tag: Tag) => {
    toast.info(`Rename dialog would open for "${tag.name}"`);  // ← STUB!
};
```

```tsx
// frontend/src/components/domain/tags/TagsTable.tsx:46-52
const handleDelete = async (tag: Tag) => {
    try {
        await deleteTag(tag.id);  // ← Works correctly
        toast.success(`Tag "${tag.name}" deleted`);
    } catch {
        toast.error('Failed to delete tag');
    }
};
```

### Root Cause Analysis
`handleRename` is a placeholder stub that was never implemented. Backend PATCH /tags/:id exists and works.

### Fix Options

**Option A (Recommended):** Create RenameTagModal component
- Add modal with input + confirm/cancel
- Call `useTags().renameTag(id, newName)`

**Option B:** Inline edit in table row
- More complex UX but inline editing

---

## Bug 5: Search Input Loses Focus

### Repro Steps
1. Settings > Tags → Click in Search input
2. Type one character → Focus lost, cursor disappears

### Expected vs Actual
- **Expected:** Input retains focus while typing
- **Actual:** Focus lost after first keystroke

### Code Evidence

```tsx
// frontend/src/app/settings/tags/page.tsx:29-33
const { tags, isLoading, ... } = useTags({
    q: searchQuery || undefined,  // ← Changes on every keystroke
    ...
});
```

```tsx
// frontend/src/app/settings/tags/page.tsx:124-129
<Input
    placeholder={microcopy.tags.search.placeholder}
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="pl-10"
/>
```

### Root Cause Analysis
Each keystroke updates `searchQuery`, which changes `useTags` params, triggering query re-fetch. The component tree may be remounting due to:
1. Conditional rendering based on `isLoading` state
2. TanStack Query re-render on new query key

```tsx
// Lines 51-63 show conditional return during loading!
if (isLoading) {
    return (<div className="space-y-8">...</div>);  // ← Unmounts Input!
}
```

**This is the root cause:** During loading, entire component returns Skeleton, unmounting the Input.

### Fix Options

**Option A (Recommended):** Debounce the search query before passing to useTags
```tsx
const debouncedQuery = useDebounce(searchQuery, 300);
const { tags } = useTags({ q: debouncedQuery || undefined, ... });
```

**Option B:** Don't return loading skeleton after initial load
```tsx
const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
useEffect(() => { if (!isLoading) setHasInitiallyLoaded(true); }, [isLoading]);
if (isLoading && !hasInitiallyLoaded) { return <Skeleton />; }
```

---

## Open Questions

1. **Bug 3 scroll:** Need browser verification - is it actually broken?
2. **Tag deletion cascade:** Does DELETE /tags/:id properly remove item associations?
3. **Race condition:** If create tag + save item happen concurrently, is tag guaranteed to exist?
