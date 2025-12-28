# Phase 2: Clerk Authentication

> Process doc for LiteVault Clerk integration
> Created: 2025-12-28

---

## 1. Scope

Integrate Clerk (https://clerk.com/) as the authentication provider:

### In Scope
- Backend: Clerk JWT verification middleware
- Backend: Auth precedence (Clerk JWT → Dev fallback)
- Backend: User persistence via just-in-time upsert (keyed by clerk_user_id)
- Backend: GET /auth/me endpoint
- Frontend: Clerk SDK integration (@clerk/nextjs)
- Frontend: SignUp/SignIn pages with Clerk components
- Frontend: Token attachment to API requests
- Architecture doc updates (API contract, data model, backend architecture)
- Alembic migration for `clerk_user_id` column

### Out of Scope (Phase 3+)
- Clerk webhooks (user.created/updated/deleted sync)
- Advanced Clerk features (organizations, MFA)
- Tags/Search/Library endpoints

---

## 2. Clerk Dashboard Setup (One-Time Manual)

> Document these steps for reference; do not automate

### 2.1 Create Application
1. Go to https://dashboard.clerk.com
2. Create new application: "LiteVault"
3. Note down:
   - `CLERK_PUBLISHABLE_KEY` (frontend)
   - `CLERK_SECRET_KEY` (backend, if needed for API calls)

### 2.2 Enable Authentication Methods
1. Go to User & Authentication → Email, Phone, Username
2. Enable: **Email address** (required)
3. Enable: **Password** (recommended)

### 2.3 Enable OAuth Providers
1. Go to User & Authentication → Social Connections
2. Enable: **Google**
3. Enable: **GitHub**
4. Configure OAuth app credentials for each

### 2.4 Configure Redirect URLs
1. Go to Settings → Paths
2. Add allowed redirect URLs:
   - `http://localhost:3000/`
   - `http://localhost:3000/*`
   - `http://localhost:3000/auth/login`
   - `http://localhost:3000/auth/signup`

### 2.5 Get JWT Configuration
1. Go to Configure → JWT Templates (or use default)
2. Note the issuer URL: `https://<your-instance>.clerk.accounts.dev`
3. JWKS URL: `https://<your-instance>.clerk.accounts.dev/.well-known/jwks.json`

---

## 3. Plan Checklist

### A) Architecture Doc Updates
- [ ] Update `API_CONTRACT_V1.md`:
  - Deprecate POST /auth/signup, /login, /logout
  - Define auth scheme: `Authorization: Bearer <Clerk JWT>`
  - Add GET /auth/me endpoint
  - Document 401 error cases
- [ ] Update `data_model_v1.md`:
  - Add `clerk_user_id` to users table (unique, indexed)
  - Remove `password_hash` field documentation
- [ ] Update `backend_architecture_v1.md`:
  - Add "Auth Adapter" module diagram
  - Document auth precedence strategy

### B) Backend Implementation
- [ ] Add dependencies: `PyJWT`, `cryptography`, `httpx` (for JWKS fetch)
- [ ] Create Alembic migration:
  - Add `clerk_user_id` column (nullable initially)
  - Add unique index
- [ ] Implement Clerk JWT verification:
  - Fetch and cache JWKS
  - Verify signature, exp, nbf, iss, aud
  - Extract `sub` claim as clerk_user_id
- [ ] Implement auth dependency with precedence:
  - If `Authorization: Bearer` → verify Clerk JWT
  - Else if `X-Dev-User-Id` AND `AUTH_MODE=mixed|dev` → use dev fallback
  - Else → 401 UNAUTHORIZED
- [ ] Implement just-in-time user upsert:
  - On first authenticated request, create user row from JWT claims
- [ ] Add GET /auth/me endpoint
- [ ] Update .env.example with auth vars

### C) Backend Integration Tests
- [ ] 401 when no auth headers in mixed/clerk mode
- [ ] Dev fallback works in mixed mode (no regression)
- [ ] Clerk JWT verification with local test RSA key:
  - Generate RSA key pair in test
  - Create mock JWKS endpoint
  - Sign JWT with valid claims
  - Verify backend accepts token
- [ ] GET /auth/me returns current user

### D) Frontend Implementation
- [ ] Install @clerk/nextjs
- [ ] Add ClerkProvider in root layout
- [ ] Add middleware.ts with clerkMiddleware
- [ ] Update /auth/signup page with <SignUp />
- [ ] Update /auth/login page with <SignIn />
- [ ] Update API client:
  - Get token via useAuth().getToken()
  - Attach Authorization header
- [ ] Update UserCard with Clerk user data
- [ ] Add env vars to .env.local

### E) Verification
- [ ] Backend tests pass
- [ ] Frontend TypeScript builds
- [ ] End-to-end sign up with email
- [ ] End-to-end sign in with Google
- [ ] End-to-end sign in with GitHub
- [ ] Items flow works with Clerk auth
- [ ] Session persists after refresh

---

## 4. Progress Checklist

> Updated as implementation proceeds

- [ ] A) Architecture Doc Updates
- [ ] B) Backend Implementation
- [ ] C) Backend Integration Tests
- [ ] D) Frontend Implementation
- [ ] E) Verification

