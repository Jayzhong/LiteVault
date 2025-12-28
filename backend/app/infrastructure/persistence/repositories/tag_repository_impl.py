"""Tag repository implementation."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.tag import Tag
from app.infrastructure.persistence.models.tag_model import TagModel


class SQLAlchemyTagRepository:
    """SQLAlchemy implementation of TagRepository."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, tag: Tag) -> Tag:
        """Create a new tag."""
        model = TagModel(
            id=tag.id,
            user_id=tag.user_id,
            name=tag.name,
            name_lower=tag.name_lower,
            usage_count=tag.usage_count,
            last_used=tag.last_used,
            created_at=tag.created_at or datetime.now(timezone.utc),
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, tag_id: str, user_id: str) -> Tag | None:
        """Get tag by ID, scoped to user."""
        result = await self.session.execute(
            select(TagModel).where(
                TagModel.id == tag_id,
                TagModel.user_id == user_id,
            )
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_name(self, name: str, user_id: str) -> Tag | None:
        """Get tag by name (case-insensitive), scoped to user."""
        result = await self.session.execute(
            select(TagModel).where(
                TagModel.user_id == user_id,
                TagModel.name_lower == name.lower().strip(),
            )
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_by_user(
        self,
        user_id: str,
        query: str | None = None,
        show_unused: bool | None = None,
        sort: str = "name",
        limit: int = 50,
    ) -> list[Tag]:
        """List tags for user with filters."""
        stmt = select(TagModel).where(TagModel.user_id == user_id)
        
        # Apply query filter
        if query:
            stmt = stmt.where(TagModel.name_lower.contains(query.lower()))
        
        # Apply unused filter
        if show_unused is True:
            stmt = stmt.where(TagModel.usage_count == 0)
        elif show_unused is False:
            stmt = stmt.where(TagModel.usage_count > 0)
        
        # Apply sort
        if sort == "usage":
            stmt = stmt.order_by(TagModel.usage_count.desc(), TagModel.name.asc())
        elif sort == "lastUsed":
            stmt = stmt.order_by(TagModel.last_used.desc().nullslast(), TagModel.name.asc())
        else:  # default: name
            stmt = stmt.order_by(TagModel.name.asc())
        
        stmt = stmt.limit(limit)
        
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def count_by_user(self, user_id: str) -> int:
        """Count total tags for user."""
        result = await self.session.execute(
            select(func.count(TagModel.id)).where(TagModel.user_id == user_id)
        )
        return result.scalar() or 0

    async def update(self, tag: Tag) -> Tag:
        """Update an existing tag."""
        result = await self.session.execute(
            select(TagModel).where(TagModel.id == tag.id)
        )
        model = result.scalar_one_or_none()
        if model:
            model.name = tag.name
            model.name_lower = tag.name_lower
            model.usage_count = tag.usage_count
            model.last_used = tag.last_used
            await self.session.flush()
        return tag

    async def delete(self, tag_id: str, user_id: str) -> bool:
        """Delete a tag."""
        result = await self.session.execute(
            select(TagModel).where(
                TagModel.id == tag_id,
                TagModel.user_id == user_id,
            )
        )
        model = result.scalar_one_or_none()
        if model:
            await self.session.delete(model)
            await self.session.flush()
            return True
        return False

    async def get_or_create(self, name: str, user_id: str) -> Tag:
        """Get existing tag or create new one."""
        existing = await self.get_by_name(name, user_id)
        if existing:
            return existing
        
        tag = Tag(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=name.strip(),
            name_lower=name.lower().strip(),
            usage_count=0,
            last_used=None,
            created_at=datetime.now(timezone.utc),
        )
        return await self.create(tag)

    def _to_entity(self, model: TagModel) -> Tag:
        """Convert ORM model to domain entity."""
        return Tag(
            id=model.id,
            user_id=model.user_id,
            name=model.name,
            name_lower=model.name_lower,
            usage_count=model.usage_count,
            last_used=model.last_used,
            created_at=model.created_at,
        )
