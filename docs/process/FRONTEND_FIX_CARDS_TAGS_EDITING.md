# Frontend Fix: Cards, Tags, and Editing

> Process doc for fixing card interactions and enabling item editing across Pending Review, Search, and Library.

## Scope

Fix the following UI issues:
1. **Pending Review Add Tag**: Clicking "Add Tag" does nothing
2. **Search/Library cards not clickable**: Cards should open detail modal
3. **No edit mode in detail modal**: Cannot edit items from Library/Search
4. **Inconsistent card UI**: Different card styles across pages
5. **Long text not truncated**: Cards may overflow; modal needs scrollable edit

## Current State Analysis

### Existing Components
| Component | Location | Status |
|-----------|----------|--------|
| `PendingCard` | `components/domain/home/` | ✅ Clickable (opens InsightSummaryModal) |
| `LibraryItemCard` | `components/domain/library/` | ✅ Clickable (opens ItemDetailModal) |
| Search results | Inline in `app/search/page.tsx` | ❌ Not clickable, no modal |
| `InsightSummaryModal` | `components/shared/` | ⚠️ Add Tag badge has no handler |
| `ItemDetailModal` | `components/shared/` | ❌ Read-only, no edit mode |

### Backend Support
- **PATCH /items/:id** with no action = edit mode
- **ARCHIVED state allows "edit" action** (confirmed in state_machine)
- Fields: title, summary, tags (rawText not editable per API contract)

---

## Implementation Plan

### Slice A: Unified Card Component + Truncation
**Goal**: Unify card styling, ensure all cards are clickable, add truncation.

#### Files to change
- `[NEW] components/shared/ItemCard.tsx` - Unified card component
- `[MODIFY] components/domain/home/PendingCard.tsx` - Use ItemCard
- `[MODIFY] components/domain/library/LibraryItemCard.tsx` - Use ItemCard
- `[MODIFY] app/search/page.tsx` - Replace inline cards with ItemCard + modal

#### Acceptance Criteria
- [ ] All cards have consistent styling (rounded-xl, border, hover state)
- [ ] Cards are full-width clickable (entire card opens modal)
- [ ] Title: 1 line truncation (truncate)
- [ ] Summary: 2 lines truncation (line-clamp-2)
- [ ] Inner buttons (Retry, etc.) use stopPropagation
- [ ] Cards are keyboard accessible (Enter/Space triggers click)

---

### Slice B: ItemDetailModal Edit Mode
**Goal**: Add edit mode to ItemDetailModal for Library/Search items.

#### Files to change
- `[MODIFY] components/shared/ItemDetailModal.tsx` - Add edit mode
- `[MODIFY] lib/api/client.ts` - Add updateItem API call
- `[NEW] lib/hooks/useItemUpdate.ts` - Mutation hook for item update
- `[MODIFY] app/library/page.tsx` - Refresh on edit success (or optimistic update)

#### Acceptance Criteria
- [ ] Modal has Edit button (top right or footer)
- [ ] Edit mode: title input, summary textarea, tags editable
- [ ] rawText shown but read-only (too risky to edit raw content)
- [ ] Content area scrollable (max-h with overflow-y-auto)
- [ ] Save calls PATCH /items/:id, shows toast on success
- [ ] Cancel reverts changes
- [ ] Error: inline banner + retry

---

### Slice C: TagPicker Component + Fix Add Tag
**Goal**: Create reusable TagPicker for selecting/adding tags.

#### Files to change
- `[NEW] components/shared/TagPicker.tsx` - Popover with tag search/select
- `[MODIFY] components/shared/InsightSummaryModal.tsx` - Wire Add Tag to TagPicker
- `[MODIFY] components/shared/ItemDetailModal.tsx` - Use TagPicker in edit mode
- `[MODIFY] lib/microcopy.ts` - Add any new microcopy keys

#### Acceptance Criteria
- [ ] TagPicker opens on Add Tag click
- [ ] Search existing tags (filters as you type)
- [ ] Click tag to add, click X to remove
- [ ] Optional: quick create tag (if backend supports POST /tags)
- [ ] Clicking outside closes popover
- [ ] Keyboard navigation (arrow keys, Enter to select)

---

