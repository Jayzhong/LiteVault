# Frontend Auth UX Fixes

> Created: 2025-12-28

## Scope

- Make Home (/) and Search (/search) public for signed-out users
- Protect only /settings, /library
- Add action gating on Home and Search for signed-out users
- Add dropdown menu to UserCard (Settings + Log out)

---

## Decisions

| Decision | Choice |
|----------|--------|
| Protected routes | /settings, /library only |
| Public routes | /, /search, /auth/login, /auth/signup |
| Action gating | Check auth on submit, redirect if signed out |
| Draft persistence | localStorage before redirect |
| UserCard menu | shadcn DropdownMenu with Settings + Log out |

---

## Verification

**Signed out:**
1. Visit / → Home renders (no redirect)
2. Visit /search → Search renders (no redirect)
3. Click sidebar Library → redirect to /auth/login
4. Click sidebar Settings → redirect to /auth/login
5. On Home: type text, click Save → redirect to /auth/login
6. On Search: type text, click Search → redirect to /auth/login

**Signed in:**
1. UserCard shows real avatar/name/email
2. Click UserCard → menu opens
3. Settings → navigates to /settings
4. Log out → redirects to /auth/login
