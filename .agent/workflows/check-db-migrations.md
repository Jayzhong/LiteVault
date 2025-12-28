---
description: how to check and fix backend database migration issues
---
# Backend Database Check Workflow

Use this workflow when starting the backend server or if you encounter database errors like "relation does not exist".

## Steps

// turbo
1. Check if PostgreSQL is running:
```bash
cd backend && docker compose ps
```

// turbo
2. Check current tables in database:
```bash
cd backend && docker compose exec postgres psql -U litevault -d litevault -c "\dt"
```

Expected tables (5 total):
- alembic_version
- enrichment_outbox
- idempotency_keys
- items
- users

// turbo
3. Check alembic migration status:
```bash
cd backend && uv run alembic current
```

4. If tables are missing but alembic_version exists, reset migrations:
```bash
cd backend && docker compose exec postgres psql -U litevault -d litevault -c "DELETE FROM alembic_version;"
```

5. Run migrations from scratch:
```bash
cd backend && uv run alembic upgrade head
```

// turbo
6. Verify all migrations applied:
```bash
cd backend && uv run alembic current
```

Should show: `003_add_profile_fields (head)`

// turbo
7. Start the backend server:
```bash
cd backend && uv run uvicorn app.main:app --reload --port 8080
```

## Root Cause

This issue occurs when:
- Docker volume is reset/recreated (tables gone, but alembic_version may persist)
- Database is recreated manually
- Alembic version table gets out of sync with actual schema

## Prevention

Always run `uv run alembic upgrade head` after:
- Pulling new code with migrations
- Resetting Docker volumes
- Setting up on a new machine