### Slice D: Backend Support (NOT NEEDED)
Backend already supports editing ARCHIVED items via PATCH /items/:id with no action.
No backend changes required.

---

## Microcopy Keys Needed

```typescript
// New keys to add
'modal.detail.action.edit': 'Edit',
'modal.detail.action.save': 'Save',
'modal.detail.action.cancel': 'Cancel',
'modal.detail.edit.titleLabel': 'Title',
'modal.detail.edit.summaryLabel': 'Summary',
'modal.detail.edit.tagsLabel': 'Tags',
'modal.detail.error.saveFailed': 'Could not save changes. Please try again.',
'tagPicker.placeholder': 'Search tags...',
'tagPicker.noResults': 'No tags found',
'tagPicker.createNew': 'Create "{tag}"',
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Event propagation on nested buttons | Use stopPropagation on inner click handlers |
| Modal overflow on long content | max-h-[85vh] + overflow-y-auto on both read/edit |
| Optimistic update state desync | Refetch on save success, show toast |
| Tag search performance | Local filter (tags already loaded), debounce if API |

---

## Verification Checklist

### Slice A (Cards)
- [ ] Home: PendingCard clicks open InsightSummaryModal
- [ ] Library: LibraryItemCard clicks open ItemDetailModal
- [ ] Search: Result cards click open ItemDetailModal
- [ ] All cards: keyboard Enter/Space opens modal
- [ ] Long title/summary properly truncated

### Slice B (Edit Mode)
- [ ] ItemDetailModal shows Edit button for ARCHIVED items
- [ ] Click Edit → title/summary become editable
- [ ] Save → API call → toast → modal closes
- [ ] Library list reflects updated title/summary
- [ ] Error → inline message + retry

### Slice C (TagPicker)
- [ ] InsightSummaryModal: Add Tag opens TagPicker
- [ ] Can search/filter tags
- [ ] Can add tag to list
- [ ] Can remove tag from list
- [ ] ItemDetailModal edit mode: tags editable via TagPicker

---

## Progress Checklist

### Planning
- [x] Read source docs (UI_INTERACTION_SPEC, MICROCOPY, FRONTEND_RULES)
- [x] Analyze existing components
- [x] Verify backend edit support (ARCHIVED allows edit)
- [x] Create process doc

### Slice A: Cards (Complete)
- [x] Create unified ItemCard component
- [x] Integrate into PendingCard
- [x] Integrate into LibraryItemCard
- [x] Integrate into Search page
- [x] Integrate into EvidenceCard
- [x] Verify truncation
- [x] Verify keyboard accessibility

### Slice B: Edit Mode (Complete)
- [x] Add edit mode UI to ItemDetailModal
- [x] Add updateItem API call
- [x] Wire save/cancel logic
- [x] Add error handling
- [x] Build passes

### Slice C: TagPicker (Complete)
- [x] Create TagPicker component
- [x] Wire to InsightSummaryModal Add Tag
- [x] Wire to ItemDetailModal edit mode
- [x] Add Popover UI component

### Verification
- [x] Build passes (npm run build)
- [ ] Manual E2E (requires backend + auth)

### Slice A: Cards (Pending)
- [ ] Create unified ItemCard component
- [ ] Integrate into PendingCard
- [ ] Integrate into LibraryItemCard
- [ ] Integrate into Search page
- [ ] Verify truncation
- [ ] Verify keyboard accessibility

### Slice B: Edit Mode (Pending)
- [ ] Add edit mode UI to ItemDetailModal
- [ ] Add updateItem API call
- [ ] Wire save/cancel logic
- [ ] Add error handling
- [ ] Verify with Library/Search

### Slice C: TagPicker (Pending)
- [ ] Create TagPicker component
- [ ] Wire to InsightSummaryModal Add Tag
- [ ] Wire to ItemDetailModal edit mode
- [ ] Verify tag selection/removal

### Verification
- [ ] Full E2E test pass

---

## Open Questions

1. **Should rawText be editable?** Answer: No (too risky, per API contract shows no rawText in edit).
2. **Should edit be inline or separate screen?** Answer: Inline in modal (simpler, consistent).
3. **Tags API: GET /tags available?** Need to verify for TagPicker autocomplete.
