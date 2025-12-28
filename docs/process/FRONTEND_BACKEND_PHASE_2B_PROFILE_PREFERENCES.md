# Phase 2B: App Profile + Preferences

> Created: 2025-12-28

---

## 1. Scope

### In Scope
- Backend: Profile fields (nickname, bio, preferences_json) on users table
- Backend: GET /me, PATCH /me/profile, PATCH /me/preferences endpoints
- Backend: Integration tests for all endpoints
- Frontend: useAccountProfile() hook (Clerk + backend merge)
- Frontend: Wire AccountCard with real data
- Frontend: Edit Profile modal with nickname/avatarUrl/bio
- Frontend: Preferences persistence (language, timezone, AI toggle)

### Out of Scope
- Tags/Search/Library endpoints
- UI redesign
- Password management (handled by Clerk)
- Profile image upload (only URL supported)

---

## 2. Plan Checklist

### A) Backend Model + Endpoints + Tests
- [ ] Create migration 003: add nickname, bio, preferences_json columns
- [ ] Update User entity with new fields
- [ ] Add validation schemas (Pydantic)
- [ ] Implement GET /me (returns merged user+profile+prefs)
- [ ] Implement PATCH /me/profile (nickname, avatarUrl, bio)
- [ ] Implement PATCH /me/preferences (language, timezone, aiSuggestionsEnabled)
- [ ] Add tests: GET /me, PATCH profile, PATCH prefs, 401, 400 validation

### B) Frontend Hook + UI Wiring
- [ ] Create useAccountProfile() hook with TanStack Query
- [ ] Wire AccountCard (name, email, avatar, memberSince)
- [ ] Implement Edit Profile modal
- [ ] Wire PreferencesCard controls
- [ ] Add loading/error states

### C) Documentation + Verification
- [ ] Update API_CONTRACT_V1.md with /me endpoints
- [ ] Update data_model_v1.md with profile fields
- [ ] Update process doc progress
- [ ] Execute manual verification

---

## 3. Progress Checklist

> Updated as implementation proceeds

- [ ] A) Backend Model + Endpoints + Tests
- [ ] B) Frontend Hook + UI Wiring
- [ ] C) Documentation + Verification

---

## 4. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Profile storage | Columns on `users` table | Simpler than separate table; few fields |
| Preferences format | JSONB column | Flexible; easy to add fields |
| nickname field | Separate from name | name = Clerk-synced display name; nickname = user override |
| Avatar precedence | backend.avatarUrl ?? clerk.imageUrl | User can override Clerk avatar |
| Display name precedence | backend.nickname ?? clerk.fullName ?? email username | Clearer fallback chain |
| Endpoint naming | `/me`, `/me/profile`, `/me/prefs` | RESTful, shorter than /users/me |
| Validation | Server-side primary | Light client validation, authoritative server |

### Field Definitions

| Field | Type | Constraints |
|-------|------|-------------|
| nickname | VARCHAR(40) | nullable, trimmed, 1-40 chars |
| bio | VARCHAR(200) | nullable, max 200 chars |
| avatar_url | TEXT | nullable, must be http(s):// if provided |
| preferences_json | JSONB | default {} |

### Preferences Schema

```json
{
  "defaultLanguage": "en" | "zh",
  "timezone": "America/New_York",
  "aiSuggestionsEnabled": true
}
```

- defaultLanguage: align with existing UI (en, zh for V1)
- timezone: IANA string (free-form for V1)
- aiSuggestionsEnabled: boolean (default true)

---

## 5. Risks / Open Questions

| Risk | Mitigation |
|------|------------|
| Clerk data stale | JIT upsert refreshes email from token claims |
| Large bio text | Database VARCHAR(200) enforces limit |

| Question | Resolution |
|----------|------------|
| Should we store Clerk email in DB? | Yes, for display + JIT upsert on auth |
| Timezone picker? | V1: text input or browser detected; V2: proper picker |

---

## 6. How to Run

### Backend

```bash
cd backend
docker compose up -d
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8080
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Env Vars

**Backend `.env`:**
```
AUTH_MODE=mixed
CLERK_JWT_ISSUER=https://your-instance.clerk.accounts.dev
CLERK_JWKS_URL=https://your-instance.clerk.accounts.dev/.well-known/jwks.json
```

**Frontend `.env.local`:**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_USE_REAL_API=true
NEXT_PUBLIC_USE_CLERK_AUTH=true
NEXT_PUBLIC_USE_REAL_PROFILE=true
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

---

## 7. How to Test

### Backend Tests

```bash
cd backend
uv run pytest -v
```

### Specific Profile Tests

```bash
uv run pytest tests/test_profile.py -v
```

---

## 8. Manual Verification Script

| Step | Action | Expected |
|------|--------|----------|
| 1 | Start backend + frontend | Both running |
| 2 | Sign in via Clerk | Redirect to home |
| 3 | Go to /settings | AccountCard shows Clerk email + name |
| 4 | Click "Edit Profile" | Modal opens |
| 5 | Enter nickname "TestNick" | Input accepts |
| 6 | Click Save | Toast "Profile updated" |
| 7 | Refresh /settings | Nickname persists |
| 8 | Toggle AI suggestions OFF | Saves |
| 9 | Refresh /settings | Toggle still OFF |
| 10 | Go to / (Home) | Items flow works |
| 11 | Sign out | Redirect to /auth/login |

---

## 9. Proposed Commits

1. **feat(backend): add profile/prefs migration + endpoints**
2. **test(backend): add profile/prefs integration tests**
3. **feat(frontend): add useAccountProfile hook**
4. **feat(frontend): wire Settings with real profile data**
5. **docs: update API contract + data model**
