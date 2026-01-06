# Uploads Visibility Optimization Plan

## Overview

This plan fixes uploads visibility across Search, Library, and Item Detail views. Changes are organized into PR-sized slices with clear acceptance criteria.

**Prerequisites:** All slices from uploads implementation (1-7) are complete.

---

## Slice A: Contract & Docs Alignment

### Scope
Update API contract documentation to specify `attachmentCount` in list responses and `attachments` in detail responses.

### Files to Change
| File | Change |
|------|--------|
| `docs/architecture/API_CONTRACT_V1.md` | Add `attachmentCount` to LibraryItem/SearchResultItem schemas |

### Acceptance Criteria
- [ ] API contract specifies `attachmentCount: number` in list responses
- [ ] API contract specifies `attachments: []` array in item detail response

---

## Slice B: Backend - Add attachmentCount to List DTOs

### Scope
Add `attachmentCount` field to Library and Search response schemas. Modify queries to COUNT attachments per item.

### Files to Change
| File | Change |
|------|--------|
| `backend/app/api/schemas/library.py` | Add `attachmentCount: int = 0` to LibraryItemResponse |
| `backend/app/api/schemas/search.py` | Add `attachmentCount: int = 0` to SearchResultItem |
| `backend/app/api/v1/library.py` | Join item_attachments, add COUNT to query |
| `backend/app/api/v1/search.py` | Join item_attachments, add COUNT to query |

### DB Migrations
None required - uses existing `item_attachments` table.

### Implementation Notes
```python
# Option 1: Subquery per item (simple)
from sqlalchemy import select, func
from app.infrastructure.persistence.models import ItemAttachmentModel

# In get_library endpoint:
attachment_counts = await db.execute(
    select(
        ItemAttachmentModel.item_id,
        func.count(ItemAttachmentModel.id).label('count')
    )
    .where(ItemAttachmentModel.item_id.in_([item.id for item in items]))
    .where(ItemAttachmentModel.deleted_at.is_(None))
    .group_by(ItemAttachmentModel.item_id)
)
count_map = {row.item_id: row.count for row in attachment_counts}
```

### Backend Tests to Add
```python
# tests/test_library.py
@pytest.mark.asyncio
async def test_library_includes_attachment_count(client: AsyncClient, ...):
    # Create item with attachments
    # GET /library
    # Assert response.items[0]["attachmentCount"] == expected

# tests/test_search.py
@pytest.mark.asyncio
async def test_search_includes_attachment_count(client: AsyncClient, ...):
    # Create item with attachments
    # GET /search?q=...
    # Assert response.items[0]["attachmentCount"] == expected
```

### Acceptance Criteria
- [ ] `GET /library` returns `attachmentCount` for each item
- [ ] `GET /search` returns `attachmentCount` for each item
- [ ] Count excludes soft-deleted attachments
- [ ] Tests pass

---

## Slice C: Backend - Add Attachments to Item Detail DTO

### Scope
Add `attachments` array to item detail response. This enables the ItemDetailModal to display attachments without a separate API call.

### Files to Change
| File | Change |
|------|--------|
| `backend/app/api/schemas/items.py` | Add `AttachmentInItem` schema, add `attachments: list[]` to ItemResponse |
| `backend/app/api/v1/items.py` (get_item) | Fetch attachments and include in response |
| `backend/app/application/items/get_item.py` | Modify use case to include attachments |

### Schema Addition
```python
class AttachmentInItem(BaseModel):
    """Attachment object embedded in item responses."""
    id: str
    uploadId: str = Field(..., alias="upload_id")
    displayName: str = Field(..., alias="display_name")
    mimeType: str | None = Field(None, alias="mime_type")
    sizeBytes: int | None = Field(None, alias="size_bytes")
    kind: str  # 'image' or 'file'
    createdAt: datetime = Field(..., alias="created_at")
    
    model_config = ConfigDict(populate_by_name=True)
```

### Backend Tests to Add
```python
# tests/test_items.py
@pytest.mark.asyncio
async def test_get_item_includes_attachments(client: AsyncClient, ...):
    # Create item, add attachment via uploads/complete
    # GET /items/{id}
    # Assert "attachments" in response
    # Assert len(response["attachments"]) == 1
```

### Acceptance Criteria
- [ ] `GET /items/{id}` returns `attachments` array with metadata
- [ ] Each attachment includes id, displayName, mimeType, sizeBytes, kind
- [ ] Test passes

---

## Slice D: Frontend - Update Types and API Client

### Scope
Add attachment fields to frontend types and update API response parsing.

### Files to Change
| File | Change |
|------|--------|
| `frontend/src/lib/types/index.ts` | Add `AttachmentInfo`, add `attachmentCount` to Item |
| `frontend/src/lib/api/client.ts` | Update `parseApiItem` to include attachmentCount |

### Type Changes
```typescript
// types/index.ts
export interface AttachmentInfo {
    id: string;
    uploadId: string;
    displayName: string;
    mimeType: string | null;
    sizeBytes: number | null;
    kind: 'image' | 'file';
    createdAt: Date;
}

export interface Item {
    // ... existing fields ...
    attachmentCount?: number;  // From list endpoints
    attachments?: AttachmentInfo[];  // From detail endpoint
}
```

### Acceptance Criteria
- [ ] `Item` type includes `attachmentCount?: number`
- [ ] `Item` type includes `attachments?: AttachmentInfo[]`
- [ ] API client parses these fields correctly

