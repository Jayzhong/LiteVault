# LiteVault V1 Security Review

**Date:** 2025-12-30  
**Scope:** Backend API, Frontend, Auth flow

---

## 1. Threat Model Highlights

### Attack Surface

| Component | Threat | Risk |
|-----------|--------|------|
| API Endpoints | Unauthorized access | High |
| User Data | Cross-user data leakage | Critical |
| LLM Integration | Prompt injection | Medium |
| Database | SQL injection | High |
| Session | Token theft/replay | Medium |

### Trust Boundaries
- **Frontend ↔ Backend:** JWT validation required
- **Backend ↔ Database:** Parameterized queries
- **Backend ↔ LLM:** Controlled prompts (Instructor schema)

---

## 2. Authentication & Authorization

### Findings

| Check | Status | Details |
|-------|--------|---------|
| JWT Validation | ✅ PASS | Clerk JWKS verification |
| Protected Routes | ✅ PASS | `get_current_user` dependency |
| User Isolation | ✅ PASS | All queries filter by `user_id` |
| Dev Bypass | ⚠️ WARN | `AUTH_MODE=mixed` allows X-Dev-User-Id |

### Remediation
- **P0:** Set `AUTH_MODE=clerk` in production environment
- **P0:** Remove or firewall dev bypass in production

---

## 3. Data Access Controls

### User Data Isolation

All data queries are scoped by `user_id`:

```python
# Example from items.py
.where(ItemModel.user_id == current_user.id)
```

**Verified in:**
- `/api/v1/items/*`
- `/api/v1/library`
- `/api/v1/tags/*`
- `/api/v1/search`

### Findings
| Check | Status | Details |
|-------|--------|---------|
| Items scoped to user | ✅ PASS | |
| Tags scoped to user | ✅ PASS | |
| Library scoped to user | ✅ PASS | |
| No admin endpoints | ✅ PASS | No privilege escalation |

---

## 4. Injection Vulnerabilities

### SQL Injection

| Check | Status | Details |
|-------|--------|---------|
| SQLAlchemy ORM | ✅ PASS | Parameterized queries |
| Raw SQL usage | ✅ PASS | None found |
| pg_trgm queries | ✅ PASS | Parameterized |

### Prompt Injection (LLM)

| Check | Status | Details |
|-------|--------|---------|
| User input in prompts | ⚠️ WARN | Raw text sent to LLM |
| Schema validation | ✅ PASS | Instructor enforces output schema |
| Output sanitization | ✅ PASS | Stored as-is (no code execution) |

**Mitigation:** AI-generated content is advisory only; user confirms before archiving.

---

## 5. Secrets Management

| Check | Status | Details |
|-------|--------|---------|
| `.env` in `.gitignore` | ✅ PASS | |
| No secrets in code | ✅ PASS | |
| `CLERK_SECRET_KEY` handling | ✅ PASS | Server-side only |
| API keys in env | ✅ PASS | Not hardcoded |

### Git History Check
```bash
git log --all --full-history -- '*/.env' '**/*secret*' '**/*key*'
# Result: No matches (clean)
```

---

## 6. Network Security

### CORS Configuration

| Check | Status | Details |
|-------|--------|---------|
| Restrictive origins | ✅ PASS | Configurable via `CORS_ORIGINS` |
| Credentials allowed | ✅ PASS | Required for cookies |
| Methods restricted | ✅ PASS | `GET,POST,PATCH,DELETE,OPTIONS` |

**Remediation:**
```python
# config.py - update for production
cors_origins: list[str] = ["https://yourdomain.com"]
```

### Security Headers

| Header | Present | Recommendation |
|--------|---------|----------------|
| X-Frame-Options | ❌ | Add `DENY` |
| X-Content-Type-Options | ❌ | Add `nosniff` |
| Content-Security-Policy | ❌ | Add basic CSP |

**Remediation:** Add security headers middleware (P1).

---

## 7. Session & Cookie Security

- **Session Management:** Clerk-managed (secure defaults)
- **Cookies:** Set by Clerk SDK with `Secure`, `HttpOnly`, `SameSite=Lax`
- **Token Storage:** Clerk uses secure storage

---

## 8. SSRF Protection

| Check | Status | Details |
|-------|--------|---------|
| User-controlled URLs | ✅ PASS | No URL fetch features |
| LLM output URLs | ✅ PASS | Not followed/rendered |

---

## 9. Recommendations Summary

| Priority | Issue | Remediation | Owner |
|----------|-------|-------------|-------|
| P0 | AUTH_MODE default | Set to `clerk` in prod | DevOps |
| P0 | CORS origins | Set to production domain | DevOps |
| P1 | Security headers | Add middleware | Backend |
| P1 | CORS methods | Restrict to used methods | Backend |
| P2 | Rate limit per-IP | Add IP-based throttling | Backend |

---

## 10. Appendix: Code References

- Auth dependency: `app/api/dependencies.py:get_current_user`
- CORS config: `app/main.py:create_app`
- User isolation: All route handlers use `current_user.id`
