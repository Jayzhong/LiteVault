# PDD_LiteVault_V1.en-US.md

---
title: "LiteVault V1 Product Design Doc"
version: "1.0"
status: "Draft"
last_updated: "2025-12-26"
---

## Table of Contents
- [1. Product Overview](#1-product-overview)
- [2. Target Users & Core Scenarios](#2-target-users--core-scenarios)
- [3. V1 Value Proposition & Product Principles](#3-v1-value-proposition--product-principles)
- [4. V1 Scope (MVP)](#4-v1-scope-mvp)
- [5. Information Architecture & Key Flows (IA + Flows)](#5-information-architecture--key-flows-ia--flows)
- [6. Core Data Objects (Product View)](#6-core-data-objects-product-view)
- [7. Weekly Digest Design](#7-weekly-digest-design)
- [8. Success Metrics](#8-success-metrics)
- [9. Milestones & Deliverables](#9-milestones--deliverables)
- [10. Risks, Mitigations, and Trade-offs](#10-risks-mitigations-and-trade-offs)
- [11. Non-goals & Future Roadmap](#11-non-goals--future-roadmap)
- [12. Open Questions](#12-open-questions)
- [13. Glossary](#13-glossary)

---

## 1. Product Overview

### 1.1 Name & Slogan
- Product name: **LiteVault (轻藏)**
- Slogan:
  - Chinese: **轻轻一藏，需要就来。**
  - English: **Store lightly. Recall instantly.**

### 1.2 One-line Positioning
A **lightweight personal knowledge capture** tool that turns quick text inputs into searchable, traceable items via **AI-assisted organization**, and helps users rediscover value through a **weekly digest**.

### 1.3 The Problem
People see information constantly (ideas, snippets, takeaways), but:
- they don’t have energy to organize in the moment;
- they can’t find it later when it matters;
- truly important insights aren’t curated and revisited;
- existing tools are either too heavy (high learning/maintenance cost) or encourage dumping everything (noise accumulates).

### 1.4 V1 North Star
Convert any “quick text capture” into a **retrievable, traceable knowledge item** within ~1 minute, with minimal user effort, and reinforce long-term value through a weekly rediscovery loop.

---

## 2. Target Users & Core Scenarios

### 2.1 Personas
- **Knowledge workers**: engineers, PMs, researchers, managers.
- **High-frequency capturers**: frequent ideas but unwilling to maintain complex systems.
- **Retrieval-first users**: value “finding later” more than “organizing now”.

### 2.2 Core V1 Scenarios
1) **Capture**: paste an idea, meeting takeaway, or method into a single input box.
2) **Light confirmation**: AI proposes summary/category/tags; user confirms with minimal edits.
3) **Fast retrieval**: search or ask in natural language; answers must show citations.
4) **Weekly rediscovery**: get a weekly digest summarizing what was saved and what to revisit.

---

## 3. V1 Value Proposition & Product Principles

### 3.1 Value Proposition
- **Low-friction capture**: one input box, no structural overhead.
- **AI does the first pass; user stays in control**: “one confirmation step” prevents drift.
- **Retrieval > organization**: search/Q&A emphasizes traceability and citations.
- **Weekly digest drives ongoing value**: rediscovery becomes a habit.

### 3.2 Non-negotiable Product Rules
1) **Confirmation must be fast**: target < 10 seconds per item.
2) **Ask must be traceable**: answers must include cited items (clickable).
3) **UI must stay light**: only essential fields are prominent by default.
4) **Curate what matters**: confirmation + ranking signals encourage saving the essentials, not everything.

---

## 4. V1 Scope (MVP)

> MVP = Minimum Viable Product: the smallest set of features that proves the core loop.

### 4.1 Must Have
**Account basics**
- Minimal sign-up/login (implementation can be simple in V1)
- Settings: weekly digest toggle + delivery channel (Email first; Push later)

**Capture & Organize**
- One input box + two explicit actions (buttons or segmented control):
  - **Save**
  - **Ask**
- Save flow:
  - submit plain text
  - item goes to Pending
  - AI generates summary, category, tags (with confidence)
  - user confirms -> item goes to Library

**Retrieve**
- Search/Ask:
  - keyword search (acceptable for V1)
  - natural language question (V1 can be “retrieve + short synthesized answer”)
- Results must show cited items
- Item detail page: summary, tags, raw text, timestamps, source placeholders

**Rediscover**
- Weekly digest generation and delivery (Email first)
- Digest template: Top Items / Themes / Re-surface (historical items)

### 4.2 Nice to Have (If time allows)
- Related items (show top 3 similar items)
- Tag dictionary (based on previously confirmed tags)
- Basic export (e.g., Markdown export)

### 4.3 Out of Scope (Explicitly not in V1)
- Flashcards and spaced repetition
- Multi-ingestion channels (browser clipper, iOS share, email forwarding)
- End-to-end encryption (but keep extension points)
- Projects/spaces/knowledge graphs/workflows
- Collaboration, sharing, public links

---

## 5. Information Architecture & Key Flows (IA + Flows)

### 5.1 IA (Pages)
1) **Home / Inbox**
   - input box (primary)
   - Save / Ask switch
   - Pending list (pinned)
   - Library list (recent items)
2) **Confirm Drawer**
3) **Item Detail**
4) **Search / Ask Results**
5) **Settings (Weekly Digest)**
6) **Weekly Digest Archive** (optional)

### 5.2 Flow A: Save
1) User pastes text -> clicks **Save**
2) System creates item with status `PENDING`
3) Background AI enrichment produces:
   - Summary (one-liner + bullet points)
   - Category
   - Tags
