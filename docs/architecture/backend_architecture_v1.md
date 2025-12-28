# LiteVault Backend Architecture V1

> System architecture for LiteVault backend
> Covers component design, dev MVP strategy, and production path

---

## 1. Overview

### Goals

- Serve all endpoints defined in `API_CONTRACT_V1.md`
- Implement async enrichment without external queue dependencies (dev MVP)
- Enable seamless upgrade to production-grade infrastructure
- Maintain observability for debugging and monitoring

### Principles

- **Clean Architecture**: Business logic independent of frameworks
- **Async-First**: All I/O operations are non-blocking
- **Fail-Safe Enrichment**: Jobs are durable via outbox pattern
- **Observable**: Every request is traceable via `requestId`

---

## 2. Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LiteVault Backend                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         API Layer (FastAPI)                         │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │ /items  │ │ /tags   │ │/library │ │ /search │ │  /auth  │       │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │   │
│  │       │           │           │           │           │             │   │
│  │  ┌────┴───────────┴───────────┴───────────┴───────────┴────┐       │   │
│  │  │              Middleware (Auth, RequestId, Errors)        │       │   │
│  │  └─────────────────────────────────────────────────────────┘       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Application Layer (Use Cases)                  │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │   │
│  │  │ CreateItem   │ │ ConfirmItem  │ │ SearchVault  │  ...           │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│           ┌────────────────────────┼────────────────────────┐              │
│           ▼                        ▼                        ▼              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │  Domain Layer   │    │ Infrastructure  │    │   AI Provider   │        │
│  │  (Entities,     │    │ (Repositories,  │    │   (OpenAI,      │        │
│  │   Value Objects)│    │  Outbox Worker) │    │    Gemini)      │        │
│  └─────────────────┘    └────────┬────────┘    └─────────────────┘        │
│                                  │                                         │
│                                  ▼                                         │
│                         ┌─────────────────┐                                │
│                         │    PostgreSQL   │                                │
│                         │  (items, tags,  │                                │
│                         │   outbox, ...)  │                                │
│                         └─────────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Layer Responsibilities

### 3.1 API Layer

| Component | Responsibility |
|-----------|----------------|
| Routes (`/items`, `/tags`, etc.) | HTTP endpoint handlers, request parsing |
| Schemas | Pydantic models for request/response validation |
| Middleware | Authentication, request ID, error handling |
| Dependencies | DI wiring via FastAPI `Depends` |

**Key Middleware:**

```
Request → AuthMiddleware → RequestIdMiddleware → Route Handler → ErrorHandler → Response
```

### 3.2 Application Layer

| Component | Responsibility |
|-----------|----------------|
| Use Cases | Orchestrate domain logic and infrastructure |
| DTOs | Plain dataclasses for use case input/output |
| Ports | Abstract interfaces for infrastructure services |

**Use Case Pattern:**

```python
class CreateItemUseCase:
    def __init__(self, 
                 item_repo: ItemRepositoryPort,
                 enrichment_service: EnrichmentServicePort,
                 idempotency_repo: IdempotencyRepositoryPort):
        ...
    
    async def execute(self, input: CreateItemInput) -> CreateItemOutput:
        # 1. Check idempotency
        # 2. Create item entity
        # 3. Save to repository  
        # 4. Queue enrichment job
        # 5. Return output
```

### 3.3 Domain Layer

| Component | Responsibility |
|-----------|----------------|
| Entities | `Item`, `Tag`, `User` with business methods |
| Value Objects | `ItemStatus`, `SourceType`, `TagName` |
| Domain Services | Complex logic spanning multiple entities |
| Repository Ports | Abstract interfaces (ABC) |
| Domain Exceptions | Business rule violations |

**No dependencies on external frameworks.**

### 3.4 Infrastructure Layer

| Component | Responsibility |
|-----------|----------------|
| SQLAlchemy Repositories | Implement repository ports |
| ORM Models | Database table mappings |
| Mappers | Entity ↔ Model conversion |
| Enrichment Worker | Process outbox jobs |
| AI Provider Adapters | OpenAI/Gemini API clients |
| **Auth Adapter** | Clerk JWT verification |

### 3.5 Auth Adapter (Clerk)

Handles authentication via Clerk JWT tokens.

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Auth Flow                                      │
│                                                                      │
│  Request ──▶ Extract Token ──▶ Verify JWT ──▶ Get/Create User ──▶   │
│                   │                │               │                 │
│                   ▼                ▼               ▼                 │
│         Authorization header    Clerk JWKS    Just-in-time          │
│         or X-Dev-User-Id        (cached)      user upsert           │
└─────────────────────────────────────────────────────────────────────┘
```

**Auth Precedence:**

```python
def get_current_user(request: Request, settings: Settings, db: Session):
    # 1. Check Authorization: Bearer header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]
        claims = verify_clerk_jwt(token, settings)
        return upsert_user_from_clerk(claims, db)
    
    # 2. Dev fallback (if AUTH_MODE allows)
    if settings.auth_mode in ("mixed", "dev"):
        dev_user_id = request.headers.get("X-Dev-User-Id")
        if dev_user_id:
            return get_or_create_dev_user(dev_user_id, db)
    
    # 3. No valid auth
    raise UnauthorizedException("Missing or invalid authentication")
