# LiteVault Use Cases V1

> Use case mapping for all API endpoints
> Aligns with API_CONTRACT_V1.md, error_handling.md, and state_machine.md

---

## 1. Overview

This document maps each API endpoint to its corresponding use case, defining:
- Input/Output DTOs (plain dataclasses)
- Validations and preconditions
- Error codes per error_handling.md
- State transitions per state_machine.md

---

## 2. Items Module

### 2.1 CreateItem

**Endpoint:** `POST /items`

**Use Case:** `CreateItemUseCase`

#### Input DTO

```python
@dataclass
class CreateItemInput:
    user_id: str                    # From auth context
    raw_text: str                   # Required, max 10000 chars
    idempotency_key: str | None     # Optional, from header
```

#### Output DTO

```python
@dataclass
class CreateItemOutput:
    id: str
    raw_text: str
    title: str | None
    summary: str | None
    tags: list[str]
    status: str                     # 'ENRICHING'
    source_type: str | None
    created_at: datetime
    updated_at: datetime
    confirmed_at: datetime | None
```

#### Validations

| Validation | Error Code | HTTP |
|------------|------------|------|
| `raw_text` is empty | `VALIDATION_ERROR` | 400 |
| `raw_text` > 10000 chars | `VALIDATION_ERROR` | 400 |
| `idempotency_key` already exists | `DUPLICATE_REQUEST` | 409 |
| User not authenticated | `UNAUTHORIZED` | 401 |

#### Flow

```
1. Check authentication
2. If idempotency_key provided:
   a. Check idempotency_keys table
   b. If exists: return cached response (200)
3. Validate raw_text
4. Create Item entity (status=ENRICHING)
5. Save to items table
6. Create enrichment_outbox job
7. If idempotency_key: save to idempotency_keys
8. Return CreateItemOutput
```

#### State Transition

`(new) → ENRICHING`

---

### 2.2 GetPendingItems

**Endpoint:** `GET /items/pending`

**Use Case:** `GetPendingItemsUseCase`

#### Input DTO

```python
@dataclass
class GetPendingItemsInput:
    user_id: str                    # From auth context
```

#### Output DTO

```python
@dataclass
class GetPendingItemsOutput:
    items: list[ItemDto]
    total: int
```

#### Validations

| Validation | Error Code | HTTP |
|------------|------------|------|
| User not authenticated | `UNAUTHORIZED` | 401 |

#### Flow

```
1. Check authentication
2. Query items WHERE user_id = :user_id AND status IN ('ENRICHING', 'READY_TO_CONFIRM', 'FAILED')
3. Order by created_at DESC
4. Return items list with total count
```

---

### 2.3 GetItemById

**Endpoint:** `GET /items/:id`

**Use Case:** `GetItemByIdUseCase`

#### Input DTO

```python
@dataclass
class GetItemByIdInput:
    user_id: str                    # From auth context
    item_id: str                    # From path param
```

#### Output DTO

```python
@dataclass
class GetItemByIdOutput:
    id: str
    raw_text: str
    title: str | None
    summary: str | None
    tags: list[str]
    status: str
    source_type: str | None
    created_at: datetime
    updated_at: datetime
    confirmed_at: datetime | None
```

#### Validations

| Validation | Error Code | HTTP |
|------------|------------|------|
| User not authenticated | `UNAUTHORIZED` | 401 |
| Item not found | `NOT_FOUND` | 404 |
| Item belongs to different user | `NOT_FOUND` | 404 |

#### Flow

```
1. Check authentication
2. Query item by ID and user_id
3. If not found: raise NOT_FOUND
4. Return item
```

---

### 2.4 ConfirmItem

**Endpoint:** `PATCH /items/:id` with `action: "confirm"`

**Use Case:** `ConfirmItemUseCase`

#### Input DTO

```python
@dataclass
class ConfirmItemInput:
    user_id: str                    # From auth context
    item_id: str                    # From path param
    tags: list[str]                 # Optional tag names to apply
```

#### Output DTO

```python
@dataclass
class ConfirmItemOutput:
    id: str
    status: str                     # 'ARCHIVED'
    confirmed_at: datetime
    updated_at: datetime
```

#### Validations

| Validation | Error Code | HTTP |
|------------|------------|------|
| User not authenticated | `UNAUTHORIZED` | 401 |
| Item not found | `NOT_FOUND` | 404 |
| Item status ≠ READY_TO_CONFIRM | `INVALID_STATE_TRANSITION` | 409 |

