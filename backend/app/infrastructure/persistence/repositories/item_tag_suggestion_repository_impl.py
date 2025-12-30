"""SQLAlchemy Item Tag Suggestion repository implementation."""

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.item_tag_suggestion import (
    ItemTagSuggestion,
    SuggestionStatus,
    SuggestionSource,
)
from app.domain.repositories.item_tag_suggestion_repository import ItemTagSuggestionRepository
from app.infrastructure.persistence.models.item_tag_suggestion_model import ItemTagSuggestionModel


class SQLAlchemyItemTagSuggestionRepository(ItemTagSuggestionRepository):
    """SQLAlchemy implementation of ItemTagSuggestionRepository."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, suggestion: ItemTagSuggestion) -> ItemTagSuggestion:
        """Persist a new suggestion."""
        model = self._to_model(suggestion)
        self.session.add(model)
        await self.session.flush()
        return suggestion

    async def create_many(self, suggestions: list[ItemTagSuggestion]) -> list[ItemTagSuggestion]:
        """Persist multiple suggestions."""
        if not suggestions:
            return []
        models = [self._to_model(s) for s in suggestions]
        self.session.add_all(models)
        await self.session.flush()
        return suggestions

    async def get_by_id(self, suggestion_id: str, user_id: str) -> ItemTagSuggestion | None:
        """Get suggestion by ID, scoped to user."""
        result = await self.session.execute(
            select(ItemTagSuggestionModel).where(
                ItemTagSuggestionModel.id == suggestion_id,
                ItemTagSuggestionModel.user_id == user_id,
            )
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None
        return self._to_entity(model)

    async def get_by_ids(self, suggestion_ids: list[str], user_id: str) -> list[ItemTagSuggestion]:
        """Get multiple suggestions by IDs, scoped to user."""
        if not suggestion_ids:
            return []
        result = await self.session.execute(
            select(ItemTagSuggestionModel).where(
                ItemTagSuggestionModel.id.in_(suggestion_ids),
                ItemTagSuggestionModel.user_id == user_id,
            )
        )
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def get_by_item_id(self, item_id: str, user_id: str) -> list[ItemTagSuggestion]:
        """Get all suggestions for an item."""
        result = await self.session.execute(
            select(ItemTagSuggestionModel)
            .where(
                ItemTagSuggestionModel.item_id == item_id,
                ItemTagSuggestionModel.user_id == user_id,
            )
            .order_by(ItemTagSuggestionModel.created_at)
        )
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def update(self, suggestion: ItemTagSuggestion) -> ItemTagSuggestion:
        """Update an existing suggestion."""
        await self.session.execute(
            update(ItemTagSuggestionModel)
            .where(ItemTagSuggestionModel.id == suggestion.id)
            .values(
                status=suggestion.status.value,
                reviewed_at=suggestion.reviewed_at,
                meta=suggestion.meta,
            )
        )
        await self.session.flush()
        return suggestion

    async def update_many(self, suggestions: list[ItemTagSuggestion]) -> list[ItemTagSuggestion]:
        """Update multiple suggestions."""
        for suggestion in suggestions:
            await self.update(suggestion)
        return suggestions

    async def delete_by_item_id(self, item_id: str) -> int:
        """Delete all suggestions for an item. Returns count deleted."""
        result = await self.session.execute(
            delete(ItemTagSuggestionModel).where(
                ItemTagSuggestionModel.item_id == item_id
            )
        )
        await self.session.flush()
        return result.rowcount

    def _to_model(self, entity: ItemTagSuggestion) -> ItemTagSuggestionModel:
        """Convert domain entity to ORM model."""
        return ItemTagSuggestionModel(
            id=entity.id,
            user_id=entity.user_id,
            item_id=entity.item_id,
            source=entity.source.value,
            suggested_name=entity.suggested_name,
            normalized_name=entity.normalized_name,
            confidence=entity.confidence,
            status=entity.status.value,
            created_at=entity.created_at,
            reviewed_at=entity.reviewed_at,
            meta=entity.meta,
        )

    def _to_entity(self, model: ItemTagSuggestionModel) -> ItemTagSuggestion:
        """Convert ORM model to domain entity."""
        return ItemTagSuggestion(
            id=model.id,
            user_id=model.user_id,
            item_id=model.item_id,
            source=SuggestionSource(model.source) if model.source else SuggestionSource.AI,
            suggested_name=model.suggested_name,
            normalized_name=model.normalized_name,
            confidence=model.confidence,
            status=SuggestionStatus(model.status) if model.status else SuggestionStatus.PENDING,
            created_at=model.created_at,
            reviewed_at=model.reviewed_at,
            meta=dict(model.meta) if model.meta else {},
        )