---

## 5. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| JWT verification | Local verification with JWKS caching | No network call per request |
| User persistence | Just-in-time upsert on first request | Simpler than webhooks for MVP |
| Auth precedence | Clerk JWT > X-Dev-User-Id (if allowed) | Smooth local development |
| AUTH_MODE env | `clerk`, `mixed`, `dev` | Explicit control over fallback |
| Token source | Authorization header (not cookies) | Cross-origin API calls |
| Frontend SDK | @clerk/nextjs | Official Next.js App Router support |

---

## 6. Risks / Open Questions

| Risk | Mitigation |
|------|------------|
| JWKS fetch failure | Cache JWKS with TTL, fallback on error |
| Token expiry during long session | Frontend handles 401, redirects to login |
| Clerk outage | Dev fallback mode available |

| Question | Proposed Resolution |
|----------|---------------------|
| Should we sync user email/name from Clerk? | Yes, on JWT verify extract from claims and upsert |
| What claims are in Clerk JWT? | `sub` (clerk_user_id), `email`, `name`, `azp`, `exp`, `iss` |
| Multiple users with same email from different providers? | Clerk handles, clerk_user_id is unique per account |

---

## 7. How to Run

### Backend

```bash
cd backend

# Create .env with:
cat > .env << EOF
DATABASE_URL=postgresql+asyncpg://litevault:litevault_dev@localhost:5432/litevault
AUTH_MODE=mixed
CLERK_JWT_ISSUER=https://<your-instance>.clerk.accounts.dev
CLERK_JWKS_URL=https://<your-instance>.clerk.accounts.dev/.well-known/jwks.json
EOF

docker compose up -d
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8080
```

### Frontend

```bash
cd frontend

# Create .env.local with:
cat > .env.local << EOF
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_USE_REAL_API=true
NEXT_PUBLIC_USE_CLERK_AUTH=true
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
EOF

npm install
npm run dev
```

---

## 8. How to Test

### Backend Integration Tests

```bash
cd backend
uv run pytest -v
```

### Specific Auth Tests

```bash
# All auth tests
uv run pytest tests/test_auth.py -v

# JWT verification
uv run pytest tests/test_auth.py::test_clerk_jwt_verification -v
```

---

## 9. Manual Verification Script

### Prerequisites
1. Clerk application configured with Google/GitHub OAuth
2. Backend running on `http://localhost:8080`
3. Frontend running on `http://localhost:3000`
4. Both .env files configured with Clerk keys

### Steps

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open `http://localhost:3000/auth/signup` | Clerk SignUp form |
| 2 | Sign up with email/password | Redirect to Home |
| 3 | Verify UserCard shows email | User info displayed |
| 4 | Try save → pending → confirm flow | Works with Clerk auth |
| 5 | Open new incognito window | Session not shared |
| 6 | Sign in with Google | Works, redirects to Home |
| 7 | Sign in with GitHub | Works, redirects to Home |
| 8 | Refresh page | Session persists |
| 9 | Click logout | Redirects to login |

---

## 10. Proposed Commits

1. **docs: update architecture for Clerk auth**
   - API contract, data model, backend architecture

2. **feat(backend): add Clerk JWT verification**
   - JWKS caching, token validation, auth dependency

3. **feat(backend): add clerk_user_id migration**
   - Alembic migration, user model update

4. **test(backend): add auth integration tests**
   - Local RSA key signing, mock JWKS

5. **feat(frontend): integrate Clerk SDK**
   - ClerkProvider, middleware, auth pages

6. **feat(frontend): attach auth tokens to API client**
   - useAuth().getToken(), Authorization header

7. **docs: update process doc with verification**

---

## 11. Environment Variables Reference

### Backend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTH_MODE` | No | `mixed` | `clerk`, `mixed`, `dev` |
| `CLERK_JWT_ISSUER` | If clerk/mixed | - | Clerk instance issuer URL |
| `CLERK_JWKS_URL` | If clerk/mixed | - | JWKS endpoint URL |
| `CLERK_AUDIENCE` | No | - | Expected `aud` claim (optional) |

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | No | For SSR auth checks |
| `NEXT_PUBLIC_USE_CLERK_AUTH` | No | Enable Clerk auth |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Backend URL |