#### Flow

```
1. Check authentication
2. Get item by ID and user_id (with row lock)
3. Validate status == 'READY_TO_CONFIRM'
4. Update item: status='ARCHIVED', confirmed_at=NOW()
5. For each tag name:
   a. Get or create tag (case-insensitive lookup)
   b. Create item_tag association
   c. Update tag usage_count and last_used
6. Return updated item
```

#### State Transition

`READY_TO_CONFIRM → ARCHIVED`

---

### 2.5 DiscardItem

**Endpoint:** `PATCH /items/:id` with `action: "discard"`

**Use Case:** `DiscardItemUseCase`

#### Input DTO

```python
@dataclass
class DiscardItemInput:
    user_id: str                    # From auth context
    item_id: str                    # From path param
```

#### Output DTO

```python
@dataclass
class DiscardItemOutput:
    id: str
    status: str                     # 'DISCARDED'
    updated_at: datetime
```

#### Validations

| Validation | Error Code | HTTP |
|------------|------------|------|
| User not authenticated | `UNAUTHORIZED` | 401 |
| Item not found | `NOT_FOUND` | 404 |
| Item status not in (READY_TO_CONFIRM, FAILED) | `INVALID_STATE_TRANSITION` | 409 |

#### Flow

```
1. Check authentication
2. Get item by ID and user_id (with row lock)
3. Validate status IN ('READY_TO_CONFIRM', 'FAILED')
4. Update item: status='DISCARDED', updated_at=NOW()
5. Delete any pending enrichment_outbox jobs
6. Return updated item
```

#### State Transition

`READY_TO_CONFIRM → DISCARDED`
`FAILED → DISCARDED`

---

### 2.6 EditItem

**Endpoint:** `PATCH /items/:id` with field updates (no action)

**Use Case:** `EditItemUseCase`

#### Input DTO

```python
@dataclass
class EditItemInput:
    user_id: str                    # From auth context
    item_id: str                    # From path param
    title: str | None               # Optional
    summary: str | None             # Optional
    tags: list[str] | None          # Optional
```

#### Output DTO

```python
@dataclass
class EditItemOutput:
    id: str
    title: str | None
    summary: str | None
    tags: list[str]
    updated_at: datetime
```

#### Validations

| Validation | Error Code | HTTP |
|------------|------------|------|
| User not authenticated | `UNAUTHORIZED` | 401 |
| Item not found | `NOT_FOUND` | 404 |
| Item status not in (READY_TO_CONFIRM, ARCHIVED) | `INVALID_STATE_TRANSITION` | 409 |

#### Flow

```
1. Check authentication
2. Get item by ID and user_id
3. Validate status allows editing
4. Update fields if provided
5. If tags updated: sync item_tags associations
6. Return updated item
```

#### State Transition

None (stays in current state)

---

### 2.7 RetryEnrichment

**Endpoint:** `POST /items/:id/retry`

**Use Case:** `RetryEnrichmentUseCase`

#### Input DTO

```python
@dataclass
class RetryEnrichmentInput:
    user_id: str                    # From auth context
    item_id: str                    # From path param
```

#### Output DTO

```python
@dataclass
class RetryEnrichmentOutput:
    id: str
    status: str                     # 'ENRICHING'
    updated_at: datetime
```

#### Validations

| Validation | Error Code | HTTP |
|------------|------------|------|
| User not authenticated | `UNAUTHORIZED` | 401 |
| Item not found | `NOT_FOUND` | 404 |
| Item status ≠ FAILED | `INVALID_STATE` | 400 |

#### Flow

```
1. Check authentication
2. Get item by ID and user_id
3. Validate status == 'FAILED'
4. Update item: status='ENRICHING', updated_at=NOW()
5. Create new enrichment_outbox job
6. Return updated item
```

#### State Transition

`FAILED → ENRICHING`

---

## 3. Library Module

### 3.1 GetLibraryItems

**Endpoint:** `GET /library`

**Use Case:** `GetLibraryItemsUseCase`

#### Input DTO

```python
@dataclass
class GetLibraryItemsInput:
    user_id: str                    # From auth context
    cursor: str | None              # Pagination cursor
    limit: int                      # Default 20, max 100
    q: str | None                   # Search filter
    tag: str | None                 # Tag filter
```

#### Output DTO

