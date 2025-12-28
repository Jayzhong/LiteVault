# Backend Phase 0: Walking Skeleton

> Process document for LiteVault backend implementation
> Created: 2025-12-27

---

## 1. Scope

Implement a minimal but runnable backend with:
- FastAPI + SQLAlchemy async + Alembic + Postgres
- Core endpoints: health, items CRUD, retry
- Async enrichment via outbox + in-process worker
- Idempotency for POST /items
- Request ID middleware + standard error envelope
- Integration tests against real Postgres

**Out of scope for Phase 0:**
- Library endpoints (`GET /library`)
- Tags endpoints (`GET/POST/PATCH/DELETE /tags`)
- Search endpoint (`POST /search`)
- Auth endpoints (`/auth/*`)
- Production-ready observability

---

## 2. Plan Checklist

### A) Process Documentation
- [x] Create this document

### B) Backend Bootstrap
- [ ] Create project structure (`/backend/app/`)
- [ ] Set up `pyproject.toml` with dependencies
- [ ] Create `docker-compose.yml` for Postgres
- [ ] Create `.env.example`
- [ ] Create config module (`app/config.py`)
- [ ] Set up SQLAlchemy async + Alembic
- [ ] Create initial migration (users, items, item_tags, idempotency_keys, enrichment_outbox)

### C) Core Infrastructure
- [ ] Request ID middleware (generate or accept `X-Request-Id`)
- [ ] Error handlers + standard envelope
- [ ] Dev auth middleware (`X-Dev-User-Id`, auto-create user)
- [ ] Domain exceptions registry

### D) Endpoints
- [ ] `GET /health` → `{"status": "ok"}`
- [ ] `POST /items` (with idempotency, enqueue outbox)
- [ ] `GET /items/pending`
- [ ] `GET /items/{id}`
- [ ] `PATCH /items/{id}` (confirm/discard/edit + state validation)
- [ ] `POST /items/{id}/retry`

### E) Enrichment Worker
- [ ] In-process worker loop (poll every 2s)
- [ ] `SELECT FOR UPDATE SKIP LOCKED` pattern
- [ ] Stub AI provider (deterministic title/summary)
- [ ] Handle success → READY_TO_CONFIRM
- [ ] Handle failure → FAILED (with max retries)
- [ ] Skip if item already DISCARDED

### F) Integration Tests
- [ ] Test setup: docker-compose + pytest fixtures
- [ ] Test `GET /health`
- [ ] Test `POST /items` creates item with ENRICHING
- [ ] Test `POST /items` idempotency (same key = same item)
- [ ] Test `PATCH /items/{id}` confirm while ENRICHING → 409
- [ ] Test `PATCH /items/{id}` discard from READY_TO_CONFIRM → 200
- [ ] Test `POST /items/{id}/retry` from FAILED → 200
- [ ] Test `POST /items/{id}/retry` from READY_TO_CONFIRM → 400
- [ ] Test error envelope includes `requestId`

---

## 3. Progress Checklist

> Updated as implementation proceeds — **ALL COMPLETE** ✅

- [x] B) Backend Bootstrap
- [x] C) Core Infrastructure
- [x] D) Endpoints
- [x] E) Enrichment Worker
- [x] F) Integration Tests

---

## 4. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ORM | SQLAlchemy 2.0 async | Per ARCHITECTURE_RULES.md |
| Migrations | Alembic | Standard for SQLAlchemy |
| Test DB | Postgres via docker-compose | Real DB for integration tests |
| Dev Auth | X-Dev-User-Id header | Per API_CONTRACT_V1.md |
| Idempotency Scope | User + Key | Per ARCHITECTURE_RULES.md |
| Worker Pattern | In-process asyncio task | Per backend_architecture_v1.md (dev MVP) |

---

## 5. Risks

| Risk | Mitigation |
|------|------------|
| Worker blocks event loop | Use `asyncio.sleep` not `time.sleep`; keep AI stub fast |
| Race conditions on item update | Use `FOR UPDATE` row lock in transactions |
| Idempotency key collision | Unique constraint (user_id, key) in DB |
| Test isolation | Truncate tables between tests, use transactions |

---

## 6. Open Questions / Proposed Resolutions

| Question | Resolution |
|----------|------------|
| Should we use testcontainers or docker-compose? | docker-compose (simpler setup) |
| Should tags be auto-created on confirm? | Yes, per use_cases_v1.md |
| What happens if enrichment outbox already exists for item? | Skip duplicate insert, not error |

---

## 7. How to Run Locally

> **Dependency Management**: This project uses [uv](https://docs.astral.sh/uv/) for dependency management.

```bash
# 1. Start Postgres
cd backend
docker compose up -d

# 2. Install dependencies (uv creates venv automatically)
uv sync

# 3. Run migrations
uv run alembic upgrade head

# 4. Start server
uv run uvicorn app.main:app --reload --port 8080

# 5. Verify
curl http://localhost:8080/health
```

### Makefile Shortcuts

```bash
make dev-db    # Start Postgres
make migrate   # Run migrations
make dev       # Start dev server
make test      # Run tests
make setup     # Full fresh clone setup
```

---

## 8. How to Run Tests

```bash
# Ensure Postgres is running
docker compose up -d

# Run tests
uv run pytest -v

# With coverage
uv run pytest --cov=app --cov-report=term-missing
```

---

## 9. File Structure (Target)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app factory
│   ├── config.py                  # Pydantic settings
│   │
│   ├── domain/
│   │   ├── __init__.py
│   │   ├── entities/
│   │   │   ├── item.py
│   │   │   └── user.py
│   │   ├── value_objects.py       # ItemStatus, SourceType
│   │   ├── exceptions.py          # Domain exceptions
│   │   └── repositories/
│   │       ├── item_repository.py # ABC
│   │       └── user_repository.py # ABC
│   │
│   ├── application/
│   │   ├── __init__.py
│   │   ├── items/
│   │   │   ├── create_item.py
│   │   │   ├── get_pending_items.py
│   │   │   ├── get_item.py
│   │   │   ├── update_item.py
│   │   │   ├── retry_enrichment.py
│   │   │   └── dtos.py
│   │   └── ports/
│   │       └── enrichment_service.py  # ABC
│   │
│   ├── infrastructure/
│   │   ├── __init__.py
│   │   ├── persistence/
│   │   │   ├── database.py        # Engine, session
│   │   │   ├── models/            # SQLAlchemy models
│   │   │   ├── repositories/      # Implementations
│   │   │   └── mappers/           # Entity ↔ Model
│   │   └── enrichment/
│   │       ├── worker.py          # Background loop
│   │       └── stub_provider.py   # Fake AI
│   │
│   └── api/
│       ├── __init__.py
│       ├── v1/
│       │   ├── items.py
│       │   └── health.py
│       ├── schemas/
│       │   ├── items.py
│       │   └── errors.py
│       ├── dependencies.py
│       ├── middleware.py          # RequestId
│       └── error_handlers.py
│
├── alembic/
│   ├── alembic.ini
│   ├── env.py
│   └── versions/
│
├── tests/
│   ├── conftest.py
│   ├── test_health.py
│   ├── test_items.py
│   └── test_error_handling.py
│
├── docker-compose.yml
├── .env.example
├── pyproject.toml
├── uv.lock                # Committed lock file
├── Makefile               # Dev commands
└── README.md
```
