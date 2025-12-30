"""SQLAlchemy Item repository implementation."""

from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.item import Item
from app.domain.value_objects import ItemStatus, SourceType, EnrichmentMode
from app.domain.repositories.item_repository import ItemRepository
from app.infrastructure.persistence.models.item_model import ItemModel


class SQLAlchemyItemRepository(ItemRepository):
    """SQLAlchemy implementation of ItemRepository."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, item: Item) -> Item:
        """Create a new item."""
        model = ItemModel(
            id=item.id,
            user_id=item.user_id,
            raw_text=item.raw_text,
            title=item.title,
            summary=item.summary,
            status=item.status.value,
            source_type=item.source_type.value if item.source_type else None,
            enrichment_mode=item.enrichment_mode.value,
            tags=item.tags,
            created_at=item.created_at,
            updated_at=item.updated_at,
            confirmed_at=item.confirmed_at,
        )
        self.session.add(model)
        await self.session.flush()
        return item

    async def get_by_id(self, item_id: str, user_id: str) -> Item | None:
        """Get item by ID, scoped to user."""
        result = await self.session.execute(
            select(ItemModel).where(
                ItemModel.id == item_id,
                ItemModel.user_id == user_id,
            )
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None
        return self._to_entity(model)

    async def get_by_id_for_update(self, item_id: str, user_id: str) -> Item | None:
        """Get item by ID with row lock for update (user-scoped)."""
        result = await self.session.execute(
            select(ItemModel)
            .where(
                ItemModel.id == item_id,
                ItemModel.user_id == user_id,
            )
            .with_for_update()
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None
        return self._to_entity(model)

    async def get_by_id_for_update_system(self, item_id: str) -> Item | None:
        """Get item by ID with row lock for update (no user scoping).
        
        For internal worker use only - bypasses user security check.
        """
        result = await self.session.execute(
            select(ItemModel)
            .where(ItemModel.id == item_id)
            .with_for_update()
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None
        return self._to_entity(model)

    async def get_pending_by_user(self, user_id: str) -> list[Item]:
        """Get items with pending statuses for user."""
        pending_statuses = [
            ItemStatus.ENRICHING.value,
            ItemStatus.READY_TO_CONFIRM.value,
            ItemStatus.FAILED.value,
        ]
        result = await self.session.execute(
            select(ItemModel)
            .where(
                ItemModel.user_id == user_id,
                ItemModel.status.in_(pending_statuses),
            )
            .order_by(ItemModel.created_at.desc())
        )
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def count_enriching_items(self, user_id: str) -> int:
        """Count items currently in ENRICHING status for user."""
        stmt = select(func.count()).select_from(ItemModel).where(
            ItemModel.user_id == user_id,
            ItemModel.status == ItemStatus.ENRICHING.value
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def update(self, item: Item) -> Item:
        """Update an existing item."""
        await self.session.execute(
            update(ItemModel)
            .where(ItemModel.id == item.id)
            .values(
                title=item.title,
                summary=item.summary,
                status=item.status.value,
                source_type=item.source_type.value if item.source_type else None,
                tags=item.tags,
                updated_at=item.updated_at,
                confirmed_at=item.confirmed_at,
            )
        )
        await self.session.flush()
        return item

    def _to_entity(self, model: ItemModel) -> Item:
        """Convert ORM model to domain entity."""
        return Item(
            id=model.id,
            user_id=model.user_id,
            raw_text=model.raw_text,
            title=model.title,
            summary=model.summary,
            status=ItemStatus(model.status),
            source_type=SourceType(model.source_type) if model.source_type else None,
            enrichment_mode=EnrichmentMode(model.enrichment_mode) if model.enrichment_mode else EnrichmentMode.AI,
            tags=list(model.tags) if model.tags else [],
            created_at=model.created_at,
            updated_at=model.updated_at,
            confirmed_at=model.confirmed_at,
        )

    async def get_archived_by_user(
        self,
        user_id: str,
        cursor: tuple | None = None,
        limit: int = 20,
    ) -> list[Item]:
        """Get archived items for user with cursor pagination.
        
        Ordered by (confirmed_at DESC, id DESC) for stable pagination.
        Cursor is (confirmed_at, id) tuple.
        """
        from sqlalchemy import or_, and_
        
        query = (
            select(ItemModel)
            .where(
                ItemModel.user_id == user_id,
                ItemModel.status == ItemStatus.ARCHIVED.value,
            )
        )
        
        # Apply cursor filter
        if cursor:
            last_confirmed_at, last_id = cursor
            query = query.where(
                or_(
                    ItemModel.confirmed_at < last_confirmed_at,
                    and_(
                        ItemModel.confirmed_at == last_confirmed_at,
                        ItemModel.id < last_id,
                    ),
                )
            )
        
        # Order by (confirmed_at DESC, id DESC) for stable pagination
        query = query.order_by(
            ItemModel.confirmed_at.desc(),
            ItemModel.id.desc(),
        ).limit(limit)
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]