```python
@dataclass
class GetLibraryItemsOutput:
    items: list[LibraryItemDto]
    pagination: PaginationDto
```

```python
@dataclass
class LibraryItemDto:
    id: str
    title: str | None
    summary: str | None
    tags: list[str]
    status: str
    source_type: str | None
    created_at: datetime
    confirmed_at: datetime
```

```python
@dataclass
class PaginationDto:
    cursor: str | None
    has_more: bool
```

#### Validations

| Validation | Error Code | HTTP |
|------------|------------|------|
| User not authenticated | `UNAUTHORIZED` | 401 |
| Invalid cursor format | `VALIDATION_ERROR` | 400 |
| Limit > 100 | `VALIDATION_ERROR` | 400 |

#### Flow

```
1. Check authentication
2. Decode cursor if provided
3. Build query:
   - WHERE user_id = :user_id AND status = 'ARCHIVED'
   - If q: AND (title ILIKE %q% OR raw_text ILIKE %q%)
   - If tag: JOIN item_tags WHERE tag_id = (SELECT id FROM tags WHERE name_lower = lower(:tag))
   - Cursor: AND (confirmed_at, id) < (:cursor_confirmed_at, :cursor_id)
4. ORDER BY confirmed_at DESC, id DESC
5. LIMIT :limit + 1 (for hasMore detection)
6. Return items with pagination cursor
```

---

## 4. Search Module

### 4.1 SearchVault

**Endpoint:** `POST /search`

**Use Case:** `SearchVaultUseCase`

#### Input DTO

```python
@dataclass
class SearchVaultInput:
    user_id: str                    # From auth context
    query: str                      # Required, non-empty
```

#### Output DTO

```python
@dataclass
class SearchVaultOutput:
    answer: str
    evidence: list[EvidenceDto]
    total_sources: int
```

```python
@dataclass
class EvidenceDto:
    item_id: str
    title: str
    snippet: str
    score: float
    type: str                       # 'NOTE' or 'ARTICLE'
    tags: list[str]
```

#### Validations

| Validation | Error Code | HTTP |
|------------|------------|------|
| User not authenticated | `UNAUTHORIZED` | 401 |
| Query is empty | `VALIDATION_ERROR` | 400 |
| AI service unavailable | `AI_SERVICE_UNAVAILABLE` | 503 |

#### Flow

```
1. Check authentication
2. Validate query non-empty
3. Fetch user's archived items (context for AI)
4. Call AI provider with query + context
5. Return synthesized answer + evidence
```

---

## 5. Tags Module

### 5.1 GetTags

**Endpoint:** `GET /tags`

**Use Case:** `GetTagsUseCase`

#### Input DTO

```python
@dataclass
class GetTagsInput:
    user_id: str                    # From auth context
    q: str | None                   # Search filter
    sort: str                       # 'name', 'usage', 'lastUsed'
    unused: bool                    # Filter unused only
    cursor: str | None              # Pagination cursor
    limit: int                      # Default 50
```

#### Output DTO

```python
@dataclass
class GetTagsOutput:
    tags: list[TagDto]
    pagination: PaginationDto
    total: int
```

```python
@dataclass
class TagDto:
    id: str
    name: str
    usage_count: int
    last_used: datetime | None
    created_at: datetime
```

#### Validations

| Validation | Error Code | HTTP |
|------------|------------|------|
| User not authenticated | `UNAUTHORIZED` | 401 |
| Invalid sort value | `VALIDATION_ERROR` | 400 |

---

### 5.2 CreateTag

**Endpoint:** `POST /tags`

**Use Case:** `CreateTagUseCase`

#### Input DTO

```python
@dataclass
class CreateTagInput:
    user_id: str                    # From auth context
    name: str                       # Required, 1-50 chars
```

#### Output DTO

```python
@dataclass
class CreateTagOutput:
    id: str
    name: str
    usage_count: int                # 0
    last_used: datetime | None      # None
    created_at: datetime
```

#### Validations

| Validation | Error Code | HTTP |
|------------|------------|------|
| User not authenticated | `UNAUTHORIZED` | 401 |
| Name is empty | `VALIDATION_ERROR` | 400 |
| Name > 50 chars | `VALIDATION_ERROR` | 400 |
| Tag with same name exists (case-insensitive) | `TAG_EXISTS` | 409 |

#### Flow

```
1. Check authentication
2. Validate name length
3. Normalize: trim whitespace
4. Check uniqueness (user_id, LOWER(name))
5. Create tag
6. Return created tag
```

