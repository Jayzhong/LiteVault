# Feature: Library Edit Text & Tag Suggestions Review

> Process doc for F1 (Edit Original Text) and F2 (AI Tag Suggestions Review)

---

## Scope

### In Scope
- **F1**: Allow editing `original_text` (raw_text) for ARCHIVED items via PATCH endpoint
- **F2**: AI suggested tags stored separately from confirmed tags; reviewed before becoming real tags
- Backend migrations, endpoints, integration tests
- Frontend UI updates for review modal and item detail edit

### Out of Scope
- Auto-regeneration of AI fields when original_text is edited (deferred to future work)
- Tag color picker during suggestion accept (uses default color)
- Bulk operations on suggestions
- Mobile-specific layouts beyond existing responsive patterns

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| **F1: Editing original_text does NOT auto-regenerate AI fields** | User may want to fix typos without triggering new AI processing. Explicit "Regenerate" can be future work. |
| **F2: Suggested tags stored in `item_tag_suggestions` table** | Keeps `tags` table clean; only confirmed tags appear there. Allows audit trail of suggestions. |
| **F2: On confirm, accepted suggestions create/revive tags** | Uses existing tag upsert logic with soft-delete revive semantics. |
| **F2: Rejected suggestions are marked, not deleted** | Allows analytics and prevents re-suggestion of same tag. |

---

## Plan Checklist

### Slice A: Docs Updates
- [ ] Update `data_model_v1.md` - add `item_tag_suggestions` table
- [ ] Update `API_CONTRACT_V1.md` - add suggested_tags in item response, confirm payload, PATCH for original_text
- [ ] Update `state_machine.md` - clarify enrichment writes suggestions
- [ ] Update `use_cases_v1.md` - add EditOriginalText and ReviewSuggestedTags use cases
- [ ] Update `UI_INTERACTION_SPEC.md` - library detail edit UX, pending review suggested tags UX
- [ ] Update `MICROCOPY.md` - add keys for edit text, suggested tags section

### Slice B: Backend F2 (Suggested Tags)
- [ ] Create migration: `item_tag_suggestions` table
- [ ] Create `ItemTagSuggestion` entity and repository
- [ ] Modify enrichment worker to write suggestions instead of item.tags
- [ ] Update item read endpoints to include `suggestedTags` array
- [ ] Update confirm endpoint to process accepted/rejected suggestions
- [ ] Add integration tests for suggestion flow

### Slice C: Backend F1 (Edit Original Text)
- [ ] Add PATCH support for `original_text` field in update_item use case
- [ ] Validate: only ARCHIVED items, only owner
- [ ] Add integration tests

### Slice D: Frontend F2 (Suggested Tags Review)
- [ ] Update pending review modal to show suggested tags section
- [ ] Add accept/reject chip interaction
- [ ] Wire confirm payload with accepted/rejected suggestion IDs
- [ ] Handle loading/error states

### Slice E: Frontend F1 (Edit Original Text)
- [ ] Add edit mode for original text in ItemDetailModal
- [ ] Add Cancel/Save buttons
- [ ] Wire to PATCH endpoint
- [ ] Show loading/success/error states

### Slice F: Manual Verification
- [ ] Create item with AI ON → suggested tags visible, tags table clean
- [ ] Accept/reject suggestions → confirmed item has correct tags
- [ ] Edit original text → persists, no AI regeneration

---

## Progress Checklist

| Slice | Status | Notes |
|-------|--------|-------|
| A | 🔲 Not Started | |
| B | 🔲 Not Started | |
| C | 🔲 Not Started | |
| D | 🔲 Not Started | |
| E | 🔲 Not Started | |
| F | 🔲 Not Started | |

---

## How to Run

### Backend
```bash
cd backend
uv sync
uv run alembic upgrade head
uv run pytest
uv run uvicorn app.main:app --reload --port 8080
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## How to Test

### Automated Tests (Backend)
```bash
cd backend
uv run pytest tests/ -v
```

### Manual Verification Script

#### Test 1: AI Suggested Tags Not Polluting Tags Table
1. Create item with AI toggle ON: save text "Meeting notes about Q1 planning"
2. Wait for enrichment (READY_TO_CONFIRM)
3. Check database: `tags` table should NOT have new AI-suggested tags
4. Item detail should show suggested tags in UI

#### Test 2: Accept/Reject Suggestions
1. From READY_TO_CONFIRM item, accept some suggestions, reject others
2. Add an existing tag manually
3. Click Confirm
4. Verify: accepted suggestions now exist as tags, rejected do not appear
5. Check `item_tag_suggestions` table: statuses updated correctly

#### Test 3: Edit Original Text
1. Go to Library, open an archived item detail
2. Click Edit, modify original text
3. Save changes
4. Refresh page: original text persisted
5. Verify: title/summary/tags unchanged (no auto-regeneration)

---

## Risks

| Risk | Mitigation |
|------|------------|
| Migration complexity with existing data | Migration is additive; existing items keep working with backward-compatible defaults |
| Concurrent suggestion/confirm race | Row locks on item and suggestions during confirm |
| Frontend state sync | Use optimistic updates with rollback on error |
