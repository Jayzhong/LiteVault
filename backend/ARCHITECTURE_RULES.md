# LiteVault Backend Architecture Rules

> Mandatory constraints for all backend code in `/backend`
> Extends Clean Architecture / DDD principles with LiteVault-specific conventions

---

## 1. Core Architecture Principles

### 1.1 Dependency Rule (Strict)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frameworks / Drivers                     │
│  FastAPI, SQLAlchemy, httpx, Pydantic (API layer only)          │
├─────────────────────────────────────────────────────────────────┤
│                        Interface Adapters                       │
│  Repositories (impl), Controllers, Presenters                   │
├─────────────────────────────────────────────────────────────────┤
│                        Application Layer                        │
│  Use Cases, Application Services, DTOs                          │
├─────────────────────────────────────────────────────────────────┤
│                        Domain Layer                             │
│  Entities, Value Objects, Domain Services, Repository Interfaces│
└─────────────────────────────────────────────────────────────────┘
           ↑ Dependencies point INWARD only ↑
```

**Rules:**
- Domain layer has ZERO external dependencies (no SQLAlchemy, no Pydantic, no FastAPI)
- Application layer depends only on Domain
- Infrastructure/Adapters depend on Application and Domain
- FastAPI routes are thin wrappers around use cases

### 1.2 Entity vs ORM Model Separation

```
domain/entities/item.py      → Pure Python dataclass, no ORM decorators
infra/models/item_model.py   → SQLAlchemy model with DB mapping
infra/mappers/item_mapper.py → Converts between Entity ↔ Model
```

**Never** import ORM models in domain or application layers.

### 1.3 Pydantic Isolation

Pydantic schemas live **only** in the API layer:

```
api/schemas/items.py    → CreateItemRequest, ItemResponse
application/dtos/       → Plain dataclasses for use case I/O
```

Use cases receive/return plain dataclasses, NOT Pydantic models.

### 1.4 Async-First

All I/O operations must be async:
- Repository methods: `async def get_by_id(...)`
- Use cases: `async def execute(...)`
- External service calls: `async def call_ai_service(...)`

Use `asyncio` for concurrency, not threading.

### 1.5 Dependency Injection via FastAPI Depends

```python
# api/dependencies.py
def get_item_repository() -> ItemRepository:
    return SQLAlchemyItemRepository(get_db_session())

def get_create_item_use_case(
    repo: ItemRepository = Depends(get_item_repository),
    enrichment_service: EnrichmentService = Depends(get_enrichment_service),
) -> CreateItemUseCase:
    return CreateItemUseCase(repo, enrichment_service)
```

No global singletons. No service locator pattern.

---

## 2. Module Structure

```
backend/
├── app/
│   ├── domain/                    # Pure business logic
│   │   ├── entities/              # Item, Tag, User entities
│   │   ├── value_objects/         # ItemStatus, SourceType
│   │   ├── services/              # Domain services (pure logic)
│   │   ├── repositories/          # Repository interfaces (ABC)
│   │   └── exceptions.py          # Domain exceptions
│   │
│   ├── application/               # Use cases / orchestration
│   │   ├── items/                 # Item use cases
│   │   │   ├── create_item.py
│   │   │   ├── confirm_item.py
│   │   │   ├── discard_item.py
│   │   │   ├── retry_enrichment.py
│   │   │   └── dtos.py
│   │   ├── tags/                  # Tag use cases
│   │   ├── search/                # Search use cases
│   │   ├── library/               # Library use cases
│   │   └── auth/                  # Auth use cases (TBD)
│   │
│   ├── infrastructure/            # External concerns
│   │   ├── persistence/           # SQLAlchemy repos, models
│   │   ├── ai/                    # AI provider adapters
│   │   ├── enrichment/            # Enrichment worker
│   │   └── observability/         # Logging, metrics
│   │
│   ├── api/                       # FastAPI layer
│   │   ├── v1/                    # API version
│   │   │   ├── items.py
│   │   │   ├── tags.py
│   │   │   ├── search.py
│   │   │   ├── library.py
│   │   │   └── auth.py
│   │   ├── schemas/               # Pydantic schemas
│   │   ├── dependencies.py        # DI wiring
│   │   ├── middleware.py          # Request ID, error handling
│   │   └── error_handlers.py      # Exception → HTTP response
│   │
│   ├── config.py                  # Settings via pydantic-settings
│   └── main.py                    # FastAPI app factory
│
├── tests/                         # Mirrors app/ structure
├── alembic/                       # Migrations
├── pyproject.toml
└── ARCHITECTURE_RULES.md          # This file
```

### Module Naming Conventions

| Domain | Module Name | Responsibility |
|--------|-------------|----------------|
| Items | `items` | Capture, enrich, confirm/discard lifecycle |
| Tags | `tags` | CRUD, merge, usage counting |
| Library | `library` | Archived items listing, timeline |
| Search | `search` | Semantic search, answer synthesis |
| Auth | `auth` | Registration, login, session (TBD) |

---

## 3. Async Enrichment Strategy

### Dev MVP: Outbox + In-Process Worker

```
┌────────────────────────────────────────────────────────────┐
│                     POST /items                            │
│                          │                                 │
│                          ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Insert item (status=ENRICHING)                   │  │
│  │  2. Insert row into enrichment_outbox table          │  │
│  │  3. COMMIT transaction                               │  │
│  │  4. Return 201 immediately                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  IN-PROCESS WORKER (asyncio.create_task)             │  │
│  │  - Polls outbox every 2 seconds                      │  │
│  │  - Claims job (SELECT FOR UPDATE SKIP LOCKED)        │  │
│  │  - Calls AI provider                                 │  │
│  │  - Updates item status                               │  │
│  │  - Deletes outbox row                                │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

