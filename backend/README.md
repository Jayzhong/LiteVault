# LiteVault Backend

Backend API for LiteVault, built with FastAPI + SQLAlchemy + PostgreSQL.

## Quick Start

### Prerequisites

- Python 3.11+
- Docker and Docker Compose
- [uv](https://docs.astral.sh/uv/) (Python package manager)

### 1. Start Database

```bash
cd backend
docker compose up -d
```

### 2. Install Dependencies

```bash
uv sync
```

### 3. Copy Environment File

```bash
cp .env.example .env
```

### 4. Run Migrations

```bash
uv run alembic upgrade head
```

### 5. Start Server

```bash
uv run uvicorn app.main:app --reload --port 8080
```

### 6. Verify

```bash
curl http://localhost:8080/health
# {"status": "ok"}
```

## Makefile Commands

For convenience, a Makefile is provided:

```bash
make dev-db    # Start Postgres
make migrate   # Run migrations
make dev       # Start dev server
make test      # Run tests
make setup     # Full fresh clone setup
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/items` | Create item |
| GET | `/api/v1/items/pending` | List pending items |
| GET | `/api/v1/items/{id}` | Get item by ID |
| PATCH | `/api/v1/items/{id}` | Update item (confirm/discard/edit) |
| POST | `/api/v1/items/{id}/retry` | Retry failed enrichment |

## Authentication (Dev Mode)

Add header `X-Dev-User-Id: <any-string>` to all requests. User is auto-created if not exists.

```bash
curl -H "X-Dev-User-Id: user-123" http://localhost:8080/api/v1/items/pending
```

## Idempotency

For `POST /items`, use `Idempotency-Key` header:

```bash
curl -X POST http://localhost:8080/api/v1/items \
  -H "X-Dev-User-Id: user-123" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{"rawText": "My note"}'
```

## Running Tests

```bash
# Ensure Postgres is running
docker compose up -d

# Run all tests
uv run pytest -v

# With coverage
uv run pytest --cov=app --cov-report=term-missing
```

## Project Structure

```
backend/
├── app/
│   ├── domain/          # Pure business logic
│   ├── application/     # Use cases
│   ├── infrastructure/  # External concerns (DB, worker)
│   ├── api/             # FastAPI routes
│   ├── config.py        # Settings
│   └── main.py          # App factory
├── alembic/             # Migrations
├── tests/               # Integration tests
├── docker-compose.yml   # Postgres
├── pyproject.toml       # Dependencies
├── uv.lock              # Lock file (committed)
└── Makefile             # Dev commands
```

## Architecture

See:
- `/backend/ARCHITECTURE_RULES.md` - Coding standards
- `/docs/architecture/backend_architecture_v1.md` - System design
- `/docs/architecture/API_CONTRACT_V1.md` - API spec
