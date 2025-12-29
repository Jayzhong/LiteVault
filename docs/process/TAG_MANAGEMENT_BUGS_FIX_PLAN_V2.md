# Tag Management Bugs V2 - Fix Plan

**Date:** 2025-12-29  
**Status:** Ready for Review

---

## Summary

5 slices to fix all bugs. Critical dependency: Slice B (item_tags) enables fixes for bugs 1, 2, 3.

| Slice | Bugs Fixed | Scope | Risk |
|-------|------------|-------|------|
| A | 4 | Handle 204 No Content | Low |
| B | 1, 2, 3 | item_tags junction table | High |
| C | 3 | usage_count maintenance | Medium |
| D | 1, 2 | Item API returns tag objects | Medium |
| E | 5 | Query stability | Low |

---

## Slice A: Handle 204 No Content

**Fixes:** Bug 4 - Delete fails but works

### Files to Change
| File | Change |
|------|--------|
| `frontend/src/lib/api/client.ts` | Check status before .json() |

### Implementation

```typescript
// frontend/src/lib/api/client.ts line 207
- return response.json() as Promise<T>;
+ // Handle 204 No Content
+ if (response.status === 204) {
+     return undefined as T;
+ }
+ return response.json() as Promise<T>;
```

### API/Contract Changes
None - backend already returns 204 correctly.

### Test Plan
- **Manual:** Delete tag → verify success toast
- **Backend:** Existing test covers 204 response

### Acceptance Criteria
- [ ] Delete tag shows success message
- [ ] Tag disappears from list
- [ ] No console errors

---

## Slice B: item_tags Junction Table

**Fixes:** Foundation for bugs 1, 2, 3

### Files to Change
| File | Change |
|------|--------|
| `backend/alembic/versions/008_add_item_tags_table.py` | **NEW** Migration |
| `backend/app/infrastructure/persistence/models/item_tag_model.py` | **NEW** Model |
| `backend/app/infrastructure/persistence/models/__init__.py` | Export model |
| `backend/app/domain/entities/item.py` | Change tags: list[str] → list[TagAssociation] |
| `backend/app/infrastructure/persistence/repositories/item_repository_impl.py` | Load/save item_tags |

### DB Migration

```python
# 008_add_item_tags_table.py
def upgrade():
    op.create_table(
        'item_tags',
        sa.Column('item_id', sa.String(36), sa.ForeignKey('items.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('tag_id', sa.String(36), sa.ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_item_tags_tag_id', 'item_tags', ['tag_id'])

def downgrade():
    op.drop_table('item_tags')
```

### API/Contract Changes
None initially - slice D updates API.

### Test Plan
- **Backend:** 
  ```bash
  cd backend && uv run alembic upgrade head
  uv run pytest tests/test_items.py -v
  ```

### Acceptance Criteria
- [ ] Migration runs without error
- [ ] item_tags table exists
- [ ] Existing tests pass

---

## Slice C: usage_count Maintenance

**Fixes:** Bug 3 - UNUSED shown incorrectly

### Files to Change
| File | Change |
|------|--------|
| `backend/app/domain/repositories/tag_repository.py` | Add increment/decrement methods |
| `backend/app/infrastructure/persistence/repositories/tag_repository_impl.py` | Implement methods |
| `backend/app/application/items/update_item.py` | Call tag repo on confirm/edit |

### Implementation

```python
# tag_repository.py
async def increment_usage(self, tag_id: str) -> None: ...
async def decrement_usage(self, tag_id: str) -> None: ...

# update_item.py
async def execute(self, input: UpdateItemInput):
    if input.action == "confirm":
        for tag_name in input.tags:
            tag = await self.tag_repo.get_or_create(user_id, tag_name)
            await self.item_tag_repo.create(item.id, tag.id)
            await self.tag_repo.increment_usage(tag.id)
```

### Test Plan
- **Backend:**
  ```python
  # tests/test_tags.py - Add test
  async def test_usage_count_increments_on_confirm():
      # Create item with tags
      # Confirm item
      # Check tag.usageCount == 1
  ```

### Acceptance Criteria
- [ ] Confirming item with tag X increases usageCount
- [ ] Editing to remove tag X decreases usageCount
- [ ] "Show unused" filters correctly

---

## Slice D: Item API Returns Tag Objects

**Fixes:** Bugs 1, 2 - Rename/color not propagating

### Files to Change
| File | Change |
|------|--------|
| `backend/app/api/schemas/items.py` | Add TagInItem schema, change tags type |
| `backend/app/api/v1/items.py` | Map tag objects in response |
| `frontend/src/lib/api/client.ts` | Update ItemResponse type |
| `frontend/src/lib/types/index.ts` | Update Item type |
| `frontend/src/components/shared/ColoredTagBadge.tsx` | Use tag.color directly |

### API/Contract Changes

**Before:**
```json
{
  "tags": ["Work", "Design"]
}
```

**After:**
```json
{
  "tags": [
    { "id": "tag-1", "name": "Work", "color": "#3B82F6" },
    { "id": "tag-2", "name": "Design", "color": "#EF4444" }
  ]
}
```

### Backend Schema Change

```python
# backend/app/api/schemas/items.py
class TagInItem(BaseModel):
    id: str
    name: str
    color: str = "#6B7280"

class ItemResponse(BaseModel):
    ...
    tags: list[TagInItem]  # ← Changed from list[str]
```

### Test Plan
- **Backend:** Update test assertions for new tags format
- **Frontend:** Verify tag colors display correctly

### Acceptance Criteria
- [ ] Item API returns tag objects with id, name, color
- [ ] Renaming tag updates display everywhere
- [ ] Changing tag color updates display everywhere

---

## Slice E: Query Stability

**Fixes:** Bug 5 - Tags disappear on refresh

### Files to Change
| File | Change |
|------|--------|
| `frontend/src/lib/hooks/useTags.ts` | Add placeholderData, improve loading |

### Implementation

```typescript
const { data, isLoading, ... } = useQuery({
    queryKey: ['tags', params],
    queryFn: async () => { ... },
    staleTime: 30000,
    placeholderData: keepPreviousData,  // ← Keep previous while refetching
});
```

### Test Plan
- **Manual:** Refresh page rapidly, verify no empty flash

### Acceptance Criteria
- [ ] Tags never show empty during refetch
- [ ] Initial load shows skeleton
- [ ] Subsequent refreshes show previous data

---

## Rollout Strategy

### Order
1. **Slice A** - Quick fix, low risk
2. **Slice B** - Foundation (can be deployed without visible change)
3. **Slice C** - Enables correct usage count
4. **Slice D** - Breaking API change, requires frontend deploy together
5. **Slice E** - Polish

### Risks

| Risk | Mitigation |
|------|------------|
| Slice D breaks frontend | Deploy backend + frontend together |
| Migration rollback | Test downgrade migration |
| usage_count inconsistency | Add recalculate script |

### Dependencies

```
Slice A (standalone)
    ↓
Slice B (foundation)
    ↓
Slice C + D (depend on B)
    ↓
Slice E (standalone)
```

---

## Testing Checklist (After All Slices)

- [ ] Create item with tags → confirm → tags persist
- [ ] Rename tag → item displays new name
- [ ] Change tag color → item displays new color
- [ ] Confirm item → tag usageCount increases
- [ ] Delete tag → no error, tag gone
- [ ] Refresh page → tags don't flash empty
- [ ] Show Unused toggle → still works correctly
