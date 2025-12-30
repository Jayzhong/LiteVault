# Feature Bundle: Library Discard, Home Tag Picker, Direct Save

**Phase:** Implementation
**Created:** 2025-12-30

---

## Scope

### In Scope
1. **F1: Library Discard** – Library items support soft-delete (ARCHIVED → DISCARDED)
2. **F2: Home Tag Suggestions** – Typing `#` triggers tag suggestion dropdown, selected tags shown as chips
3. **F3: Direct Save (AI OFF)** – When AI toggle is OFF, Save creates item directly as ARCHIVED (skip READY_TO_CONFIRM)

### Out of Scope
- Tag creation from Home page `#` UI (only selecting existing tags)
- Search filtering by DISCARDED items for admin
- Undo discard

---

## Current State Analysis

| Feature | Current Behavior | Required Change |
|---------|-----------------|-----------------|
| F3: AI OFF | `enrich=false` → READY_TO_CONFIRM | → ARCHIVED directly |
| F1: Library Discard | ARCHIVED is terminal | → ARCHIVED → DISCARDED allowed |
| F2: # Tags | No tag UI in Home input | Add popover + chip selection |

---

## Slice Plan & Progress

### Slice A: Documentation Updates
- [ ] API_CONTRACT_V1.md – add `tagIds` param + direct archive behavior
- [ ] state_machine.md – add direct → ARCHIVED + ARCHIVED → DISCARDED
- [ ] use_cases_v1.md – add Direct Save, Library Discard, Home Tag Selection
- [ ] MICROCOPY.md – add tag hint, discard copy, toasts
- [ ] UI_INTERACTION_SPEC.md – update Home and Library behaviors

### Slice B: Backend F3 (Direct Save)
- [ ] Update `POST /items` to accept `tagIds` param
- [ ] If `enrich=false`: create directly as ARCHIVED with `confirmed_at=now()`
- [ ] Validate `tagIds` belong to user and not deleted
- [ ] Create `item_tags` associations
- [ ] Integration tests

### Slice C: Backend F1 (Library Discard)
- [ ] Update `PATCH /items/:id` to allow `action=discard` from ARCHIVED
- [ ] Set `status=DISCARDED`, `updated_at=now()`
- [ ] Ensure `/library` and `/search` filter out DISCARDED
- [ ] Idempotency: discarding already DISCARDED returns success
- [ ] Integration tests

### Slice D: Frontend F2 (Home Tag Picker)
- [ ] Add `#` trigger detection in InputBar or Home page
- [ ] Create TagSuggestionPopover component (fetch via `GET /tags?q=...`)
- [ ] Selected tags → chips displayed near input
- [ ] Pass `tagIds` to `addPendingItem` → API
- [ ] Handle AI OFF + AI ON paths

### Slice E: Frontend F1 (Library Discard UI)
- [ ] Add "Discard" action to LibraryItemCard or ItemDetailModal
- [ ] ConfirmDialog for discard
- [ ] Call backend discard, optimistic update, toast

### Slice F: Verification & Finalization
- [ ] Manual E2E verification
- [ ] Process doc finalization

---

## Key Decisions

| Decision | Resolution |
|----------|------------|
| `tagIds` vs `tags` param name | Use `tagIds` (UUID list) for clarity |
| F3 title fallback | First 60 chars of first non-empty line (existing logic) |
| F1 idempotency | Discarding DISCARDED item returns 200 success (idempotent) |
| F2 debounce | 300ms debounce for tag search API calls |
| F2 chip display | Chips shown above input bar (not inline) |

---

## API Changes Summary

### POST /items (updated)
```json
{
  "rawText": "string",
  "enrich": false,     // AI toggle
  "tagIds": ["uuid"]   // NEW: selected tags from # picker
}
```
- `enrich=false` + `tagIds`: Creates ARCHIVED directly with tags associated

### PATCH /items/:id (updated)
- `action=discard` now allowed from ARCHIVED → DISCARDED

---

## Commands

### Backend
```bash
cd backend
uv sync
uv run alembic upgrade head
uv run pytest -v
uv run uvicorn app.main:app --reload --port 8080
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Manual Verification Checklist

1. **Home AI OFF + Tags**
   - [ ] Type `#` in Home input → tag popover appears
   - [ ] Select tag → chip appears
   - [ ] Save → item appears in Library immediately (no Pending Review)
   - [ ] Verify tags are attached to item

2. **Home AI ON**
   - [ ] Save → shows in Pending Review, normal enrichment flow

3. **Library Discard**
   - [ ] Open Library item → click Discard → confirm dialog
   - [ ] Discard → item disappears
   - [ ] Refresh → still gone

4. **Search**
   - [ ] Discarded items do NOT appear in search results

5. **Tag Suggestions**
   - [ ] Type partial tag name after `#` → filtered suggestions
   - [ ] Deleted tags do NOT appear