**Limitations (documented for future):**
- Single instance only (no horizontal scaling)
- Lost jobs on app crash (outbox + retry mitigates)
- No job priority or dead-letter queue

### Production Path: Message Queue

Replace in-process worker with:
- Redis/SQS/RabbitMQ producer in use case
- Separate worker process consuming queue
- Same use case interface, different `EnrichmentService` impl

```python
# application/items/create_item.py
class CreateItemUseCase:
    def __init__(self, repo: ItemRepository, enrichment_service: EnrichmentServicePort):
        ...

# Dev: enrichment_service = OutboxEnrichmentService(...)
# Prod: enrichment_service = SQSEnrichmentService(...)
```

---

## 4. Idempotency Handling

### `POST /items` Idempotency

**Strategy:** Store `Idempotency-Key` in `idempotency_keys` table.

```python
# Middleware or use case:
async def check_idempotency(user_id: str, key: str) -> Optional[Item]:
    existing = await idempotency_repo.get(user_id, key)
    if existing:
        return existing.response_item  # Return cached response
    return None

async def save_idempotency(user_id: str, key: str, item: Item):
    await idempotency_repo.save(user_id, key, item, ttl=24h)
```

**Rules:**
- Key is **user-scoped**: same key from different users = different requests
- TTL: 24 hours (configurable)
- If key exists: return cached response (200 OK with original item)
- Error code for replay: `409 DUPLICATE_REQUEST` only if response was error

---

## 5. Request ID Propagation

### Generation

```python
# api/middleware.py
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id") or f"req-{uuid4()}"
    request.state.request_id = request_id
    
    with request_id_context(request_id):  # contextvars
        response = await call_next(request)
    
    response.headers["X-Request-Id"] = request_id
    return response
```

### Propagation

- Stored in `contextvars` for access in any layer
- Included in all log entries
- Returned in error envelope (`error.requestId`)
- Passed to AI provider calls as correlation ID

---

## 6. Error Envelope Compliance

All exceptions must map to the standard envelope:

```python
# domain/exceptions.py
class DomainException(Exception):
    code: str = "INTERNAL_ERROR"
    http_status: int = 500
    
class ItemNotFoundException(DomainException):
    code = "NOT_FOUND"
    http_status = 404

class InvalidStateTransitionException(DomainException):
    code = "INVALID_STATE_TRANSITION"
    http_status = 409
```

```python
# api/error_handlers.py
@app.exception_handler(DomainException)
async def domain_exception_handler(request: Request, exc: DomainException):
    return JSONResponse(
        status_code=exc.http_status,
        content={
            "error": {
                "code": exc.code,
                "message": str(exc),
                "requestId": request.state.request_id,
                "details": getattr(exc, 'details', None),
            }
        }
    )
```

### Error Code Registry

Must match `docs/architecture/error_handling.md`:

| Code | HTTP | Domain Exception Class |
|------|------|------------------------|
| `VALIDATION_ERROR` | 400 | `ValidationException` |
| `UNAUTHORIZED` | 401 | `UnauthorizedException` |
| `FORBIDDEN` | 403 | `ForbiddenException` |
| `NOT_FOUND` | 404 | `ItemNotFoundException`, `TagNotFoundException` |
| `DUPLICATE_REQUEST` | 409 | `DuplicateRequestException` |
| `INVALID_STATE_TRANSITION` | 409 | `InvalidStateTransitionException` |
| `INVALID_STATE` | 400 | `InvalidStateException` |
| `TAG_EXISTS` | 409 | `TagExistsException` |
| `RATE_LIMITED` | 429 | `RateLimitException` |
| `AI_SERVICE_UNAVAILABLE` | 503 | `AIServiceUnavailableException` |
| `INTERNAL_ERROR` | 500 | (catch-all) |

---

## 7. Testing Requirements

### Test Pyramid

```
        ┌─────────────┐
        │   E2E (5%)  │  ← API integration tests
       ─┴─────────────┴─
      ┌─────────────────┐
      │ Integration (20%)│  ← Repository + DB tests
     ─┴─────────────────┴─
    ┌─────────────────────┐
    │     Unit (75%)      │  ← Domain + Use Case tests
    └─────────────────────┘
```

### Unit Test Rules

- Domain entities: test business logic without mocks
- Use cases: mock repository interfaces
- No database access in unit tests

### Integration Test Rules

- Use test database (SQLite in-memory or Postgres testcontainer)
- Test repository implementations against real DB
- Test API endpoints with TestClient

---

## 8. Non-Negotiable Constraints

| Constraint | Enforcement |
|------------|-------------|
| No framework imports in `domain/` | Linting rule + code review |
| No Pydantic in `application/` | Linting rule + code review |
| All public methods have type hints | mypy strict mode |
| All async I/O | Linting for sync DB calls |
| 100% error code coverage | Error handler tests |

---

## 9. Questions / Proposed Resolutions

| Question | Resolution |
|----------|------------|
| Should `DISCARDED` items be hard-deleted or soft-deleted? | Soft delete per state_machine.md (status column) |
| Should idempotency check be middleware or use case? | Use case level for domain visibility |
| Should we use Celery for prod or keep simple? | Start with outbox, production path is SQS/Redis |
