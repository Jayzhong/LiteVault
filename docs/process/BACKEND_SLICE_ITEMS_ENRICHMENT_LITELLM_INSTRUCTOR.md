# Backend Slice: Items Enrichment with LiteLLM + Instructor

> Async enrichment worker using LiteLLM and Instructor for structured LLM output

---

## Scope

### In Scope
- LLM settings via Pydantic Settings (model, fallback, timeout, retries)
- LiteLLM + Instructor adapter for structured enrichment output
- Worker integration calling LLM adapter (ENRICHING → READY_TO_CONFIRM / FAILED)
- Concurrency control (asyncio semaphore)
- Error handling with sanitized failure_reason on items
- Unit and integration tests (no real LLM calls)

### Out of Scope
- Search/RAG functionality (separate feature)
- Frontend changes (backend-only slice)
- Rate limiting (handled by LiteLLM retry logic)
- Custom prompt engineering UI

---

## Source Documents Reviewed
- [x] docs/architecture/state_machine.md
- [x] docs/architecture/backend_architecture_v1.md
- [x] docs/architecture/data_model_v1.md
- [x] docs/architecture/use_cases_v1.md
- [x] backend/app/config.py
- [x] backend/app/infrastructure/enrichment/worker.py
- [x] backend/app/infrastructure/enrichment/stub_provider.py

---

## Decisions

### D1: Model Configuration
- `LITEVAULT_LLM_MODEL`: Primary model (default: `openai/gpt-4o-mini`)
- `LITEVAULT_LLM_FALLBACK_MODELS`: Comma-separated fallbacks (optional)
- `LITEVAULT_LLM_TEMPERATURE`: 0.3 (deterministic but creative)
- `LITEVAULT_LLM_MAX_TOKENS`: 1024
- `LITEVAULT_LLM_TIMEOUT_SECONDS`: 30
- `LITEVAULT_LLM_MAX_RETRIES`: 2 (Instructor will retry on validation failure)
- `LITEVAULT_LLM_CONCURRENCY`: 3 (max concurrent enrich calls)

### D2: Prompt Template Strategy
- Single centralized prompt builder function
- System prompt enforces constraints:
  - Title: max 100 chars, descriptive
  - Summary: max 500 chars, concise
  - Tags: 3-5 tags, normalized (lowercase, trimmed)
  - Source type: "NOTE" or "ARTICLE"

### D3: Failure Handling
- Add `enrichment_error` column to items table (VARCHAR 500)
- Store sanitized error (no API keys, no user data)
- Error codes: `LLM_TIMEOUT`, `LLM_VALIDATION_ERROR`, `LLM_API_ERROR`

### D4: Provider Selection
- `LITEVAULT_LLM_PROVIDER`: `litellm` (production) or `stub` (dev/test)
- Worker selects provider based on setting

---

## Plan: Slices

### Slice A: Config & Settings
**Files:**
- `backend/app/config.py` (add LLMSettings class)
- `backend/.env.example` (add LLM vars)

**Acceptance Criteria:**
- LLMSettings loads from env with sensible defaults
- All vars documented in .env.example

---

### Slice B: LLM Adapter (LiteLLM + Instructor)
**Files:**
- [NEW] `backend/app/infrastructure/enrichment/provider_interface.py` (ABC)
- [MODIFY] `backend/app/infrastructure/enrichment/stub_provider.py` (implement interface)
- [NEW] `backend/app/infrastructure/enrichment/litellm_provider.py` (LiteLLM + Instructor)
- [NEW] `backend/app/infrastructure/enrichment/prompts.py` (prompt templates)
- [NEW] `backend/app/infrastructure/enrichment/schemas.py` (Pydantic output schema)

**Acceptance Criteria:**
- EnrichmentProvider interface with async `enrich_item(text: str) -> EnrichmentResult`
- LiteLLM provider uses `acompletion` wrapped with Instructor
- Output schema validates title/summary/tags/source_type
- Prompt templates are centralized

---

### Slice C: Worker Integration
**Files:**
- `backend/app/infrastructure/enrichment/worker.py` (use provider factory, add semaphore)
- `backend/app/infrastructure/persistence/models/item_model.py` (add enrichment_error)
- `backend/app/domain/entities/item.py` (add enrichment_error field)
- `backend/alembic/versions/005_add_enrichment_error.py` (migration)

