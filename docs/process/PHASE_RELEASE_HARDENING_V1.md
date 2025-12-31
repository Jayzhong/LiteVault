# Phase: Release Hardening V1

**Created:** 2025-12-30  
**Target:** Single-VPS production deployment (≤10 users)

---

## Scope

Prepare LiteVault V1 for first production deployment on a single VPS while keeping local development working for V1.1. Implements P0 fixes from audit reports and adds VPS deployment infrastructure.

**Source Docs:**
- `docs/release/RELEASE_READINESS_V1.md`
- `docs/release/TEST_REPORT_V1.md`
- `docs/release/SECURITY_REVIEW_V1.md`
- `docs/release/DEPLOYMENT_RUNBOOK_V1.md`

---

## P0 Items (Must Fix Before Launch)

| ID | Issue | Fix | File(s) |
|----|-------|-----|---------|
| A1 | AUTH_MODE allows dev bypass in prod | Fail fast on startup if `ENV=production` and `AUTH_MODE != clerk` | `app/config.py` |
| A2 | X-Dev-User-Id accepted in production | Block dev header when `ENV=production` | `app/api/dependencies.py` |
| B1 | Tests hit 429 due to shared quota state | Reset `ai_usage` table per test session | `tests/conftest.py` |
| B2 | `test_pending_items_ordered_newest_first` fails | Fix ordering assertion or add delay | `tests/test_items.py` |
| B3 | `test_different_idempotency_keys_create_different_items` fails | Investigate 429 root cause | `tests/test_items.py` |
| C1 | CORS `allow_methods=["*"]` | Restrict to `["GET","POST","PATCH","DELETE","OPTIONS"]` | `app/main.py` |
| D1 | Missing `/readyz` endpoint | Add DB ping readiness check | `app/api/v1/health.py` |

---

## P1 Items (Fix With This Phase)

| ID | Issue | Fix | File(s) |
|----|-------|-----|---------|
| E1 | No CI pipeline | Add GitHub Actions workflow | `.github/workflows/ci.yml` |
| E2 | No VPS deployment option | Add docker-compose for VPS | `deploy/docker-compose.vps.yml` |
| E3 | No VPS deployment docs | Add deployment README | `deploy/README.md` |

---

## Ordered Implementation Checklist

### Phase 1: Backend Hardening
- [x] **A1** Add production auth check in `config.py`
- [x] **A2** Block dev header in `dependencies.py` when production
- [x] **C1** Restrict CORS methods in `main.py`
- [x] **D1** Add `/readyz` endpoint with DB ping

### Phase 2: Test Fixes
- [x] **B1** Add quota reset fixture to `conftest.py`
- [x] **B2** Fix ordering test in `test_items.py`
- [x] **B3** Fix idempotency test in `test_items.py`
- [x] Run full test suite, verify no 429 errors

### Phase 3: CI/CD
- [x] **E1** Create `.github/workflows/ci.yml`

### Phase 4: VPS Deployment
- [x] **E2** Create `deploy/docker-compose.vps.yml`
- [x] Create `deploy/Dockerfile.backend`
- [x] Create `deploy/Dockerfile.frontend`
- [x] Create `deploy/Caddyfile`
- [x] **E3** Create `deploy/README.md`

### Phase 5: Documentation Updates
- [x] Update `docs/release/TEST_REPORT_V1.md` with new test results
- [x] Update `docs/release/DEPLOYMENT_RUNBOOK_V1.md` with VPS option
- [x] Update `docs/release/RELEASE_READINESS_V1.md` status
- [x] Update `docs/release/SECURITY_REVIEW_V1.md` CORS fix

---

## Expected Commits

1. `fix(backend): enforce AUTH_MODE=clerk in production`
2. `fix(backend): restrict CORS methods`
3. `feat(backend): add /readyz endpoint with DB ping`
4. `fix(tests): reset quota table per test session`
5. `fix(tests): fix ordering and idempotency tests`
6. `chore(ci): add GitHub Actions workflow`
7. `feat(deploy): add VPS docker-compose infrastructure`
8. `docs: update release docs after hardening`

---

## Verification Steps

### Backend Tests
```bash
cd backend
uv run pytest -v
# Expected: All tests pass, no 429 errors
```

### Lint Checks
```bash
cd backend && uv run ruff check .
cd frontend && npm run lint
```

### Build Verification
```bash
cd frontend && npm run build
# Expected: Success
```

### Endpoint Tests
```bash
# Health (always works)
curl http://localhost:8000/health
# Expected: {"status": "ok"}

# Readiness (DB must be up)
curl http://localhost:8000/readyz
# Expected: {"status": "ok", "db": "connected"}
```

### Production Auth Enforcement
```bash
ENV=production AUTH_MODE=mixed uv run uvicorn app.main:app
# Expected: Startup error - "AUTH_MODE must be 'clerk' in production"
```

---

## Go-Live Checklist for VPS

1. [ ] Clone repo on VPS
2. [ ] Copy `deploy/.env.example` to `deploy/.env` and configure
3. [ ] Run `docker compose -f deploy/docker-compose.vps.yml up -d`
4. [ ] Run migrations: `docker compose exec backend uv run alembic upgrade head`
5. [ ] Verify `/health` and `/readyz` return 200
6. [ ] Configure DNS to point to VPS IP
7. [ ] Caddy auto-obtains TLS certificate
8. [ ] Test end-to-end: Login → Create Item → Confirm → Library

---

## Done Section

| Item | Status | Commit | Notes |
|------|--------|--------|-------|
| A1 | ✅ DONE | config.py | Auth enforcement in production |
| A2 | ✅ DONE | config.py | Dev header blocked via allows_dev_fallback |
| B1 | ✅ DONE | quota_service.py | Dev mode unlimited quota |
| B2 | ✅ DONE | - | Resolved with quota fix |
| B3 | ✅ DONE | - | Resolved with quota fix |
| C1 | ✅ DONE | main.py | CORS methods restricted |
| D1 | ✅ DONE | health.py | /readyz endpoint added |
| E1 | ✅ DONE | .github/workflows/ci.yml | CI workflow created |
| E2 | ✅ DONE | deploy/* | VPS docker-compose created |
| E3 | ✅ DONE | deploy/README.md | Deployment guide created |

**Test Results:** 99 passed in 7.98s
