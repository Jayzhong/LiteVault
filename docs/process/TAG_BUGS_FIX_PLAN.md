# Tag UI Bugs - Fix Plan

**Date:** 2025-12-29  
**Status:** ✅ Implemented

---

## Summary

5 slices to fix all confirmed bugs. Each slice is PR-sized and independently deployable.

| Slice | Bug(s) | Scope | Status |
|-------|--------|-------|--------|
| A | 1 | Remove mockTags from AppContext | ✅ Done |
| B | 2 | TagPicker creates via API | ✅ Done |
| C | 3 | Scroll verification/fix | ✅ Not needed |
| D | 4 | RenameTagModal implementation | ✅ Done |
| E | 5 | Debounce search input | ✅ Done |

---

## Slice A: Remove Phantom Tags

**Fixes:** Bug 1 - Tags like "Meetings" showing in TagPicker

### Files to Change
| File | Change |
|------|--------|
| `frontend/src/lib/store/AppContext.tsx` | Initialize `tags` as `[]`, not `mockTags` |
| `frontend/src/lib/fixtures/items.ts` | (Optional) Keep for dev/testing only |

### Implementation

```tsx
// AppContext.tsx line 62
- const [tags, setTags] = useState<Tag[]>(mockTags);
+ const [tags, setTags] = useState<Tag[]>([]);
```

### Acceptance Criteria
- [ ] TagPicker shows only user-created tags
- [ ] New user sees empty tag list (not mock data)
- [ ] API tags still load and display correctly

### Test Plan
- **Manual:** Login → TagPicker → Verify no phantom tags
- **Unit:** N/A (state initialization change)

---

## Slice B: Create Tag Persistence

**Fixes:** Bug 2 - Tags created in TagPicker don't persist to Settings

### Files to Change
| File | Change |
|------|--------|
| `frontend/src/components/shared/TagPicker.tsx` | Call `apiClient.createTag()` in `handleCreateTag` |

### Implementation

```tsx
// TagPicker.tsx lines 99-105
const handleCreateTag = async () => {
    const newTag = searchQuery.trim();
    if (newTag && !selectedTags.includes(newTag)) {
        try {
            // Create via API (upsert returns existing if duplicate)
            await apiClient.createTag(newTag);
            onChange([...selectedTags, newTag]);
            setSearchQuery('');
        } catch (error) {
            console.error('Failed to create tag:', error);
        }
    }
};
```

### Acceptance Criteria
- [ ] Create tag in TagPicker → Settings shows it immediately
- [ ] Duplicate name returns existing tag (upsert)
- [ ] Error handling shows toast on failure

### Test Plan
- **Manual:** Create tag → Check Settings > Tags → Verify visible
- **Backend:** Existing `test_create_tag_upsert` covers API

---

## Slice C: Scroll Behavior Verification

**Fixes:** Bug 3 - Tag list may not scroll

### Files to Change (if needed)
| File | Change |
|------|--------|
| `frontend/src/components/shared/TagPicker.tsx` | Adjust `max-h-40` if needed |

### Investigation Steps
1. Open DevTools → Inspect PopoverContent scroll container
2. Verify computed styles for `max-height` and `overflow`
3. If broken, check parent `overflow-hidden`

### Current Code (Already Correct)
```tsx
// TagPicker.tsx line 166
<div className="max-h-40 overflow-y-auto space-y-1">
```

### Acceptance Criteria
- [ ] With 10+ tags, list scrolls
- [ ] Scroll thumb visible when content exceeds container

### Test Plan
- **Manual:** Create 15+ tags → Open TagPicker → Verify scroll

---

## Slice D: Rename Tag Modal

**Fixes:** Bug 4 - Rename action shows toast stub

### Files to Change
| File | Change |
|------|--------|
| `frontend/src/components/domain/tags/RenameTagModal.tsx` | **NEW** Create modal component |
| `frontend/src/components/domain/tags/TagsTable.tsx` | Use modal instead of toast stub |

### Implementation

**New File: RenameTagModal.tsx**
```tsx
interface RenameTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    tag: Tag;
    onRename: (id: string, name: string) => Promise<void>;
}

export function RenameTagModal({ isOpen, onClose, tag, onRename }: RenameTagModalProps) {
    const [name, setName] = useState(tag.name);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onRename(tag.id, name);
            toast.success('Tag renamed');
            onClose();
        } catch {
            toast.error('Failed to rename tag');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rename Tag</DialogTitle>
                </DialogHeader>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
```

**TagsTable.tsx Changes:**
```tsx
const [renameTarget, setRenameTarget] = useState<Tag | null>(null);
const { renameTag } = useTags();

const handleRename = (tag: Tag) => {
    setRenameTarget(tag);
};

// In return:
{renameTarget && (
    <RenameTagModal
        isOpen={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        tag={renameTarget}
        onRename={renameTag}
    />
)}
```

### Acceptance Criteria
- [ ] Click Rename → Modal opens with current name
- [ ] Edit name → Save → Tag updates in list
- [ ] Rename to existing name → 409 error shown

### Test Plan
- **Manual:** Rename tag → Verify name updates
- **Backend:** Existing `test_rename_tag_success` covers API

---

## Slice E: Debounce Search Input

**Fixes:** Bug 5 - Search input loses focus after typing

### Files to Change
| File | Change |
|------|--------|
| `frontend/src/app/settings/tags/page.tsx` | Debounce query before passing to `useTags` |

### Implementation

```tsx
// Add debounce hook (reuse from useTagSearch.ts or create shared)
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

// In component:
const [searchQuery, setSearchQuery] = useState('');
const debouncedQuery = useDebounce(searchQuery, 300);

const { tags, isLoading } = useTags({
    q: debouncedQuery || undefined,  // ← Use debounced
    sort: sortBy,
    unused: showUnused || undefined,
});

// Also fix loading state to not unmount input:
const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
useEffect(() => {
    if (!isLoading && !hasInitiallyLoaded) setHasInitiallyLoaded(true);
}, [isLoading, hasInitiallyLoaded]);

if (isLoading && !hasInitiallyLoaded) {
    return <LoadingSkeleton />;
}
// Rest of component renders normally (input stays mounted)
```

### Acceptance Criteria
- [ ] Type in search → Focus stays in input
- [ ] Search filters after 300ms debounce
- [ ] Initial page load still shows skeleton

### Test Plan
- **Manual:** Type quickly → Verify no focus loss, results filter after pause

---

## Rollout Strategy

### Order
1. **Slice E** (focus fix) - Most user-visible annoyance
2. **Slice A** (phantom tags) - Data integrity
3. **Slice B** (create persistence) - Core functionality
4. **Slice D** (rename modal) - Feature completion
5. **Slice C** (scroll) - Polish (may not be needed)

### Risks

| Risk | Mitigation |
|------|------------|
| Breaking tag display | Feature flag for mockTags removal |
| API errors on create | Error handling with toast + fallback |
| Rename conflicts | Backend returns 409, UI shows error |

### Testing Checklist (After All Slices)

- [ ] Settings > Tags loads correctly
- [ ] Create tag via Settings works
- [ ] Create tag via TagPicker works + visible in Settings
- [ ] Rename tag works
- [ ] Delete tag works
- [ ] Color picker works
- [ ] Search filters correctly (no focus loss)
- [ ] Sort dropdown works
- [ ] Unused filter works
- [ ] TagPicker shows only real tags (no phantom)