---

### 5.3 RenameTag

**Endpoint:** `PATCH /tags/:id`

**Use Case:** `RenameTagUseCase`

#### Input DTO

```python
@dataclass
class RenameTagInput:
    user_id: str                    # From auth context
    tag_id: str                     # From path param
    name: str                       # New name
```

#### Output DTO

```python
@dataclass
class RenameTagOutput:
    id: str
    name: str
    usage_count: int
    last_used: datetime | None
    created_at: datetime
```

#### Validations

| Validation | Error Code | HTTP |
|------------|------------|------|
| User not authenticated | `UNAUTHORIZED` | 401 |
| Tag not found | `NOT_FOUND` | 404 |
| Name is empty | `VALIDATION_ERROR` | 400 |
| New name conflicts with existing | `TAG_EXISTS` | 409 |

---

### 5.4 DeleteTag

**Endpoint:** `DELETE /tags/:id`

**Use Case:** `DeleteTagUseCase`

#### Input DTO

```python
@dataclass
class DeleteTagInput:
    user_id: str                    # From auth context
    tag_id: str                     # From path param
```

#### Output DTO

None (returns 204 No Content)

#### Validations

| Validation | Error Code | HTTP |
|------------|------------|------|
| User not authenticated | `UNAUTHORIZED` | 401 |
| Tag not found | `NOT_FOUND` | 404 |

#### Flow

```
1. Check authentication
2. Get tag by ID and user_id
3. Delete all item_tags associations
4. Delete tag
5. Return 204
```

---

### 5.5 MergeTags

**Endpoint:** `POST /tags/merge`

**Use Case:** `MergeTagsUseCase`

#### Input DTO

```python
@dataclass
class MergeTagsInput:
    user_id: str                    # From auth context
    source_tag_ids: list[str]       # Tags to merge from
    target_tag_id: str              # Tag to merge into
```

#### Output DTO

```python
@dataclass
class MergeTagsOutput:
    target_tag: TagDto
    merged_count: int
```

#### Validations

| Validation | Error Code | HTTP |
|------------|------------|------|
| User not authenticated | `UNAUTHORIZED` | 401 |
| Target tag not found | `NOT_FOUND` | 404 |
| Source tag not found | `NOT_FOUND` | 404 |
| Target in source list | `VALIDATION_ERROR` | 400 |

#### Flow

```
1. Check authentication
2. Validate all tags exist and belong to user
3. For each source tag:
   a. Move item_tags to target (ignore conflicts)
   b. Delete orphaned item_tags
   c. Delete source tag
4. Recalculate target usage_count
5. Return updated target tag
```

---

## 6. Auth Module (TBD)

### 6.1 Signup

**Endpoint:** `POST /auth/signup`

**Status:** TBD - UI exists but backend deferred

### 6.2 Login

**Endpoint:** `POST /auth/login`

**Status:** TBD - UI exists but backend deferred

### 6.3 Logout

**Endpoint:** `POST /auth/logout`

**Status:** TBD

### 6.4 GetCurrentUser

**Endpoint:** `GET /auth/me`

**Status:** TBD

---

## 7. Summary: Error Code Coverage

| Error Code | Used By |
|------------|---------|
| `VALIDATION_ERROR` | CreateItem, EditItem, GetLibraryItems, SearchVault, CreateTag, RenameTag, MergeTags |
| `UNAUTHORIZED` | All endpoints |
| `NOT_FOUND` | GetItemById, ConfirmItem, DiscardItem, EditItem, RetryEnrichment, RenameTag, DeleteTag, MergeTags |
| `DUPLICATE_REQUEST` | CreateItem |
| `INVALID_STATE_TRANSITION` | ConfirmItem, DiscardItem, EditItem |
| `INVALID_STATE` | RetryEnrichment |
| `TAG_EXISTS` | CreateTag, RenameTag |
| `AI_SERVICE_UNAVAILABLE` | SearchVault |

---

## 8. Questions / Proposed Resolutions

| Question | Resolution |
|----------|------------|
| Should edit be separate endpoint or same PATCH? | Same PATCH, differentiate by presence of `action` field |
| Should confirm always require tags? | No, tags optional (use AI-suggested if not provided) |
| Should search return empty or error if no items? | Return empty evidence array, not error |
| Should getTags count total or just paginated? | Return total for UI badge, paginated items for display |
