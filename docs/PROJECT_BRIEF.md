# LiteVault Project Brief & Handoff

> **Read this first.** (5-10 min read)
> This document is the "Golden Source" for understanding LiteVault's architecture, conventions, and current state. 
> Use this context to start working immediately without reading the entire repository.

---

## 0. One-Paragraph Summary
**LiteVault** is a minimalist "capture now, organize later" knowledge base. Users quickly **Capture** thoughts on the Home feed. An async AI worker **Enriches** these notes with titles, summaries, and tags. Users review these in the **Pending Review** section to **Confirm** (save to Library) or **Discard**. The **Library** provides a timeline view of confirmed items. A **Search** interface (V1: lexical/tag, V2: semantic) allows retrieval. **Settings** manage user preferences and tags.

---

## 1. Current Status (Dec 2025)

### Implemented ✅
- **Auth**: Hybrid Clerk (Frontend) + mixed JWT/Dev-Header mode (Backend).
- **Items Lifecycle**: Create -> Enriching -> Ready -> Confirm/Discard -> Archived.
- **AI Enrichment**: Async worker using LiteLLM (supports OpenAI/Gemini) to generate titles/tags.
- **Tag Management**: CRUD, soft-delete, and tag suggestion system.
- **Search V1**: Postgres `pg_trgm` based lexical search (Tag-only and Combined modes).
- **Rate Limiting**: AI Daily Quota and Concurrency limits enforced per user plan (Free/Pro).
- **Backend**: FastAPI clean architecture, SQLAlchemy async, Alembic migrations.
- **Frontend**: Next.js App Router, shadcn/ui shell, basic API integration.

### In Progress / Known Gaps 🚧
- **Search V2**: Semantic search with vector embeddings is designed but NOT implemented.
- **Frontend**: Some pages are using mock data or incomplete API wiring (check `client.ts` feature flags).
- **Mobile**: Responsive web only; no native app.

---

## 2. Architecture at a Glance

### Frontend (`/frontend`)
- **Framework**: Next.js 15+ (App Router), TypeScript, Tailwind CSS.
- **UI Library**: `shadcn/ui` (Radix Primitives).
- **State**: `TanStack Query` (React Query) for server state. Minimal global state.
- **Key Path**: `src/lib/api/client.ts` (API Client with 429 interceptors).

### Backend (`/backend`)
- **Framework**: FastAPI (Async).
- **DB**: PostgreSQL 15+ (Async behaviors required).
- **ORM**: SQLAlchemy 2.0+ (AsyncSession).
- **Task Queue**: "Outbox Pattern" with in-process Polling Worker (for MVP).
  - *Prod Path:* Replace in-process worker with SQS/Redis consumer without changing domain logic.
- **AI**: `litellm` abstraction layer.

### Auth Flow
- **Frontend**: Clerk Provider.
- **Backend**: Validates Bearer Token (JWT) OR `X-Dev-User-Id` (if `AUTH_MODE=mixed/dev`).

---

## 3. Key Domain Model

### Item Status Machine
See `docs/architecture/state_machine.md`.
1. **ENRICHING**: Initial state after capture. Worker is processing.
2. **READY_TO_CONFIRM**: Enrichment done. Waiting for user review.
3. **FAILED**: Enrichment failed (retryable).
4. **ARCHIVED**: User confirmed. Visible in Library/Search.
5. **DISCARDED**: User rejected. Soft deleted logic.

### Tags
- **ItemTags**: Many-to-Many relationship.
- **Suggestions**: AI writes to `item_tag_suggestions`, not `item_tags`. User "Accepts" suggestions to promote them to real tags.
- **Constraints**: Tags have `deleted_at` for soft deletes.

### Quotas
- **Free**: 50/day, 3 concurrent.
- **Pro**: 500/day, 10 concurrent.
- Checked in `CreateItemUseCase`.

---

## 4. API & Error Contract

### Canonical Source
`docs/architecture/API_CONTRACT_V1.md`

### Error Envelope
All errors (4xx/5xx) follow this shape:
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Item not found",
    "requestId": "req-123",
    "details": { ... }
  }
}
```
**Header**: `X-Request-Id` is required in response.

### Idempotency
- **Header**: `Idempotency-Key` (UUID).
- **Behavior**: If key exists for user, return cached 201/200 response.

---

## 5. Engineering Rules (Non-Negotiables)

1. **Clean Architecture**:
   - `domain/` CANNOT import `application/` or `infrastructure/`.
   - `domain/` CANNOT import frameworks (FastAPI, Pydantic, SQLAlchemy).
   - See `backend/ARCHITECTURE_RULES.md`.
2. **Async First**: All I/O must be `async/await`.
3. **Microcopy**: Never hardcode UI text. Use keys from `docs/design/MICROCOPY.md`.
4. **Testing**:
   - Backend: Integration tests in `backend/tests/` (pytest) are mandatory for new features.
   - Frontend: Mock-first development.
5. **Linting**:
   - Backend: `uv run ruff check .`
   - Frontend: `npm run lint`

---

## 6. Local Development Quickstart

### Backend
Directory: `/backend`
```bash
# 1. Start DB
docker compose up -d

# 2. Setup Env
cp .env.example .env
# Edit .env: Set LLM_PROVIDER=stub (for no cost) or litellm (with API keys)

# 3. Install & Migrate
uv sync
uv run alembic upgrade head

# 4. Run Server
uv run uvicorn app.main:app --reload --port 8080

# 5. Run Tests
uv run pytest
```

### Frontend
Directory: `/frontend`
```bash
# 1. Install
npm install

# 2. Run
npm run dev
# App at http://localhost:3000
```

---

## 7. Workflow for Adding a Feature

1. **Docs First**: Update `API_CONTRACT_V1.md` or `data_model_v1.md`.
2. **Backend Implementation**:
   - Define Entity/Interface in `domain/`.
   - Implement Repository in `infrastructure/persistence/`.
   - Implement Use Case in `application/`.
   - wire API endpoint in `api/v1/`.
3. **Backend Test**: Write `tests/test_feature.py` (Integration).
4. **Frontend Implementation**:
   - Update `client.ts` types and methods.
   - Create UI components using `shadcn`.
   - Connect with React Query.
5. **Verification**: Manual Verify + Update `process/` log.

---

## 8. Golden Paths (Keep these green)

1. **AI Capture**: User types text -> Save -> Toast "Generating" -> Appears in Pending.
2. **Manual Capture**: User toggles "Enrich" OFF -> Save -> Appears in Library.
3. **Review Flow**: Open Pending Item -> Edit text -> Accept Tag -> Confirm -> Toast "Saved".
4. **Library**: Scroll timeline -> Click item -> Edit Title.

---

## 9. Troubleshooting

- **Alembic Error**: `Target database is not up to date`. Run `uv run alembic upgrade head`.
- **Worker Not Processing**: Check logs. If `OutboxEnrichmentService` is used, ensure `worker.start()` is called in `main.py` lifespan.
- **429 Errors**: You hit the daily quota. Update `ai_daily_usage` table manually or restart DB to reset (if using ephemeral test DB).
- **CORS**: Ensure `CORS_ORIGINS` in `.env` matches frontend URL.

---

## 10. Glossary

- **Enrichment**: The process of AI analyzing text to generate metadata.
- **Outbox**: A database table used as a queue for reliable async processing.
- **Idempotency**: Preventing duplicate actions (charges/creations) on retried requests.
- **Stub**: A fake implementation (e.g., Stub LLM) used for testing/dev to avoid costs.
