# Backend Slice: Items Pending to Confirm

> Complete E2E flow from Item creation through Pending Review to Confirm/Discard

---

## Scope

### In Scope
- Verify PATCH /items/:id supports action=confirm, action=discard, field edits
- Add row-level locking (SELECT ... FOR UPDATE) to prevent races
- Add complete integration tests for happy paths
- Ensure frontend Pending Review modal uses real APIs
- Document tag persistence strategy

### Out of Scope
- WebSocket/SSE for real-time updates (V2)
- Tag merge functionality
- Worker implementation (already exists)

---

## Source Documents Read
- [x] docs/architecture/state_machine.md
- [x] docs/architecture/API_CONTRACT_V1.md
- [x] docs/architecture/error_handling.md
- [x] docs/architecture/data_model_v1.md
- [x] backend/tests/test_items.py
- [x] Item entity (domain/entities/item.py)
- [x] Items API endpoint (api/v1/items.py)

---

## Decisions

### D1: State Transitions (from state_machine.md)

| From | Action | To |
|------|--------|-----|
| READY_TO_CONFIRM | confirm | ARCHIVED |
| READY_TO_CONFIRM | discard | DISCARDED |
| READY_TO_CONFIRM | edit | READY_TO_CONFIRM |
| FAILED | discard | DISCARDED |
| FAILED | retry | ENRICHING |
| ARCHIVED | edit | ARCHIVED |

All other transitions → 409 INVALID_STATE_TRANSITION

### D2: Tag Persistence Strategy

**Decision: Option 1 - Tags persisted on Confirm**

- During enrichment, worker stores suggested tag strings on item.tags (string array)
- On confirm:
  - Item is archived with final tags array
  - For V1, tags remain as string array on item
  - Tags table is for user-managed tags (not auto-linked to items yet)
- Item-tags join table for proper relationships → V2

**Rationale:** Keeps V1 simple. Tags array on items is sufficient for display/search.

### D3: Row Locking

Add `SELECT ... FOR UPDATE` in repository when:
- Reading item for update/confirm/discard/retry
- Worker completing enrichment

### D4: Combined Edits + Confirm

PATCH /items/:id supports sending edits inline with confirm:
```json
{
  "action": "confirm",
  "title": "Updated Title",
  "summary": "Updated summary", 
  "tags": ["Tag1", "Tag2"]
}
```

Fields are applied BEFORE status transition.

---

## Plan Checklist

### Backend

- [x] **B1**: Add row-level locking to item repository `get_by_id` with `for_update` option
- [x] **B2**: Verify UpdateItemUseCase applies edits before confirm (**Fixed**: now applies title/summary before confirm)
- [x] **B3**: Add integration tests:
  - [x] Confirm happy path (READY_TO_CONFIRM → ARCHIVED)
  - [x] Confirm with edits (title/summary/tags updated)
  - [x] Discard happy path (READY_TO_CONFIRM → DISCARDED)
  - [x] Discard from FAILED
  - [x] Retry from FAILED → ENRICHING
  - [x] Confirm from FAILED returns 409
  - [x] Item no longer in pending after confirm/discard
- [x] **B4**: Verify error responses follow standard envelope

### Frontend

- [x] **F1**: Verify Pending Review modal calls real PATCH /items/:id
- [x] **F2**: Confirm button sends action=confirm + edited fields (**Enhanced** to accept title/summary/tags)
- [x] **F3**: Discard button sends action=discard
- [ ] **F4**: Verify auth redirect works for signed-out users

### Documentation

- [ ] **D1**: Update API_CONTRACT_V1.md if needed
- [x] **D2**: Update this process doc with results

---

## Progress Checklist

- [x] Process doc created
- [x] Backend implementation
- [x] Integration tests pass (57/57)
- [x] Frontend verification (TypeScript builds)
- [ ] Manual E2E test

---

## How to Run

```bash
# Backend
cd backend
uv sync
uv run alembic upgrade head
uv run pytest -v
uv run uvicorn app.main:app --reload --port 8080

# Frontend
cd frontend
npm run dev
```

---

## How to Test

```bash
# Run all tests
cd backend && uv run pytest -v

# Run items tests specifically
cd backend && uv run pytest tests/test_items.py -v
```

---

## Manual Verification Script

1. Start backend: `cd backend && uv run uvicorn app.main:app --reload --port 8080`
2. Start frontend: `cd frontend && npm run dev`
3. Sign in via Clerk
4. On Home page, paste text and click Save
5. Wait for item to reach READY_TO_CONFIRM (poll or check API)
6. Open the item in Pending Review modal
7. Edit title/summary/tags
8. Click "Confirm & Save"
9. Verify item appears in Library (confirmedAt set)
10. Verify item no longer in Pending
11. Create another item, wait for READY_TO_CONFIRM
12. Click Discard
13. Verify item disappears from Pending