```

**Configuration:**

| Env Variable | Description |
|--------------|-------------|
| `AUTH_MODE` | `clerk`, `mixed`, `dev` |
| `CLERK_JWT_ISSUER` | Clerk instance URL |
| `CLERK_JWKS_URL` | JWKS endpoint for key verification |

**JWT Verification:**

- Fetch JWKS from Clerk (cached with 1hr TTL)
- Verify signature using RS256
- Validate claims: `exp`, `nbf`, `iss`
- Extract `sub` as `clerk_user_id`

---

## 4. Dev MVP: Outbox + In-Process Worker

### Why Outbox Pattern?

1. **Transactional Consistency**: Item creation and job enqueueing in same transaction
2. **Durability**: Jobs survive process restarts (persisted in DB)
3. **No External Dependencies**: No Redis/RabbitMQ required for dev

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FastAPI Process                             │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      Request Handler                          │  │
│  │  1. Validate request                                          │  │
│  │  2. Call CreateItemUseCase.execute()                          │  │
│  │     → Insert item (status=ENRICHING)                          │  │
│  │     → Insert enrichment_outbox row                            │  │
│  │     → COMMIT                                                  │  │
│  │  3. Return 201                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │               Background Worker (asyncio task)                │  │
│  │  Loop every 2 seconds:                                        │  │
│  │    1. SELECT * FROM enrichment_outbox                         │  │
│  │       WHERE status='PENDING' AND claimed_at IS NULL           │  │
│  │       ORDER BY created_at LIMIT 5                             │  │
│  │       FOR UPDATE SKIP LOCKED                                  │  │
│  │                                                               │  │
│  │    2. For each job:                                           │  │
│  │       a. Set claimed_at = now()                               │  │
│  │       b. Call AI provider                                     │  │
│  │       c. Update item (title, summary, tags, status)           │  │
│  │       d. Delete outbox row                                    │  │
│  │                                                               │  │
│  │    3. On failure:                                             │  │
│  │       a. Increment attempt_count                              │  │
│  │       b. If attempt_count >= 3: mark item as FAILED           │  │
│  │       c. Clear claimed_at (release lock)                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Outbox Table Schema

```sql
CREATE TABLE enrichment_outbox (
    id UUID PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES items(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempt_count INT NOT NULL DEFAULT 0,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_error TEXT
);

CREATE INDEX idx_outbox_pending ON enrichment_outbox(status, claimed_at) 
    WHERE status = 'PENDING' AND claimed_at IS NULL;
```

### Limitations (Acknowledged)

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Single instance only | No horizontal scaling | Acceptable for dev/small prod |
| Jobs lost on hard crash | Items stuck in ENRICHING | Stale job cleanup cron |
| No priority queue | All jobs equal priority | V1 acceptable |
| No dead-letter queue | Failed jobs need manual handling | Admin endpoint for retry-all |

---

## 5. Production Path: Queue-Based Worker

When scaling is required, replace the in-process worker with a proper queue:

```
┌────────────────┐     ┌─────────────────┐     ┌────────────────┐
│  FastAPI API   │────▶│  Message Queue  │────▶│  Worker Pool   │
│                │     │  (SQS/Redis)    │     │                │
└────────────────┘     └─────────────────┘     └────────────────┘
        │                                              │
        └──────────────── PostgreSQL ──────────────────┘
```

### Migration Strategy

1. Create new `QueueEnrichmentService` implementing `EnrichmentServicePort`
2. Deploy worker as separate process/container
3. Feature flag to switch implementations
4. Remove outbox table after migration

### Interface Stability

```python
# Port (stays the same)
class EnrichmentServicePort(ABC):
    @abstractmethod
    async def enqueue_enrichment(self, item_id: str) -> None: ...

# Dev implementation
class OutboxEnrichmentService(EnrichmentServicePort):
    async def enqueue_enrichment(self, item_id: str) -> None:
        await self.outbox_repo.create(item_id)

# Prod implementation  
class SQSEnrichmentService(EnrichmentServicePort):
    async def enqueue_enrichment(self, item_id: str) -> None:
        await self.sqs_client.send_message(item_id)
```

---

## 6. AI Provider Integration

### Interface

```python
class AIProviderPort(ABC):
    @abstractmethod
    async def enrich_item(self, raw_text: str) -> EnrichmentResult: ...
    
    @abstractmethod
    async def search_and_answer(
        self, 
        query: str, 
        context: list[ItemContext]
    ) -> SearchAnswer: ...

@dataclass
class EnrichmentResult:
    title: str
    summary: str
    suggested_tags: list[str]
    source_type: str  # 'NOTE' or 'ARTICLE'
```

### Dev MVP: Stub Implementation

```python
class StubAIProvider(AIProviderPort):
    async def enrich_item(self, raw_text: str) -> EnrichmentResult:
        await asyncio.sleep(1)  # Simulate latency
        return EnrichmentResult(
            title=raw_text[:50] + "...",
            summary=raw_text[:150] + "...",
            suggested_tags=["Ideas", "Notes"],
            source_type="NOTE",
        )
```

### Production: OpenAI/Gemini

```python
class OpenAIProvider(AIProviderPort):
    async def enrich_item(self, raw_text: str) -> EnrichmentResult:
        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[...],
            response_format={"type": "json_object"},
        )
        return EnrichmentResult(**json.loads(response.choices[0].message.content))
