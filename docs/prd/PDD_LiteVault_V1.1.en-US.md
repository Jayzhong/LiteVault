---
title: "LiteVault V1 Product Design Doc (Web)"
version: "1.1"
status: "Draft"
last_updated: "2025-12-27"
owners:
  - Product: "TBD"
  - Design: "TBD"
  - Eng: "TBD"
---

## Table of Contents
- [1. Overview](#1-overview)
- [2. Target Users & Core Scenarios](#2-target-users--core-scenarios)
- [3. V1 Value Proposition & Principles](#3-v1-value-proposition--principles)
- [4. V1 Scope (MVP)](#4-v1-scope-mvp)
- [5. IA & Page Design](#5-ia--page-design)
- [6. Core Flows](#6-core-flows)
- [7. Settings Page (Simple but Extensible)](#7-settings-page-simple-but-extensible)
- [8. Core Data Objects (Product View)](#8-core-data-objects-product-view)
- [9. Backend Capabilities & Draft APIs](#9-backend-capabilities--draft-apis)
- [10. Non-Functional Requirements (NFR)](#10-non-functional-requirements-nfr)
- [11. Milestones & Deliverables](#11-milestones--deliverables)
- [12. Risks & Trade-offs](#12-risks--trade-offs)
- [13. Open Questions](#13-open-questions)
- [14. Glossary](#14-glossary)

---

## 1. Overview

### 1.1 One-liner
LiteVault is a lightweight “store now, recall later” knowledge capture and retrieval tool. Users paste text, hit Save, and the system auto-generates a **title / summary / suggested tags**. Users then confirm the draft in **Pending review** before it is archived. Later, users can ask questions in **Search** and receive a **synthesized answer with evidence**.

### 1.2 Core Loop
Capture → AI Draft → User Review → Recall (Search) → Archive (Library)

### 1.3 Platform Scope
- Web frontend + backend only (no mobile in V1).
- V1 focuses on: text capture, AI drafting, human confirmation, evidence-based search, and timeline library.

---

## 2. Target Users & Core Scenarios

### 2.1 Target Users
- Knowledge workers who capture notes frequently and need reliable recall later
- Users who dislike heavy organization, but want stronger retrieval and trust (via evidence)

### 2.2 Core Scenarios
- Save meeting notes / interview debriefs / learning notes, confirm quickly, retrieve by natural language later
- Trust search answers because each answer comes with clickable evidence

---

## 3. V1 Value Proposition & Principles

### 3.1 Value Proposition
- Lightweight capture: one input box
- AI-assisted organization: auto title/summary/tags
- Reliable recall: synthesized answer + evidence
- User control: edit/confirm/discard before archive

### 3.2 Principles (V1)
- Stay lightweight (avoid “Notion-ification”)
- Default to explainability (evidence is required)
- Human-in-the-loop confirmation before archive
- Reversible actions whenever possible

---

## 4. V1 Scope (MVP)

### 4.1 Must Have
**Global**
- Fixed left sidebar: Home / Search / Library / Settings
- Auth (minimal; finalized in TDD)

**Home (Capture + Pending review)**
- Central multi-line input
- Save button posts text to backend
- Backend asynchronously generates title/summary/suggested tags
- Pending review section renders cards
- Card click opens Detail Modal with edit + Confirm & Save / Discard

**Search (Recall)**
- Query input + Search button
- Backend returns:
  - Synthesized Answer
  - Evidence list (linked to items/snippets)
- Clicking evidence opens the referenced item modal

**Library**
- Reverse chronological item cards
- Card click opens Detail Modal
- Basic filtering (pick at least one for V1): tag filter OR keyword filter

**Tags (Lightweight management)**
- Add/remove tags during confirmation
- Minimal tag management: rename / merge / delete (entry in Settings or Library header)

**Settings**
- Simple settings page (see Section 7)

### 4.2 Nice to Have
- Related items recommendations
- Data export (Markdown/JSON)
- Keyboard shortcuts
- “recent tags” suggestions for consistency

### 4.3 Out of Scope
- Multi-source capture (browser clipper, mobile share, email ingest)
- Collaboration/sharing/public links
- Knowledge graph / heavy workflows
- End-to-end encryption (architectural consideration only)

---

## 5. IA & Page Design

### 5.1 Global Layout
- Left sidebar (consistent across pages)
- Main content area by route
- Shared components:
  - Item Card
  - Item Detail Modal
  - Tag Chips

### 5.2 Home
- Center input + Save
- Pending review cards below
  - Suggested fields: title (or placeholder), truncated summary, tag chips, generation state (loading/done/failed)

### 5.3 Search
- Query input + Search
- Synthesized Answer area (copy-friendly)
- Evidence list (clickable)
  - Optional enhancement: highlight snippet inside modal

### 5.4 Library
- Top filter area (V1: choose one)
- Reverse chronological cards (created_at or confirmed_at)
- Detail Modal on click

---

## 6. Core Flows

### Flow 1: Save (Home → Pending review)
1) User enters text and clicks Save
2) UI shows immediate pending card
3) Backend generates title/summary/tags asynchronously
4) Pending card updates when ready

### Flow 2: Review (Pending → Modal → Confirm/Discard)
- Modal shows raw content + AI draft fields
- User can edit
- Confirm & Save archives the item
- Discard removes or marks discarded

### Flow 3: Search (Query → Answer + Evidence)
- User submits query
- Backend retrieves and synthesizes
- UI renders answer + evidence
- Evidence click opens the referenced item

### Flow 4: Browse (Library → Modal)
- Browse timeline
- Open item details
- (Optional) lightweight edit for archived items

---

## 7. Settings Page (Simple but Extensible)

### 7.1 Suggested Structure (Single page with sections)
**A. Account**
- Profile (read-only or editable placeholder)
- Logout
- Delete account (danger zone; can be placeholder in V1)

**B. Preferences**
- Language (placeholder if not implemented)
- Timezone (placeholder)
- AI drafting toggles (optional)

**C. Data**
- Export my data (JSON/Markdown; placeholder allowed)
- Retention (placeholder)

**D. Tags**
- “Manage tags” entry (subpage or modal)
  - Rename
  - Merge
  - Delete

### 7.2 Tag Management (Lightweight V1)
- Search box to filter tags
- Tag list: name + linked item count
- Inline actions: Rename / Merge / Delete

---

## 8. Core Data Objects (Product View)

**Item**
- id, user_id
- raw_content
- title, summary
- tags (many-to-many)
- status: pending_review | archived | discarded
- created_at, updated_at
- confirmed_at (optional)

**Tag**
- id, user_id, name, created_at

**Search (optional)**
- query_text
- synthesized_answer
- evidence[]: item_id + snippet + score

---

## 9. Backend Capabilities & Draft APIs

**Items**
- POST /items
- GET /items?status=pending_review
- PATCH /items/{id} (edit + confirm/discard)
- DELETE /items/{id} or PATCH status=discarded

**Library**
- GET /library?sort=desc&tag=...&q=...&cursor=...

**Search**
- POST /search → { synthesized_answer, evidence[] }

**Tags**
- GET /tags
- PATCH /tags/{id} (rename)
- POST /tags/merge
- DELETE /tags/{id}

**Enrichment**
- Async job for pending items
- V1 update strategy: polling is acceptable; SSE/WebSocket later

---

## 10. Non-Functional Requirements (NFR)
- Save should be non-blocking (instant feedback)
- Search target P95 < 2s (relax initially if needed)
- Idempotent save (avoid duplicates)
- Basic observability and user-level data isolation

---

## 11. Milestones & Deliverables
0) Walking skeleton: routing + sidebar + backend health + CI
1) Home: POST item + pending list UI
2) Enrichment async pipeline + UI refresh
3) Review modal: confirm/discard/edit
4) Search: answer + evidence
5) Library: timeline + basic filter
6) Settings + tag management

---

## 12. Risks & Trade-offs
- Answer quality variance → mitigate with mandatory evidence
- Async pipeline complexity → start with simplest queue/polling
- Tag UX becoming heavy → keep to rename/merge/delete only in V1

---

## 13. Open Questions
- Auth approach (email/password vs provider vs local-only)
- Evidence granularity (item-level vs snippet-level)
- Timeline sorting basis (created_at vs confirmed_at)
- Discard policy (hard vs soft delete)
- Search strategy (keyword, vector, hybrid)

---

## 14. Glossary
- PDD: Product Design Doc
- IA: Information Architecture
- Pending review: items awaiting confirmation
- Evidence: citations linking answers to stored items/snippets
- RAG: Retrieval-Augmented Generation