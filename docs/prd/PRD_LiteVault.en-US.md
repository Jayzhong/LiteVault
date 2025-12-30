# LiteVault Product Requirements Document (PRD)

**Version**: 1.0 (V1 Current)
**Date**: 2025-12-30
**Status**: Live / iterating
**Language**: en-US

---

## 1. Overview

### 1.1 Problem Statement
In the age of information overload, knowledge workers struggle to capture fleeting thoughts and organize them effectively. Traditional note-taking apps are either too simple (lacking organization) or too complex (requiring upfront taxonomy). Users need a "second brain" that offers frictionless capture now and intelligent organization later.

### 1.2 Product Vision
**LiteVault** is a personal ideas & knowledge management tool designed for the "capture now, organize later" workflow. It leverages AI to handle the heavy lifting of summarization and tagging, but strictly keeps the user in the control loop.
*   **Lightweight Capture**: Reduce friction to zero.
*   **AI-Assisted Enrichment**: Automatically generate titles, summaries, and tags.
*   **Human-in-the-Loop**: AI suggestions are drafts; the user makes the final decision.
*   **Trust**: Your data is yours. AI is a tool, not the owner.

### 1.3 Target Users
*   **Knowledge Workers**: Researchers, writers, developers who consume and generate high volumes of information.
*   **Lifelong Learners**: People who want to retain what they read and think.

---

## 2. Current V1 (Implemented)

This section describes the functionality currently deployed in the `main` branch.

### 2.1 Information Architecture
The application is organized into four primary views (accessible via Sidebar on Desktop, Drawer on Mobile):
1.  **Home (`/`)**: capture interface and "Pending Review" queue.
2.  **Search (`/search`)**: dedicated search interface.
3.  **Library (`/library`)**: timeline view of all confirmed items.
4.  **Settings (`/settings`)**: account profile, preferences, and tag management.

### 2.2 Core Flows & Features

#### 2.2.1 Authentication
*   **Provider**: **Clerk** handles all identity management (Sign Up, Sign In, Profile, Session).
*   **Backend Sync**: Users are mapped to a local `users` table via `clerk_user_id` on their first API request.
*   **Secure Access**: All data endpoints are protected by JWT verification.

#### 2.2.2 Capture & Enrichment
*   **Capture Input**: Simple text area on Home. Supports `#` trigger for inline tag selection.
*   **Modes**:
    *   **AI Enrichment (Default)**: Item enters `ENRICHING` state. An async background worker generates a **Title**, **Summary**, and **Suggested Tags**.
    *   **Manual Save**: User toggles AI off. Item is saved directly to `ARCHIVED` (Library) with raw text and manual tags only.
*   **States**: `DRAFT` (Client) -> `SAVING` -> `ENRICHING` (Server) -> `READY_TO_CONFIRM`.

#### 2.2.3 Pending Review (Human-in-the-Loop)
*   **Queue**: Items in `READY_TO_CONFIRM` state appear in the "Pending Review" section on Home.
*   **Review Modal**:
    *   Displays AI-generated summary.
    *   **Tag Review**: User accepts or rejects AI-suggested tags.
    *   **Manual Override**: User can add existing tags from their library.
*   **Actions**:
    *   **Confirm & Save**: item moves to `ARCHIVED` status. Tags are persisted to the global registry.
    *   **Discard**: item moves to `DISCARDED` (soft delete).

#### 2.2.4 Library & Retrieval
*   **Timeline**: Confirmed items are displayed in chronological order (descending `confirmed_at`).
*   **Search V1 (Lexical)**:
    *   **Tag-Only Mode**: Queries starting with `#` search for items matching that specific tag.
    *   **Combined Mode**: Text queries match against Title OR Summary OR Raw Text OR Tags (`pg_trgm` fuzzy matching).
*   **Pagination**: Cursor-based pagination `(confirmed_at, id)` for stable infinite scroll.

#### 2.2.5 Tag Management
*   **Global Registry**: Tags are user-scoped unique items.
*   **Attributes**: Name (case-preserving), Color (Hex code), Usage Count.
*   **Management Actions**:
    *   **Create**: Implicitly during capture or explicitly in Settings. Upsert behavior (revives soft-deleted tags).
    *   **Update**: Rename or change color.
    *   **Delete**: Soft-delete (hides from UI, preserves historical data).