---

## Slice E: Frontend - Show Attachment Badge on Cards

### Scope
Add paperclip + count indicator to ItemCard, displayed when `attachmentCount > 0`.

### Files to Change
| File | Change |
|------|--------|
| `frontend/src/components/shared/ItemCard.tsx` | Add `attachmentCount` prop, render badge |
| `frontend/src/components/domain/library/LibraryItemCard.tsx` | Pass `attachmentCount` to ItemCard |
| `frontend/src/app/(main)/search/page.tsx` | Pass `attachmentCount` to SearchResultItem cards |

### UI Implementation
```tsx
// ItemCard.tsx
import { Paperclip } from 'lucide-react';

interface ItemCardProps {
    // ... existing props ...
    attachmentCount?: number;
}

// In footer section, add:
{attachmentCount && attachmentCount > 0 && (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5" />
        {attachmentCount}
    </div>
)}
```

### Manual Verification
1. Create item with 2 file attachments
2. Navigate to Library page
3. Verify card shows 📎 2
4. Navigate to Search page, search for item
5. Verify card shows 📎 2

### Acceptance Criteria
- [ ] ItemCard shows 📎 badge when `attachmentCount > 0`
- [ ] Badge shows count number
- [ ] Badge hidden when count is 0 or undefined
- [ ] Works on Library page
- [ ] Works on Search page

---

## Slice F: Frontend - Show Attachments Section in Detail Modal

### Scope
Add Attachments section to ItemDetailModal showing images as thumbnails and files as downloadable list.

### Files to Change
| File | Change |
|------|--------|
| `frontend/src/components/shared/ItemDetailModal.tsx` | Add Attachments section, fetch download URLs |
| `frontend/src/lib/hooks/useUpload.ts` | Already has `getDownloadUrl` function |

### UI Implementation
```tsx
// ItemDetailModal.tsx - Add after Tags section in Read Mode

{/* Attachments */}
{item.attachments && item.attachments.length > 0 && (
    <div className="space-y-2 pt-2 border-t">
        <Label className="text-muted-foreground">
            <Paperclip className="h-3.5 w-3.5 inline mr-1.5" />
            Attachments ({item.attachments.length})
        </Label>
        <AttachmentsList
            attachments={item.attachments.map(a => ({
                id: a.id,
                uploadId: a.uploadId,
                displayName: a.displayName,
                mimeType: a.mimeType,
                sizeBytes: a.sizeBytes,
                kind: a.kind,
                createdAt: a.createdAt.toISOString(),
            }))}
            onDownload={handleDownload}
        />
    </div>
)}
```

### Download Handler
```typescript
const handleDownload = async (attachmentId: string) => {
    const result = await getDownloadUrl(attachmentId);
    if (result?.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
    }
};
```

### Manual Verification
1. Create item with 1 image + 1 PDF attachment
2. Open item detail modal
3. Verify "Attachments (2)" section visible
4. Verify image shows as AttachmentItem with image icon
5. Verify PDF shows as AttachmentItem with file icon
6. Click download on PDF, verify file downloads

### Acceptance Criteria
- [ ] Detail modal shows "Attachments (N)" section when item has attachments
- [ ] Each attachment shows displayName, size, icon
- [ ] Download button opens presigned URL
- [ ] Works for both images and files

---

## Slice G: E2E Verification Checklist

### Test Plan
| Step | Expected | Pass? |
|------|----------|-------|
| 1. Home: Type text, attach 2 files (1 image, 1 PDF), Save | Toast "Saved!" | [ ] |
| 2. Refresh Library page | New item visible with 📎 2 badge | [ ] |
| 3. Search for item text | Item appears with 📎 2 badge | [ ] |
| 4. Click item to open detail modal | "Attachments (2)" section visible | [ ] |
| 5. Click download on PDF | PDF downloads successfully | [ ] |
| 6. Click download on image | Image opens in new tab | [ ] |
| 7. Edit item (no attachment changes) | Attachments preserved after save | [ ] |
| 8. Delete item | Soft-delete works, attachments cascade | [ ] |

### Backend Integration Tests Summary
| Test | File |
|------|------|
| Library includes attachmentCount | `tests/test_library.py` |
| Search includes attachmentCount | `tests/test_search.py` |
| Item detail includes attachments | `tests/test_items.py` |
| Attachment count excludes deleted | `tests/test_uploads.py` |

---

## Implementation Order

```
Slice A (Docs)        ─┐
Slice B (List DTOs)   ─┼──▶  Slice D (FE Types)  ──▶  Slice E (Cards)
Slice C (Detail DTO)  ─┘                          ──▶  Slice F (Modal)
                                                       ──▶  Slice G (E2E)
```

**Recommended sequence:** A → B → C → D → E → F → G

**Time estimate:** ~4-6 hours total
- Slice A: 15 min
- Slice B: 45 min
- Slice C: 30 min
- Slice D: 20 min
- Slice E: 30 min
- Slice F: 45 min
- Slice G: 30 min

---

## Non-Goals (Out of Scope)

1. Image thumbnails/previews in detail modal (future enhancement)
2. Inline attachment editing (add/remove from detail)
3. Drag-and-drop reordering
4. AI enrichment of attachments
5. Presigned URLs in list responses (only counts)
