# Uploads Visibility Audit Report

## Executive Summary

After uploading files on Home and saving, **attachments are not visible** in Search, Library, or Item Detail views. Root cause: the upload flow creates attachments correctly in the database, but **backend list/detail endpoints don't return attachment info**, and **frontend components have no attachment rendering logic**.

---

## Current Behavior Mapping

```
User Flow: Home → Save → DB → List → Detail

┌─────────────────────────────────────────────────────────────────────┐
│ 1. HOME: User types text + selects files via AttachButton          │
│    → Files stored in pendingFiles[] state                          │
│    → On Save: addPendingItem() → POST /items → returns Item        │
│                                                                     │
│ 2. UPLOADS: For each file, uploadFile(file, item.id) executes:     │
│    → POST /uploads/initiate → presigned PUT URL                    │
│    → PUT to S3/MinIO                                                │
│    → POST /uploads/complete {uploadId, itemId}                     │
│    → Backend creates item_attachments row ✓                        │
│                                                                     │
│ 3. DB STATE: After save completes:                                 │
│    ✓ items table: row exists                                       │
│    ✓ uploads table: COMPLETED status                               │
│    ✓ item_attachments table: links item ↔ upload                   │
│                                                                     │
│ 4. LIBRARY/SEARCH: GET /library or GET /search                     │
│    ✗ Response lacks attachmentCount field                          │
│    ✗ Backend doesn't query item_attachments                        │
│                                                                     │
│ 5. DETAIL: ItemDetailModal receives Item object                    │
│    ✗ Item type lacks attachments field                             │
│    ✗ No API call to GET /items/{id}/attachments                    │
│    ✗ No Attachments section in modal UI                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Gap Analysis with Evidence

### Gap 1: Backend List Endpoints Lack Attachment Count

**Files:**
- `backend/app/api/schemas/library.py` (lines 9-19)
- `backend/app/api/schemas/search.py` (lines 9-17)

**Evidence - LibraryItemResponse:**
```python
class LibraryItemResponse(BaseModel):
    id: str
    rawText: str
    title: str | None
    summary: str | None
    tags: list[TagInItem]
    status: str
    sourceType: str | None
    createdAt: datetime
    confirmedAt: datetime | None
    # ❌ NO attachmentCount field
```

**Evidence - SearchResultItem:**
```python
class SearchResultItem(BaseModel):
    id: str
    title: str | None
    summary: str | None
    tags: list[TagInItem]
    sourceType: str | None
    confirmedAt: datetime | None
    createdAt: datetime
    # ❌ NO attachmentCount field
```

**Root Cause:** Backend doesn't JOIN `item_attachments` table in list queries.

---

### Gap 2: Backend Detail (GET /items/{id}) Lacks Attachments

**File:** `backend/app/api/schemas/items.py` (lines 32-46)

**Evidence - ItemResponse:**
```python
class ItemResponse(BaseModel):
    id: str
    rawText: str
    title: str | None
    summary: str | None
    tags: list[TagInItem]
    suggestedTags: list[SuggestedTagInItem] = []
    status: str
    sourceType: str | None
    enrichmentMode: str | None = None
    createdAt: datetime
    updatedAt: datetime
    confirmedAt: datetime | None
    # ❌ NO attachments field
    # ❌ NO attachmentCount field
```

**Root Cause:** Item detail endpoint doesn't fetch/return attachment metadata.

---

### Gap 3: Frontend Item Type Lacks Attachments

**File:** `frontend/src/lib/types/index.ts` (lines 34-46)

**Evidence:**
```typescript
export interface Item {
    id: string;
    rawText: string;
    title: string | null;
    summary: string | null;
    tags: TagInItem[];
    suggestedTags?: SuggestedTag[];
    status: ItemStatus;
    sourceType?: SourceType;
    createdAt: Date;
    updatedAt: Date;
    confirmedAt: Date | null;
    // ❌ NO attachmentCount
    // ❌ NO attachments array
}
```

---

### Gap 4: Frontend ItemCard Has No Attachment Indicator

**File:** `frontend/src/components/shared/ItemCard.tsx` (lines 10-35)

**Evidence - ItemCardProps:**
```typescript
interface ItemCardProps {
    title: string;
    summary?: string;
    tags?: TagInItem[];
    sourceType?: SourceType;
    statusBadge?: string;
    timestamp?: string;
    children?: ReactNode;
    onClick?: () => void;
    showIcon?: boolean;
    className?: string;
    variant?: 'default' | 'destructive';
    static?: boolean;
    // ❌ NO attachmentCount prop
}
```

---

### Gap 5: Frontend ItemDetailModal Has No Attachments Section

**File:** `frontend/src/components/shared/ItemDetailModal.tsx` (lines 291-318)

**Evidence - Read Mode (no attachments section):**
```tsx
{/* Read Mode */}
<>
    {/* Summary */}
    {item.summary && (...)}
    
    {/* Raw Content (scrollable) */}
    <div className="prose...">...</div>
    
    {/* Tags */}
    {item.tags.length > 0 && (...)}
    
    {/* ❌ NO Attachments section */}
</>
```

---

## Database State (Verified Working)

**Attachment Binding Works Correctly:**

1. **uploads table** - Created with `INITIATED` → `COMPLETED` lifecycle
2. **item_attachments table** - Row created on `POST /uploads/complete` with `item_id` FK
3. **GET /items/{item_id}/attachments** - Endpoint exists and returns attachments

**File:** `backend/app/api/v1/uploads.py` (items_attachments_router)
```python
@items_attachments_router.get("/items/{item_id}/attachments")
async def list_item_attachments(...) -> AttachmentListResponse:
    # ✓ Endpoint exists
    # ✓ Returns attachments for item
```

---

## Summary Table

| Component | Gap | Status |
|-----------|-----|--------|
| Home Save Flow | Binding works (async after create) | ✅ Working |
| POST /uploads/complete | Creates item_attachments row | ✅ Working |
| GET /library | Missing attachmentCount | ❌ Gap |
| GET /search | Missing attachmentCount | ❌ Gap |
| GET /items/{id} | Missing attachments metadata | ❌ Gap |
| Frontend Item type | Missing attachment fields | ❌ Gap |
| ItemCard component | Missing attachment badge | ❌ Gap |
| ItemDetailModal | Missing Attachments section | ❌ Gap |

---

## Conclusion

Uploads are correctly bound to items in the database. The visibility problem is purely in the **API response DTOs** and **frontend rendering**:

1. Backend list/detail endpoints need to include attachment counts
2. Frontend types/components need to render attachments

See `UPLOADS_VISIBILITY_OPTIMIZATION_PLAN.md` for fix proposal.
