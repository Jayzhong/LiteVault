# Feature: Home Enrich Toggle + Manual Flow

> Move "AI suggested tags and summary" toggle to Home Save area, with manual (no AI) and AI flows.

---

## Scope

### In Scope
- Add `enrich` param to POST /items (default=true)
- Toggle OFF: create READY_TO_CONFIRM immediately, no LLM call
- Toggle ON: existing ENRICHING flow unchanged
- Toggle in Home input area (default OFF)
- Remove or rewire Settings page toggle

### Out of Scope
- Persisting toggle preference across sessions (always defaults OFF)
- Changes to enrichment worker
- Changes to confirm/discard flows

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API param name | `enrich` (boolean) | Clear, matches existing pattern |
| Default value | `true` | Backward compatible |
| Manual title fallback | First 60 chars of first non-empty line | Deterministic, no AI needed |
| enrichment_mode column | Add to items table | Track how item was created |
| Settings toggle | Remove | Avoid conflicting controls |
| Toggle preference | **Persist to user settings** | Read from `aiSuggestionsEnabled` pref |
| Idempotency conflict | Return original item | Same key must return same result |

---

## Plan Slices

### Slice A: Docs + Contract Updates
**Files:**
- docs/architecture/API_CONTRACT_V1.md
- docs/architecture/state_machine.md
- docs/architecture/use_cases_v1.md
- docs/design/UI_INTERACTION_SPEC.md
- docs/design/MICROCOPY.md
- docs/architecture/data_model_v1.md

**Acceptance:**
- POST /items documents `enrich` param
- State machine allows creation into READY_TO_CONFIRM
- Microcopy has toggle label keys

---

### Slice B: Backend Implementation
**Files:**
- backend/app/application/items/dtos.py (add enrich field)
- backend/app/application/items/create_item.py (branch logic)
- backend/app/api/v1/items.py (accept enrich param)
- backend/app/api/schemas/items.py (add enrich to request)
- backend/app/domain/entities/item.py (add enrichment_mode)
- backend/alembic/versions/xxx_add_enrichment_mode.py (migration)
- backend/tests/test_items.py (new tests)

**Acceptance:**
- POST /items with enrich=false creates READY_TO_CONFIRM
- No outbox job created for manual flow
- Title = first 60 chars of first line
- Idempotency returns original item
- uv run pytest passes

**Risks:**
- Idempotency key reuse with different enrich value → return original
- State transition validation unchanged

---

### Slice C: Frontend Implementation
**Files:**
- frontend/src/app/page.tsx (add toggle)
- frontend/src/lib/api/client.ts (add enrich param)
- frontend/src/lib/store/AppContext.tsx (pass enrich)
- frontend/src/lib/microcopy.ts (add toggle keys)
- frontend/src/components/shared/InputBar.tsx (add toggle prop)

**Acceptance:**
- Toggle visible next to Save button
- Default OFF on page load
- Toggle OFF: immediate READY_TO_CONFIRM, no polling
- Toggle ON: existing ENRICHING flow
- No hardcoded strings

**Risks:**
- Hydration mismatch (use useEffect for toggle state)
- Polling must skip READY_TO_CONFIRM items

---

### Slice D: Cleanup Settings Toggle
**Files:**
- frontend/src/app/settings/page.tsx (remove toggle)
- docs/design/UI_INTERACTION_SPEC.md (update settings section)

**Acceptance:**
- Settings page no longer shows AI toggle
- No duplicate controls

---

## Verification Script

### Signed Out
1. Home renders
2. Type text, click Save → redirects to /auth/login

### Signed In, Toggle OFF
1. Home renders with toggle OFF by default
2. Type text, click Save
3. Item appears immediately in Pending Review as READY_TO_CONFIRM
4. Click card → modal opens
5. Edit title/tags → Confirm works
6. Item appears in Library

### Signed In, Toggle ON
1. Toggle AI enrichment ON
2. Type text, click Save
3. Item appears as ENRICHING → polls → READY_TO_CONFIRM
4. Confirm flow unchanged

### Backend Tests
```bash
cd backend
uv sync
uv run alembic upgrade head
uv run pytest -v
```

---

## Progress Checklist

### Planning
- [x] Read source docs
- [x] Analyze existing code
- [ ] Create process doc
- [ ] Request user review

### Slice A: Docs
- [ ] Update API_CONTRACT_V1.md
- [ ] Update state_machine.md
- [ ] Update use_cases_v1.md
- [ ] Update UI_INTERACTION_SPEC.md
- [ ] Update MICROCOPY.md
- [ ] Update data_model_v1.md

### Slice B: Backend
- [ ] Add enrichment_mode to item entity
- [ ] Add enrich param to CreateItemInput
- [ ] Branch logic in CreateItemUseCase
- [ ] Add enrich to API schema
- [ ] Create migration
- [ ] Add tests
- [ ] Verify pytest passes

### Slice C: Frontend
- [ ] Add toggle to Home
- [ ] Add enrich param to API client
- [ ] Wire toggle to save flow
- [ ] Skip polling for manual items
- [ ] Add microcopy keys

### Slice D: Cleanup
- [ ] Remove Settings toggle
- [ ] Update docs
