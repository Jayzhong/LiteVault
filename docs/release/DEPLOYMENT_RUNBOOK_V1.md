# LiteVault V1 Deployment Runbook

**Version:** 1.0  
**Date:** 2025-12-30

---

## 1. Environment Variables Inventory

### Backend (`/backend/.env`)

| Variable | Required | Default | Production Guidance |
|----------|----------|---------|---------------------|
| `DATABASE_URL` | ✅ | - | `postgresql+asyncpg://user:pass@host:5432/litevault` |
| `ENV` | ❌ | `development` | Set to `production` |
| `AUTH_MODE` | ✅ | `mixed` | **Must be `clerk`** |
| `CLERK_JWT_ISSUER` | ✅ | - | Your Clerk instance URL |
| `CLERK_JWKS_URL` | ✅ | - | Clerk JWKS endpoint |
| `CLERK_AUDIENCE` | ❌ | - | Optional audience validation |
| `LLM_PROVIDER` | ✅ | `stub` | Set to `litellm` for production |
| `LLM_MODEL` | ❌ | `openai/gpt-4o-mini` | LiteLLM model identifier |
| `OPENAI_API_KEY` | conditional | - | Required if using OpenAI |
| `GEMINI_API_KEY` | conditional | - | Required if using Gemini |
| `CORS_ORIGINS` | ✅ | `http://localhost:3000` | Your frontend domain |
| `LOG_LEVEL` | ❌ | `INFO` | `WARNING` for prod |

### Frontend (`/frontend/.env.local`)

| Variable | Required | Production Guidance |
|----------|----------|---------------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | From Clerk dashboard |
| `CLERK_SECRET_KEY` | ✅ | From Clerk dashboard |
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | Backend API URL |

---

## 2. Build & Deploy Steps

### Backend

```bash
# 1. Install dependencies
cd backend
uv sync --frozen

# 2. Run migrations
uv run alembic upgrade head

# 3. Start server (production)
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Docker (if containerized):**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install uv && uv sync --frozen
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend

```bash
# 1. Install dependencies
cd frontend
npm ci

# 2. Build
npm run build

# 3. Start (production)
npm start
```

**Vercel Deployment:**
- Connect repo to Vercel
- Set root directory to `frontend`
- Add environment variables in Vercel dashboard

---

## 2.5 VPS Deployment (Docker Compose)

For single-VPS deployments, see `deploy/README.md` for complete instructions.

```bash
cd deploy
cp .env.example .env
# Edit .env with your values
docker compose -f docker-compose.vps.yml up -d --build
docker compose -f docker-compose.vps.yml exec backend uv run alembic upgrade head
```

Services included:
- PostgreSQL 15 with persistent volume
- Backend (FastAPI)
- Frontend (Next.js standalone)
- Caddy (reverse proxy with auto-TLS)

## 3. Database Migration Strategy

### Pre-Deploy Checks
```bash
# View pending migrations
uv run alembic history --verbose

# Dry run (check SQL)
uv run alembic upgrade head --sql
```

### Apply Migrations
```bash
uv run alembic upgrade head
```

### Rollback (if needed)
```bash
# Rollback one revision
uv run alembic downgrade -1

# Rollback to specific revision
uv run alembic downgrade <revision_id>
```

> ⚠️ Current migrations are additive only. Rollback is safe but generally unnecessary.

---

## 4. Post-Deploy Verification

### Health Check
```bash
curl https://api.yourdomain.com/health
# Expected: {"status": "ok"}
```

### Auth Verification
1. Open frontend, sign in with Clerk
2. Verify user profile loads (`GET /api/v1/auth/me`)
3. Create a test item

### Enrichment Worker
```bash
# Check worker is running (logs should show)
# "EnrichmentWorker started" or similar
```

### Smoke Tests
| Test | Expected |
|------|----------|
| Create item | 201 Created, status ENRICHING |
| List pending | Items appear |
| Item enriched | Status → READY_TO_CONFIRM (within 30s) |
| Confirm item | Status → ARCHIVED |
| Library view | Item appears |

---

## 5. Rollback Steps

### Backend
1. Redeploy previous container/revision
2. (Optional) `alembic downgrade -1` if migration caused issues

### Frontend
- Vercel: Click "Redeploy" on previous deployment
- Manual: `git checkout <prev-tag> && npm run build && npm start`

### Database
- Only if migration is incompatible with rollback code
- Generally safe to leave at head

---

## 6. Operational Notes

### Logs
- Backend: stdout (structured logs recommended)
- Frontend: Vercel logs / browser console

### Request Tracing
- All requests include `X-Request-ID` header (set by `RequestIdMiddleware`)

### Scaling
- V1 is single-instance; horizontal scaling requires stateless worker coordination (future enhancement)
