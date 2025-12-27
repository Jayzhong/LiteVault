# Frontend Rules (LiteVault Web)

These rules define non-negotiable constraints and best practices for implementing the LiteVault frontend.

## 1) Scope & Ownership
- All frontend code MUST live under `/frontend`.
- Do not modify files outside `/frontend` unless explicitly requested.
- The UI/interaction source of truth:
  - `/docs/prd/PDD_LiteVault_V1.1.en-US.md`
  - `/docs/design/UI_INTERACTION_SPEC.md`
  - `/docs/design/MICROCOPY.md`

## 2) Tech Stack (Fixed)
- Next.js (App Router) + TypeScript
- Tailwind CSS
- shadcn/ui components
- ESLint + Prettier

## 3) Architecture Principles
- Prefer a clean, layered component structure:
  - `src/app/**` routes
  - `src/components/layout/**` app shell and shared layout
  - `src/components/domain/**` domain components (items/search/library/settings/tags)
  - `src/components/ui/**` primitives (shadcn-based)
  - `src/lib/**` types, api client, fixtures, utilities
- Reuse components aggressively where the design is consistent:
  - `InputBar` (capture/search)
  - `ItemCardBase` (pending/library/evidence)
  - `ModalBase` (insight/item/tag modals)

## 4) State Management (Recommended)
- Use TanStack Query (React Query) for server-state (fetching/caching/mutations).
- Keep local UI state minimal (modals, input text, filters).
- Avoid adding heavy global state libraries unless there is a clear need.

## 5) Implementation Strategy (Mandatory)
- Build UI with MOCK DATA first, then integrate real APIs.
- Phase order:
  1) App shell + routes
  2) Page layouts
  3) Mock fixtures + interactions
  4) Loading/empty/error states
  5) API integration
- No real auth/backends required until the mock-driven flows are complete.

## 6) Required Pages & Routes (V1)
- `/` Home (capture + Pending Review)
- `/search` Search (Answer + Evidence)
- `/library` Library (timeline list)
- `/settings` Settings
- `/settings/tags` Tag Management
- `/auth/signup` Sign up
- `/auth/login` Sign in

## 7) Required UI States (Non-negotiable)
Every page MUST implement:
- Loading state (prefer skeletons)
- Empty state (clear copy + CTA)
- Error state (inline retry + toast)

Specific domain states MUST match the spec:
- Pending item statuses: ENRICHING / READY_TO_CONFIRM / FAILED
- Search states: IDLE / SEARCHING / RESULTS / NO_RESULTS / ERROR

## 8) UX Consistency Rules
- Use microcopy keys from `/docs/design/MICROCOPY.md` verbatim.
- Maintain visual consistency:
  - soft green for primary actions and active nav
  - rounded cards and inputs
  - subtle borders and generous whitespace
- Avoid dead controls:
  - If a feature isn’t implemented in V1, do not render its button/toggle (or render with explicit “Coming soon” behavior—pick one and apply consistently).

## 9) API Integration Guidelines (When you get there)
- Create a typed API client in `src/lib/api/`.
- Define shared TS types in `src/lib/types/`.
- Use environment variables for API base URL:
  - `NEXT_PUBLIC_API_BASE_URL`
- Normalize errors into a common shape and show:
  - Toast for high-level feedback
  - Inline retry for recovery

## 10) Quality Bar
- TypeScript strict mode ON.
- Lint + format on commit (recommended).
- Basic unit tests are optional in V1, but component props should be typed and validated.
- No console errors/warnings in dev for primary flows.

## 11) Deliverables & Definition of Done (DoD)
A feature is considered done only if:
- UI matches layout and behavior in `UI_INTERACTION_SPEC.md`
- Copy matches `MICROCOPY.md`
- Loading/empty/error states are implemented
- Works with mock fixtures end-to-end (save → pending → modal → confirm → library; search → answer + evidence; tags page filters)