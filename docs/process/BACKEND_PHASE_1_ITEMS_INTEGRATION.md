# Phase 1: Items Integration (Backend + Frontend)

> Process doc for LiteVault Phase 1
> Created: 2025-12-27

---

## 1. Scope

Make the Items flow **fully real (no mocks)** end-to-end:

- **Backend**: Endpoints correct per `API_CONTRACT_V1.md`, robust state machine, idempotency, async enrichment
- **Frontend**: Home Pending Review flow calls real APIs with feature flag fallback to mock
- **Tests**: Integration tests for every backend behavior

### In Scope
- `POST /items` (idempotent, enqueue outbox)
- `GET /items/pending`
- `GET /items/{id}`
- `PATCH /items/{id}` (confirm/discard/edit with state validation)
- `POST /items/{id}/retry`
- Enrichment worker (outbox + stub AI)
- Frontend Home flow integration

### Out of Scope (Phase 2+)
- Library endpoints
- Tags endpoints
- Search endpoint
- Auth endpoints
- Real AI provider

---

## 2. Plan Checklist

### A) Backend Hardening

#### A1. Integration Test Additions
- [x] Test idempotency: same key returns same item
- [x] Test idempotency: different keys create different items
- [x] Test confirm from ENRICHING → 409 INVALID_STATE_TRANSITION
- [x] Test discard from ENRICHING → 409
- [x] Test retry from ENRICHING → 409
- [x] Test error envelope always has requestId
- [x] Test get item by ID success
- [x] Test pending items ordered newest first

#### A2. Backend Fixes
- [x] Fix datetime deprecation warnings (12 usages: utcnow → now(timezone.utc))
- [x] Verify all error responses use standard envelope
- [x] Verify X-Request-Id in all responses

### B) Frontend Integration

#### B1. Infrastructure
- [x] Add feature flag: `NEXT_PUBLIC_USE_REAL_API`
- [x] Add env vars: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_DEV_USER_ID`
- [x] Create typed API client in `src/lib/api/client.ts`
- [x] Use native React state + polling (simpler than TanStack Query for MVP)

#### B2. API Client Methods
- [x] `createItem(rawText, idempotencyKey)` → POST /items
- [x] `getPendingItems()` → GET /items/pending
- [x] `getItem(id)` → GET /items/{id}
- [x] `confirmItem(id, tags)` → PATCH /items/{id}
- [x] `discardItem(id)` → PATCH /items/{id}
- [x] `retryItem(id)` → POST /items/{id}/retry

#### B3. Home Page Integration
- [x] Implement polling while ENRICHING items exist (2s interval)
- [x] Update AppContext to branch on feature flag
- [x] Keep mock mode fully functional when flag is false

### C) Manual Verification
- [ ] Save text → item appears with ENRICHING status
- [ ] Worker runs → status becomes READY_TO_CONFIRM
- [ ] Confirm & Save → item disappears from pending
- [ ] Discard → item disappears from pending
- [ ] Retry works from FAILED

---

## 3. Progress Checklist

> Updated as implementation proceeds — **IMPLEMENTATION COMPLETE** ✅

- [x] A) Backend Hardening (15 tests passing, datetime warnings fixed)
- [x] B) Frontend Integration (API client + AppContext + polling)
- [ ] C) Manual Verification (awaiting user testing)

---

## 4. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | TanStack Query | Per FRONTEND_RULES.md recommendation |
| Polling interval | 2 seconds | Fast enough for UX, light on server |
| Feature flag | `NEXT_PUBLIC_USE_REAL_API` | Clean toggle between mock/real |
| Dev user header | `X-Dev-User-Id` | Per API_CONTRACT_V1.md |
| Idempotency in FE | UUID per save | Prevent duplicate submits |

---

## 5. Risks / Open Questions

| Risk | Mitigation |
|------|------------|
| Worker not running during FE dev | Makefile `make dev` starts with worker |
| CORS issues | Backend already has CORS middleware |
| Race condition on confirm | Backend uses FOR UPDATE lock |

| Question | Proposed Resolution |
|----------|---------------------|
| Should polling stop when no ENRICHING? | Yes, poll only while ENRICHING items exist |
| What if worker crashes mid-job? | Outbox job remains PROCESSING; add stale claim timeout (future) |
| How to test worker in integration tests? | Call worker tick function directly |

---

## 6. How to Run

### Backend + Database

```bash
cd backend
docker compose up -d
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8080
```

### Frontend (with real API)

```bash
cd frontend

# Create .env.local with:
echo 'NEXT_PUBLIC_USE_REAL_API=true' > .env.local
echo 'NEXT_PUBLIC_API_BASE_URL=http://localhost:8080' >> .env.local
echo 'NEXT_PUBLIC_DEV_USER_ID=dev-user-001' >> .env.local

npm install
npm run dev
```

### Frontend (mock mode, no backend needed)

```bash
cd frontend

# Create .env.local with:
echo 'NEXT_PUBLIC_USE_REAL_API=false' > .env.local

npm run dev
```

### Both (for integrated dev)

Terminal 1:
```bash
cd backend && make dev
```

Terminal 2:
```bash
cd frontend && npm run dev
```

---

## 7. How to Test

### Backend Integration Tests

```bash
cd backend
docker compose up -d
uv run pytest -v
```

### Specific Test Groups

```bash
# Items idempotency
uv run pytest tests/test_items.py::test_create_item_idempotency -v

# State transitions
uv run pytest tests/test_items.py -k "state" -v

# Error handling
uv run pytest tests/test_items.py::test_error_response_includes_request_id -v
```

---

## 8. Manual Verification Script

### Prerequisites
1. Backend running on `http://localhost:8080`
2. Frontend running on `http://localhost:3000`
3. `.env.local` has `NEXT_PUBLIC_USE_REAL_API=true`

### Steps

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open `http://localhost:3000` | Home page loads |
| 2 | Type text in capture bar, press Enter | New pending card appears with ENRICHING skeleton |
| 3 | Wait 2-4 seconds | Card updates to READY_TO_CONFIRM with title/summary |
| 4 | Click card to open modal | Modal shows enriched fields and tag chips |
| 5 | Click "Confirm & Save" | Card disappears from pending |
| 6 | Repeat step 2-3, then click "Discard" | Card disappears without going to library |
| 7 | Force FAILED (stop worker, create item, restart) | FAILED card shows error message |
| 8 | Click "Retry" on FAILED card | Card returns to ENRICHING, then READY_TO_CONFIRM |
| 9 | Disconnect backend, create item | Error toast appears |

---

## 9. Proposed Commits

1. **test: add comprehensive items integration tests**
   - Idempotency, state transitions, error envelope

2. **fix: datetime deprecation warnings**
   - Replace utcnow() with now(datetime.UTC)

3. **feat(frontend): add API client infrastructure**
   - Feature flags, typed client, TanStack Query setup

4. **feat(frontend): integrate Home pending flow**
   - Hooks for items CRUD, polling, error handling

5. **docs: update process doc with completed verification**