```

---

## 7. Observability

### Request ID Propagation

```
Client Request → X-Request-Id header (optional)
       │
       ▼
Middleware generates req-{uuid} if missing
       │
       ▼
Stored in contextvars.ContextVar
       │
       ├──▶ All log entries include request_id
       ├──▶ Error responses include error.requestId
       ├──▶ AI provider calls include correlation_id
       │
       ▼
Response includes X-Request-Id header
```

### Structured Logging

```python
import structlog

logger = structlog.get_logger()

# In use case
logger.info(
    "item_created",
    item_id=item.id,
    status=item.status,
    raw_text_length=len(item.raw_text),
)
```

**Log Format** (JSON):
```json
{
  "timestamp": "2025-12-27T13:00:00.000Z",
  "level": "info",
  "event": "item_created",
  "request_id": "req-550e8400-e29b-41d4-a716-446655440000",
  "item_id": "item-uuid",
  "status": "ENRICHING"
}
```

### Minimal Metrics (V1)

| Metric | Type | Labels |
|--------|------|--------|
| `http_requests_total` | Counter | method, path, status |
| `http_request_duration_seconds` | Histogram | method, path |
| `enrichment_jobs_total` | Counter | status (success/failed) |
| `enrichment_job_duration_seconds` | Histogram | - |

Instrumentation via `prometheus-fastapi-instrumentator` or manual.

### Health Endpoints

```
GET /health          → { "status": "ok" }
GET /health/ready    → Checks DB connection
GET /health/live     → Always returns 200
```

---

## 8. Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `AI_PROVIDER` | No | `stub` | `stub`, `openai`, `gemini` |
| `OPENAI_API_KEY` | If openai | - | OpenAI API key |
| `ENRICHMENT_POLL_INTERVAL_SECS` | No | `2` | Outbox polling interval |
| `ENRICHMENT_MAX_RETRIES` | No | `3` | Max retry attempts |
| `LOG_LEVEL` | No | `INFO` | Logging verbosity |
| `CORS_ORIGINS` | No | `*` | Allowed CORS origins |

### Config Loading

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    ai_provider: str = "stub"
    openai_api_key: str | None = None
    enrichment_poll_interval_secs: int = 2
    enrichment_max_retries: int = 3
    log_level: str = "INFO"
    cors_origins: list[str] = ["*"]
    
    class Config:
        env_file = ".env"
```

---

## 9. Deployment Topology

### Dev (Single Container)

```
┌─────────────────────────────────────┐
│        Docker Container             │
│  ┌────────────────────────────┐     │
│  │  FastAPI + In-Process      │     │
│  │  Enrichment Worker         │     │
│  └────────────────────────────┘     │
│              │                      │
│              ▼                      │
│  ┌────────────────────────────┐     │
│  │     PostgreSQL             │     │
│  │     (or SQLite for dev)    │     │
│  └────────────────────────────┘     │
└─────────────────────────────────────┘
```

### Production (Separate Scaling)

```
                    Load Balancer
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
      ┌────────┐    ┌────────┐    ┌────────┐
      │  API   │    │  API   │    │  API   │
      │ (N=3)  │    │        │    │        │
      └───┬────┘    └───┬────┘    └───┬────┘
          │             │             │
          └─────────────┼─────────────┘
                        │
                        ▼
                   ┌─────────┐
                   │  SQS    │
                   └────┬────┘
                        │
           ┌────────────┼────────────┐
           ▼            ▼            ▼
      ┌─────────┐  ┌─────────┐  ┌─────────┐
      │ Worker  │  │ Worker  │  │ Worker  │
      │ (N=2)   │  │         │  │         │
      └─────────┘  └─────────┘  └─────────┘
                        │
                        ▼
                  ┌──────────┐
                  │ Postgres │
                  │  (RDS)   │
                  └──────────┘
```

---

## 10. Questions / Proposed Resolutions

| Question | Proposed Resolution |
|----------|---------------------|
| Should we use SQLite for local dev? | Yes for simplicity, Postgres for integration tests |
| What happens to in-flight jobs on shutdown? | Graceful shutdown with 30s timeout, unclaimed jobs picked up on restart |
| Should search use vector DB or full-text? | Start with PostgreSQL full-text + pg_trgm, vector DB as future enhancement |
| How to handle AI rate limits? | Exponential backoff in worker, configurable concurrency limit |
