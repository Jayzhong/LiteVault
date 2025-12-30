"""SQLAlchemy implementation of ItemTagRepository."""

from sqlalchemy import select, delete, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.repositories.item_tag_repository import ItemTagRepository
from app.infrastructure.persistence.models.item_tag_model import ItemTagModel


class SQLAlchemyItemTagRepository(ItemTagRepository):
    """SQLAlchemy implementation of ItemTagRepository."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, item_id: str, tag_id: str) -> None:
        """Create an association between item and tag.
        
        Uses INSERT ... ON CONFLICT DO NOTHING to handle duplicates.
        """
        stmt = pg_insert(ItemTagModel).values(
            item_id=item_id,
            tag_id=tag_id,
        ).on_conflict_do_nothing(index_elements=["item_id", "tag_id"])
        await self.session.execute(stmt)

    async def exists(self, item_id: str, tag_id: str) -> bool:
        """Check if an association exists."""
        stmt = select(ItemTagModel).where(
            ItemTagModel.item_id == item_id,
            ItemTagModel.tag_id == tag_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def delete_by_item_id(self, item_id: str) -> None:
        """Delete all tag associations for an item."""
        stmt = delete(ItemTagModel).where(ItemTagModel.item_id == item_id)
        await self.session.execute(stmt)

    async def delete_by_tag_id(self, tag_id: str) -> None:
        """Delete all associations for a tag."""
        stmt = delete(ItemTagModel).where(ItemTagModel.tag_id == tag_id)
        await self.session.execute(stmt)

    async def get_tag_ids_by_item_id(self, item_id: str) -> list[str]:
        """Get all tag IDs associated with an item."""
        stmt = select(ItemTagModel.tag_id).where(ItemTagModel.item_id == item_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_item_ids_by_tag_id(self, tag_id: str) -> list[str]:
        """Get all item IDs associated with a tag."""
        stmt = select(ItemTagModel.item_id).where(ItemTagModel.tag_id == tag_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_by_tag_id(self, tag_id: str) -> int:
        """Count items associated with a tag."""
        stmt = select(func.count()).select_from(ItemTagModel).where(
            ItemTagModel.tag_id == tag_id
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0