### 2.3 System & Non-Functional Requirements
*   **Reliability**: Async enrichment uses an "Outbox Pattern" to ensure jobs are never lost, even if the worker crashes.
*   **Cost Guardrails**:
    *   **Quotas**: Daily limit on AI enrichments (Free: 50, Pro: 500).
    *   **Concurrency**: Limit simultaneous jobs per user to prevent abuse.
*   **Latency**: Capture API returns `201 Created` immediately (<200ms), offloading AI work to background.

---

## 3. UX Requirements

### 3.1 Interface States
*   **Loading**: Skeleton screens must be used for card lists and detailed views. No blocking spinners for read operations.
*   **Empty States**: All lists (Library, Pending, Search, Tags) must have descriptive empty states with actionable calls-to-action (e.g., "Save a thought to start...").
*   **Error Handling**: Transient errors (network) trigger toast notifications with "Retry" options. Persistent errors (AI failure) allow manual retry or discard.

### 3.2 Microcopy & Localization
*   **Strategy**: All UI strings are centralized in `microcopy.ts` (synced with `docs/design/MICROCOPY.md`). No hardcoded strings in components.
*   **Tone**: Calm, minimal, supportive.

### 3.3 Mobile Responsiveness
*   **Navigation**: Collapsible "Sheet" drawer on mobile vs. persistent Sidebar on desktop.
*   **Layout**:
    *   **Home**: Two-row capture input stacks vertically.
    *   **Tables**: Tag management converts from Table rows (Desktop) to Card format (Mobile).

---

## 4. Privacy & Trust

### 4.1 Data Storage
*   All user content (Notes, Summaries, Tags) is stored in a private PostgreSQL database.
*   Data is strictly isolated by `user_id` at the repository level.

### 4.2 AI Usage Disclosure
*   **Transparency**: Users are explicitly informed that their text is processed by an LLM (LiteLLM provider) for enrichment.
*   **Opt-Out**: Users can disable "AI Suggestions" globally in Settings or per-item during capture.
*   **Data Retention**: We do not use user data to train public models.

### 4.3 Human Control
*   **No Silent Writes**: AI never writes directly to the user's permanent Library. All AI outputs must pass through the "Pending Review" staging area (unless the user explicitly chooses otherwise in future iterations).

---

## 5. Success Metrics

### 5.1 Activation
*   **Signup**: Verified email/account creation.
*   **Aha! Moment**: First "Confirm" action (moving an item from Pending to Library).

### 5.2 Engagement
*   **Capture Volume**: Number of items created per week.
*   **Review Rate**: % of Pending items confirmed vs. discarded.
*   **Retrieval**: Number of searches or library scrolls per week.

---

## 6. Constraints & Limitations

*   **No Semantic Search**: V1 relies on keyword matching. Synonyms (e.g., "car" vs "auto") are not linked.
*   **No Native App**: Web-only implementation (PWA-ready).
*   **Single Tenant**: No team/shared vaults.

---

## 7. Roadmap & Iterations

### 7.1 Near-term: V1.1 / V1.2
*   **Focus**: Stability, Polish, Mobile Optimization.
*   **Feature Gaps**:
    *   **Mobile Polish**: Improved touch targets and gesture support for "Swipe to Discard".
    *   **Tag Analytics**: Visual breakdown of tag usage in Settings.
    *   **Export**: Simple JSON/Markdown export for user data portability.

### 7.2 Medium-term: V2
*   **Theme A: Automated Organization (Clustering)**
    *   *Value*: Reduce tag clutter.
    *   *Scope*: AI job to scan library and suggest merging similar tags (e.g., "dev", "development", "coding").
*   **Theme D: Semantic Retrieval**
    *   *Value*: Find ideas by concept, not just keyword.
    *   *Scope*: Implement Vector Database (pgvector). Embed items on confirmation. "Ask your vault" natural language interface.
*   **Theme E: Personalization**
    *   *Value*: AI sounds more like the user.
    *   *Scope*: Configurable AI tone/length settings.

### 7.3 Long-term Vision: V3
*   **Theme B: Knowledge Graph**
    *   *Value*: Discover hidden connections.
    *   *Scope*: Auto-linking related notes ("This note is related to X because..."). Graph visualization.
*   **Theme C: Review & Recall**
    *   *Value*: Active learning.
    *   *Scope*: Spaced repetition system (SRS) for revisiting old notes. "On this day" surfaced memories.
*   **Theme G: Safety & Health**
    *   *Value*: Prevent knowledge rot.
    *   *Scope*: Automated identifying of "stale" or "conflicting" information.