4) Item appears in Pending
5) User opens item -> Confirm Drawer:
   - Category: single select (prefilled)
   - Tags: 3–5 suggestions (delete/rename/add)
   - Summary: editable (optional / collapsible)
   - Actions: Confirm & Save / Discard
6) Confirm -> status `CONFIRMED` and visible in Library

### 5.3 Flow B: Ask
1) User types query/question -> clicks **Ask**
2) System returns:
   - Best Matches (ranked item list)
   - Optional Answer (short synthesis)
3) **Citations required**: the Answer must list cited items (clickable)
4) User opens an item -> Item Detail for traceability

### 5.4 Categories & Tags (V1)
- Fixed categories (keep <= 5):
  1) Insight
  2) Reference
  3) How-to
  4) Decision
  5) Quote
- Tags:
  - free-form tags
  - AI suggests with confidence
  - confirmed tags feed a “tag dictionary” for consistency

### 5.5 Microcopy (Suggested)
- Input placeholder: “Paste something you want to keep…”
- Buttons: “Save” / “Ask”
- Pending label: “Pending review”
- Primary action: “Confirm & Save”
- Secondary: “Discard”

---

## 6. Core Data Objects (Product View)

### 6.1 KnowledgeItem
- `id`
- `raw_text`
- `summary` (AI-generated; user-editable)
- `category` (AI suggestion; user-editable)
- `tags[]` (AI suggestions; user-editable)
- `status`: PENDING / CONFIRMED / DISCARDED
- `created_at`
- `confirmed_at` (if any)
- `source_type`: V1 = `manual` (future: web/email/ios)
- `source_ref` (optional placeholder for future traceability)
- `model_info` (model name/version for auditability)

### 6.2 UserEdit
- `item_id`
- `changed_fields` (category/tags/summary)
- `timestamp`

Purpose: personalization later (e.g., preferred tags, auto-cleanup of noisy tags).

---

## 7. Weekly Digest Design

### 7.1 Delivery Strategy
- Default: once per week (e.g., Monday 9:00 AM; configurable later)
- Channel: Email first; Push reserved for iOS/widget future

### 7.2 Digest Template
1) **Top Items**
   - Top 10 confirmed items this week
   - display: summary + category + tags + time
2) **Themes**
   - top 3–5 tags (with counts)
3) **Re-surface**
   - 3 historical items related to this week’s themes

### 7.3 Ranking Signals (V1)
From strongest to weakest:
1) user edited the item (signals importance)
2) user starred it (optional; if not in V1, skip)
3) relevance to weekly themes
4) recency (confirmed_at)

---

## 8. Success Metrics

### 8.1 Activation
- A1: ≥ 3 items confirmed within 24 hours of sign-up
- A2: at least one Ask within the first 7 days

### 8.2 Retrieval Quality
- R1: click-through rate on results/citations after Ask
- R2: follow-up search rate within 24h (finding becomes faster)
- R3: positive loop: Ask leads to more confirmations

### 8.3 Retention
- D7 retention
- Weekly digest open rate
- 24h return rate after digest open

---

## 9. Milestones & Deliverables

### 9.1 Phases
- **M0: Product definition**
  - Deliverable: finalize this PDD
- **M1: Prototype**
  - Deliverable: lo-fi clickable prototype (Save/Confirm/Ask/Digest)
- **M2: Walking Skeleton**
  - Deliverable: login + save raw text + pending/confirm + lists (no AI yet)
- **M3: AI Enrichment**
  - Deliverable: summaries/categories/tags for pending items
- **M4: Ask + Digest**
  - Deliverable: retrieval with citations; weekly digest generation + email
- **M5: V1 Beta**
  - Deliverable: stability, monitoring, fallback UX, feedback channel

### 9.2 Release Gates (V1)
- AI failure must degrade gracefully (manual confirm still possible)
- Ask must not output uncited answers (fallback to results-only)
- Basic privacy hygiene: avoid logging raw_text in plaintext

---

## 10. Risks, Mitigations, and Trade-offs

### 10.1 Key Risks
1) inaccurate tags -> poor retrieval
2) Ask behaves like a chatbot without trust
3) product becomes heavy (drifts toward workspace tools)
4) handling sensitive content undermines trust

### 10.2 Mitigations (V1)
- One confirmation step + tag dictionary for consistency
- Enforce citations; no citations => no synthesized answer
- Strict out-of-scope boundaries
- Basic privacy hygiene (account isolation, log redaction, transparency in UX)

---

## 11. Non-goals & Future Roadmap

### 11.1 Non-goals (V1)
- flashcards/spaced repetition
- auto-scheduling/time-blocking (avoid highly competitive area)
- collaboration/sharing/permissions

### 11.2 Roadmap Candidates (V2/V3)
- source traceability (web clip + URL anchors)
- multi-ingestion channels (browser, iOS share, email forwarding)
- “light calendar connection”: extract dates/commitments -> one-click reminder/event
- flashcards for definitions/procedures
- stronger semantic retrieval (vector search) + topic pages

---

## 12. Open Questions
1) Should V1 include a “star” signal?
2) Localized category labels (Chinese display names)?
3) Is digest schedule configurable in V1 or fixed?
4) Should V1 always generate an Answer in Ask, or results-only initially?
5) Should V1 include quick feedback (“tag is wrong”)?

---

## 13. Glossary
- V1: Version 1
- MVP: Minimum Viable Product
- PDD: Product Design Doc
- IA: Information Architecture
- LLM: Large Language Model
- Enrichment: AI-generated structuring (summary/tags/category)
- Digest: periodic weekly review email
- SLA: Service Level Agreement
- End-to-End Encryption: end-to-end encryption
