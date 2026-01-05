"""SQLAlchemy ItemAttachment repository implementation."""

from datetime import datetime, timezone
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.persistence.models.item_attachment_model import ItemAttachmentModel


class SQLAlchemyItemAttachmentRepository:
    """SQLAlchemy implementation of ItemAttachment repository."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        *,
        id: str,
        user_id: str,
        item_id: str,
        upload_id: str,
        display_name: str,
        kind: str,
        sort_order: int | None = None,
    ) -> ItemAttachmentModel:
        """Create a new attachment record."""
        # If no sort_order provided, get next order for this item
        if sort_order is None:
            result = await self.session.execute(
                select(func.coalesce(func.max(ItemAttachmentModel.sort_order), -1))
                .where(
                    ItemAttachmentModel.item_id == item_id,
                    ItemAttachmentModel.deleted_at.is_(None),
                )
            )
            max_order = result.scalar() or -1
            sort_order = max_order + 1

        model = ItemAttachmentModel(
            id=id,
            user_id=user_id,
            item_id=item_id,
            upload_id=upload_id,
            display_name=display_name,
            kind=kind,
            sort_order=sort_order,
        )
        self.session.add(model)
        await self.session.flush()
        return model

    async def get_by_id(self, attachment_id: str, user_id: str) -> ItemAttachmentModel | None:
        """Get attachment by ID, scoped to user."""
        result = await self.session.execute(
            select(ItemAttachmentModel).where(
                ItemAttachmentModel.id == attachment_id,
                ItemAttachmentModel.user_id == user_id,
                ItemAttachmentModel.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_upload_id(self, upload_id: str) -> ItemAttachmentModel | None:
        """Get attachment by upload ID."""
        result = await self.session.execute(
            select(ItemAttachmentModel).where(
                ItemAttachmentModel.upload_id == upload_id,
                ItemAttachmentModel.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_by_item(self, item_id: str, user_id: str) -> list[ItemAttachmentModel]:
        """List all attachments for an item."""
        result = await self.session.execute(
            select(ItemAttachmentModel)
            .where(
                ItemAttachmentModel.item_id == item_id,
                ItemAttachmentModel.user_id == user_id,
                ItemAttachmentModel.deleted_at.is_(None),
            )
            .order_by(ItemAttachmentModel.sort_order)
        )
        return list(result.scalars().all())

    async def count_by_item(self, item_id: str) -> int:
        """Count attachments for an item."""
        result = await self.session.execute(
            select(func.count())
            .select_from(ItemAttachmentModel)
            .where(
                ItemAttachmentModel.item_id == item_id,
                ItemAttachmentModel.deleted_at.is_(None),
            )
        )
        return result.scalar() or 0

    async def soft_delete(self, attachment_id: str, user_id: str) -> bool:
        """Soft delete an attachment."""
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            update(ItemAttachmentModel)
            .where(
                ItemAttachmentModel.id == attachment_id,
                ItemAttachmentModel.user_id == user_id,
                ItemAttachmentModel.deleted_at.is_(None),
            )
            .values(deleted_at=now, updated_at=now)
        )
        return result.rowcount > 0

    async def soft_delete_by_item(self, item_id: str, user_id: str) -> int:
        """Soft delete all attachments for an item."""
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            update(ItemAttachmentModel)
            .where(
                ItemAttachmentModel.item_id == item_id,
                ItemAttachmentModel.user_id == user_id,
                ItemAttachmentModel.deleted_at.is_(None),
            )
            .values(deleted_at=now, updated_at=now)
        )
        return result.rowcount
