"""SQLAlchemy Upload repository implementation."""

from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.persistence.models.upload_model import UploadModel


class SQLAlchemyUploadRepository:
    """SQLAlchemy implementation of Upload repository."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        *,
        id: str,
        user_id: str,
        object_key: str,
        bucket: str,
        filename: str,
        mime_type: str,
        size_bytes: int,
        kind: str,
        expires_at: datetime,
        checksum: str | None = None,
        idempotency_key: str | None = None,
        request_id: str | None = None,
    ) -> UploadModel:
        """Create a new upload record."""
        model = UploadModel(
            id=id,
            user_id=user_id,
            status="INITIATED",
            object_key=object_key,
            bucket=bucket,
            filename=filename,
            mime_type=mime_type,
            size_bytes=size_bytes,
            kind=kind,
            checksum=checksum,
            idempotency_key=idempotency_key,
            request_id=request_id,
            expires_at=expires_at,
        )
        self.session.add(model)
        await self.session.flush()
        return model

    async def get_by_id(self, upload_id: str, user_id: str) -> UploadModel | None:
        """Get upload by ID, scoped to user."""
        result = await self.session.execute(
            select(UploadModel).where(
                UploadModel.id == upload_id,
                UploadModel.user_id == user_id,
                UploadModel.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id_for_update(self, upload_id: str, user_id: str) -> UploadModel | None:
        """Get upload by ID with row lock for update (user-scoped)."""
        result = await self.session.execute(
            select(UploadModel)
            .where(
                UploadModel.id == upload_id,
                UploadModel.user_id == user_id,
                UploadModel.deleted_at.is_(None),
            )
            .with_for_update()
        )
        return result.scalar_one_or_none()

    async def get_by_idempotency_key(
        self, user_id: str, idempotency_key: str
    ) -> UploadModel | None:
        """Get upload by idempotency key (for dedup)."""
        result = await self.session.execute(
            select(UploadModel).where(
                UploadModel.user_id == user_id,
                UploadModel.idempotency_key == idempotency_key,
                UploadModel.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def mark_completed(
        self, upload_id: str, etag: str | None = None
    ) -> UploadModel | None:
        """Mark upload as completed."""
        now = datetime.now(timezone.utc)
        await self.session.execute(
            update(UploadModel)
            .where(UploadModel.id == upload_id)
            .values(
                status="COMPLETED",
                completed_at=now,
                updated_at=now,
                etag=etag,
            )
        )
        # Refresh and return
        result = await self.session.execute(
            select(UploadModel).where(UploadModel.id == upload_id)
        )
        return result.scalar_one_or_none()

    async def mark_failed(self, upload_id: str) -> None:
        """Mark upload as failed."""
        now = datetime.now(timezone.utc)
        await self.session.execute(
            update(UploadModel)
            .where(UploadModel.id == upload_id)
            .values(status="FAILED", updated_at=now)
        )

    async def mark_expired(self, upload_id: str) -> None:
        """Mark upload as expired."""
        now = datetime.now(timezone.utc)
        await self.session.execute(
            update(UploadModel)
            .where(UploadModel.id == upload_id)
            .values(status="EXPIRED", updated_at=now)
        )

    async def soft_delete(self, upload_id: str, user_id: str) -> bool:
        """Soft delete an upload."""
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            update(UploadModel)
            .where(
                UploadModel.id == upload_id,
                UploadModel.user_id == user_id,
                UploadModel.deleted_at.is_(None),
            )
            .values(status="DELETED", deleted_at=now, updated_at=now)
        )
        return result.rowcount > 0

    async def list_expired_initiated(self, before: datetime, limit: int = 100) -> list[UploadModel]:
        """List uploads stuck in INITIATED status past expiry (for cleanup)."""
        result = await self.session.execute(
            select(UploadModel)
            .where(
                UploadModel.status == "INITIATED",
                UploadModel.expires_at < before,
            )
            .limit(limit)
        )
        return list(result.scalars().all())
