# Docs vs Code Audit Report

**Date**: 2025-12-30
**Auditor**: Antigravity (Senior Tech Lead)

## Executive Summary
The audit revealed a generally healthy alignment between documentation and code, with strictly adhering to "V1" properties. The most significant discrepancy is in the **Data Model** regarding how tags are associated with items. The documentation describes a normalized `item_tags` junction table, but the codebase (`ItemModel`, `ItemRepository`) primarily relies on a Denormalized `tags` ARRAY column on the `items` table for reading and writing, despite the junction table's existence in migrations.

## 1. Architecture & Data Model (`data_model_v1.md`)

**Status**: **Needs Update**

### Findings
- **Mismatch (High Impact)**: The `items` table in code (`ItemModel`) uses a `tags` column (`ARRAY(String)`) as the source of truth for item tags. The documentation Section 3.4 describes an `item_tags` junction table. While `item_tags` exists in migrations (`008`) and models, `SQLAlchemyItemRepository` explicitly reads/writes from the `items.tags` array.
- **Mismatch**: `items` table in doc is missing the `tags` array column definition.
- **Mismatch**: `items` table in doc lists `status` and `source_type` constraints that generally match, but `enrichment_mode` (`AI` or `MANUAL`) is missing from the doc's table definition (it is in the code `ItemModel`).
- **Verified**: `tags` table `color` and `soft_delete` logic matches code.
- **Verified**: `User` table `clerk_user_id` and preferences JSON match.

### Actions
- Update `data_model_v1.md`:
  - Add `tags` (ARRAY) and `enrichment_mode` columns to `items` table definition.
  - mark `item_tags` table notes to reflect current usage (or lack thereof) in V1 primary paths.

## 2. API Contract (`API_CONTRACT_V1.md`)

**Status**: **Needs Update**

### Findings
- **Mismatch**: `PATCH /items/:id` documentation emphasises `tags` (objects) in some example responses/requests but the code uses `tagIds` (create) or specific suggestion fields (`acceptedSuggestionIds`, `rejectedSuggestionIds`, `addedTagIds`) for updates. The "Confirm" example in Doc 5.1 mentions `tags` in the response, which matches `ItemResponse`.
- **Clarification**: `PATCH /items/:id` request body in code (`UpdateItemRequest`) supports `tags` (legacy list[str]) but encourages suggestion outcomes. Doc should reflect the preferred `acceptedSuggestionIds` flow.
- **Verified**: `POST /items` `enrich` flag and `tagIds` match code.
- **Verified**: `POST /tags` upsert/revive behavior matches `tag_repo` logic.

### Actions
- Refine `PATCH /items/:id` request specification to explicitly list `acceptedSuggestionIds`, `rejectedSuggestionIds`, `addedTagIds` as the primary confirm control fields, matching `schemas/items.py`.

## 3. Design & UX (`UI_INTERACTION_SPEC.md`, `MICROCOPY.md`)

**Status**: **OK**

### Findings
- **Microcopy**: `frontend/src/lib/microcopy.ts` is in sync with `MICROCOPY.md`.
- **UI Spec**: `TagPicker` behavior (debounced search, creation) matches spec.

## 4. Runbook (`PROJECT_BRIEF.md`)

**Status**: **OK**

### Findings
- **Tooling**: `requirements` correctly identifying `uv` for backend and `npm` for frontend.
- **Commands**: Matches `pyproject.toml` and standard workflows.

## Risky Ambiguities
1.  **Item Tags Persistence**: The existence of both `items.tags` (ARRAY) and `item_tags` (Table) in the codebase is a potential source of data inconsistency. The `ItemRepository` reads/writes the Array. If `UpdateItemUseCase` tries to maintain the junction table, it introduces dual-write complexity. **Recommendation**: Treat `items.tags` ARRAY as the V1 source of truth as per `ItemModel` comments, and consider `item_tags` table as infrastructure prep for V2.

## Manual Verification Checklist
- [ ] Check `UpdateItemUseCase` to see if it writes to `item_tags` table (to confirm if the table is populated at all).
- [ ] Verify `POST /tags/merge` logic – strictly relies on junction table? If so, merge might be broken because `items.tags` array wouldn't be updated automatically by a detailed SQL query on junction table.