**Acceptance Criteria:**
- Worker uses asyncio semaphore for concurrency
- Provider selected via settings.llm_provider
- Re-checks item state under lock before writing
- On failure: set enrichment_error, transition to FAILED

---

### Slice D: Tests
**Files:**
- [NEW] `backend/tests/test_enrichment.py` (unit tests for providers)
- `backend/tests/test_items.py` (add integration tests for enrichment flow)

**Acceptance Criteria:**
- Tests use mocked provider (no real LLM)
- Test ENRICHING → READY_TO_CONFIRM happy path
- Test ENRICHING → FAILED on error
- Test worker skips DISCARDED items
- All tests pass with `uv run pytest`

---

## PR-Sized Commits

1. **Commit 1**: Add LLMSettings to config + update .env.example
2. **Commit 2**: Create EnrichmentProvider interface and refactor StubProvider
3. **Commit 3**: Add LiteLLM + Instructor provider with prompts
4. **Commit 4**: Add enrichment_error field (migration + model)
5. **Commit 5**: Update worker to use provider factory + semaphore
6. **Commit 6**: Add unit and integration tests

---

## Plan Checklist

### Slice A: Config & Settings
- [x] Add LLMSettings to config.py
- [x] Update .env.example with LLM vars

### Slice B: LLM Adapter
- [x] Create EnrichmentProvider interface
- [x] Refactor StubProvider to implement interface
- [x] Create prompts.py with centralized templates
- [x] Create schemas.py with Instructor output schema
- [x] Implement LiteLLMProvider

### Slice C: Worker Integration
- [x] Update worker with provider factory
- [x] Add concurrency semaphore
- [x] Re-check state under lock before writing
- [x] Persist error on failure

### Slice D: Tests
- [x] Unit tests for StubProvider (4 tests)
- [x] Unit tests for EnrichmentSchema (8 tests)
- [x] Verify all tests pass (69/69)

---

## Progress Checklist

- [x] Process doc created
- [x] Settings + env implemented
- [x] LLM adapter implemented
- [x] Worker integration complete
- [x] Tests passing (69/69)
- [ ] Manual verification

---

## Add Dependencies

```bash
cd backend
uv add litellm instructor
```

---

## How to Run (Dev)

```bash
cd backend

# Install dependencies
uv sync

# Set env vars (copy and edit)
cp .env.example .env
# Add: OPENAI_API_KEY=sk-...

# Run migrations
uv run alembic upgrade head

# Start server (worker runs in-process)
uv run uvicorn app.main:app --reload --port 8080
```

---

## How to Test

```bash
cd backend

# All tests (stub provider, no real LLM)
uv run pytest -v

# Enrichment tests only
uv run pytest tests/test_enrichment.py tests/test_items.py -v
```

---

## Manual Verification Script

### Prerequisites
- OpenAI API key set in .env
- Backend running on port 8080
- Frontend running on port 3000

### Steps

1. Start backend with real provider:
   ```bash
   cd backend
   # Edit .env: LITEVAULT_LLM_PROVIDER=litellm
   uv run uvicorn app.main:app --reload --port 8080
   ```

2. Create item via API:
   ```bash
   curl -X POST http://localhost:8080/api/v1/items \
     -H "Content-Type: application/json" \
     -H "X-Dev-User-Id: test-user-123" \
     -d '{"rawText": "This is a test note about machine learning and neural networks."}'
   ```

3. Wait for enrichment (poll pending items):
   ```bash
   curl http://localhost:8080/api/v1/items/pending \
     -H "X-Dev-User-Id: test-user-123"
   ```

4. Verify item has:
   - status: `READY_TO_CONFIRM`
   - title: AI-generated (not just first line)
   - summary: AI-generated concise summary
   - tags: AI-suggested relevant tags

5. Test failure handling:
   - Set invalid API key
   - Create item
   - Verify status becomes `FAILED`
   - Verify enrichment_error contains error code

---

## Risks and Fallbacks

| Risk | Mitigation |
|------|------------|
| LiteLLM version incompatibility | Pin version in pyproject.toml |
| Instructor schema changes | Use stable schema, test thoroughly |
| Rate limiting | LiteLLM has built-in retry, add semaphore |
| API key leakage in logs | Sanitize errors, use structlog |
| Long enrichment times | Timeout + async semaphore |
