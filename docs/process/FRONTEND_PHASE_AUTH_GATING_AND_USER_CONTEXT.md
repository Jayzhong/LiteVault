# Frontend Phase: Auth Gating + User Context

> Created: 2025-12-28

## 1. Scope

### In Scope
- Route protection for all app pages (/, /search, /library, /settings)
- Sign out redirect to /auth/login
- Replace mock user identity with Clerk + backend data
- UserCard in sidebar, Home greeting

### Out of Scope
- Backend changes
- UI redesign

---

## 2. Plan Checklist

- [x] Review existing middleware.ts and components
- [ ] Fix middleware.ts: make "/" protected (not public)
- [ ] Update UserCard with useAccountProfile
- [ ] Update Home greeting with useAccountProfile
- [ ] Verify sign out redirects properly
- [ ] Test all protected routes

---

## 3. Decisions

| Decision | Choice |
|----------|--------|
| Route protection | Clerk middleware with createRouteMatcher |
| Public routes | /auth/login, /auth/signup, /api/health only |
| Sign out redirect | Explicit redirectUrl to /auth/login |
| Display name fallback | nickname > clerkFullName > email prefix > "Member" |

---

## 4. How to Verify

1. Signed out: visit /, /search, /library, /settings → all redirect to /auth/login
2. Sign in: redirect back to originally requested page
3. UserCard shows real name/email/avatar
4. Home greeting shows real name
5. Sign out: redirects to /auth/login
