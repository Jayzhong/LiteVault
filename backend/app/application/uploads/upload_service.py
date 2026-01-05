"""Upload service for file upload workflow."""

import re
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from app.config import settings
from app.infrastructure.storage.s3_client import (
    generate_presigned_put_url,
    generate_presigned_get_url,
    head_object,
)
from app.infrastructure.persistence.repositories.upload_repository_impl import (
    SQLAlchemyUploadRepository,
)
from app.infrastructure.persistence.repositories.item_attachment_repository_impl import (
    SQLAlchemyItemAttachmentRepository,
)


class UploadServiceError(Exception):
    """Base exception for upload service."""
    pass


class FileTooLargeError(UploadServiceError):
    """File exceeds size limit."""
    def __init__(self, size_bytes: int, max_size: int):
        self.size_bytes = size_bytes
        self.max_size = max_size
        super().__init__(f"File size {size_bytes} exceeds maximum {max_size}")


class InvalidFileTypeError(UploadServiceError):
    """File type not allowed."""
    def __init__(self, mime_type: str, allowed: list[str]):
        self.mime_type = mime_type
        self.allowed = allowed
        super().__init__(f"File type {mime_type} not allowed")


class UploadNotFoundError(UploadServiceError):
    """Upload not found."""
    pass


class UploadExpiredError(UploadServiceError):
    """Upload presigned URL has expired."""
    pass


class UploadInvalidStateError(UploadServiceError):
    """Upload is in invalid state for operation."""
    def __init__(self, current_status: str, expected: str):
        self.current_status = current_status
        self.expected = expected
        super().__init__(f"Upload status is {current_status}, expected {expected}")


class UploadVerificationError(UploadServiceError):
    """Object not found in storage after upload."""
    pass


class AttachmentNotFoundError(UploadServiceError):
    """Attachment not found."""
    pass


class UploadService:
    """Service for managing file uploads."""

    def __init__(
        self,
        upload_repo: SQLAlchemyUploadRepository,
        attachment_repo: SQLAlchemyItemAttachmentRepository,
    ):
        self.upload_repo = upload_repo
        self.attachment_repo = attachment_repo

    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename for use in object key."""
        # Remove path components
        filename = filename.replace("\\", "/").split("/")[-1]
        # Remove dangerous characters
        filename = re.sub(r'[^\w\-_\. ]', '', filename)
        # Replace spaces with underscores
        filename = filename.replace(" ", "_")
        # Truncate to 100 chars
        if len(filename) > 100:
            name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")
            max_name_len = 100 - len(ext) - 1 if ext else 100
            filename = f"{name[:max_name_len]}.{ext}" if ext else name[:100]
        return filename or "unnamed"

    def _generate_object_key(self, user_id: str, upload_id: str, filename: str) -> str:
        """Generate S3 object key with user partitioning."""
        safe_filename = self._sanitize_filename(filename)
        return f"{user_id}/{upload_id}/{safe_filename}"

    async def initiate_upload(
        self,
        *,
        user_id: str,
        filename: str,
        mime_type: str,
        size_bytes: int,
        kind: str,
        item_id: str | None = None,
        checksum: str | None = None,
        idempotency_key: str | None = None,
        request_id: str | None = None,
    ) -> dict:
        """Initiate a new upload and return presigned PUT URL.
        
        Args:
            user_id: User initiating upload
            filename: Original filename
            mime_type: MIME type of file
            size_bytes: File size in bytes
            kind: 'image' or 'file'
            item_id: Optional item to attach to
            checksum: Optional content hash
            idempotency_key: Optional dedup key
            request_id: Request ID for tracing
            
        Returns:
            Dict with upload_id, presigned_url, object_key, expires_at
            
        Raises:
            FileTooLargeError: If size exceeds limit
            InvalidFileTypeError: If MIME type not allowed
        """
        # Validate size
        if size_bytes > settings.upload_max_size_bytes:
            raise FileTooLargeError(size_bytes, settings.upload_max_size_bytes)
        
        # Validate MIME type
        if mime_type not in settings.upload_allowed_types:
            raise InvalidFileTypeError(mime_type, settings.upload_allowed_types)
        
        # Check for idempotent replay
        if idempotency_key:
            existing = await self.upload_repo.get_by_idempotency_key(
                user_id, idempotency_key
            )
            if existing:
                # Return existing upload info
                return self._format_initiate_response(existing)
        
        # Generate IDs and object key
        upload_id = str(uuid4())
        object_key = self._generate_object_key(user_id, upload_id, filename)
        expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=settings.upload_presigned_url_expiry_seconds
        )
        
        # Create upload record
        upload = await self.upload_repo.create(
            id=upload_id,
            user_id=user_id,
            object_key=object_key,
            bucket=settings.s3_bucket_name,
            filename=filename,
            mime_type=mime_type,
            size_bytes=size_bytes,
            kind=kind,
            checksum=checksum,
            idempotency_key=idempotency_key,
            request_id=request_id,
            expires_at=expires_at,
        )
        
        return self._format_initiate_response(upload)

    def _format_initiate_response(self, upload) -> dict:
        """Format upload model to initiate response."""
        # Generate presigned URL
        presigned = generate_presigned_put_url(
            object_key=upload.object_key,
            content_type=upload.mime_type,
            content_length=upload.size_bytes,
        )
        
        return {
            "upload_id": upload.id,
            "object_key": upload.object_key,
            "presigned_put_url": presigned["presigned_url"],
            "headers_to_include": presigned["headers_to_include"],
            "expires_at": upload.expires_at,
            "status": upload.status,
        }

    async def complete_upload(
        self,
        *,
        user_id: str,
        upload_id: str,
        item_id: str,
        etag: str | None = None,
    ) -> dict:
        """Complete an upload and create attachment.
        
        Args:
            user_id: User completing upload
            upload_id: Upload to complete
            item_id: Item to attach to
            etag: Optional ETag from S3
            
        Returns:
            Dict with upload and attachment info
            
        Raises:
            UploadNotFoundError: If upload not found
            UploadExpiredError: If presigned URL expired
            UploadInvalidStateError: If upload not in INITIATED status
            UploadVerificationError: If object not found in S3
        """
        # Get upload with lock
        upload = await self.upload_repo.get_by_id_for_update(upload_id, user_id)
        if not upload:
            raise UploadNotFoundError(f"Upload {upload_id} not found")
        
        # Check if already completed (idempotent)
        if upload.status == "COMPLETED":
            attachment = await self.attachment_repo.get_by_upload_id(upload_id)
            return self._format_complete_response(upload, attachment)
        
        # Check status
        if upload.status != "INITIATED":
            raise UploadInvalidStateError(upload.status, "INITIATED")
        
        # Check expiry
        if upload.expires_at < datetime.now(timezone.utc):
            await self.upload_repo.mark_expired(upload_id)
            raise UploadExpiredError("Presigned URL has expired")
        
        # Verify object exists in S3
        obj_meta = head_object(upload.object_key)
        if not obj_meta:
            await self.upload_repo.mark_failed(upload_id)
            raise UploadVerificationError("Object not found in storage")
        
        # Mark completed
        upload = await self.upload_repo.mark_completed(upload_id, etag)
        
        # Create attachment
        attachment_id = str(uuid4())
        attachment = await self.attachment_repo.create(
            id=attachment_id,
            user_id=user_id,
            item_id=item_id,
            upload_id=upload_id,
            display_name=upload.filename,
            kind=upload.kind,
        )
        
        return self._format_complete_response(upload, attachment)

    def _format_complete_response(self, upload, attachment) -> dict:
        """Format complete response."""
        return {
            "upload": {
                "id": upload.id,
                "object_key": upload.object_key,
                "filename": upload.filename,
                "mime_type": upload.mime_type,
                "size_bytes": upload.size_bytes,
                "kind": upload.kind,
                "status": upload.status,
                "created_at": upload.created_at,
                "completed_at": upload.completed_at,
            },
            "attachment": {
                "id": attachment.id if attachment else None,
                "upload_id": upload.id,
                "item_id": attachment.item_id if attachment else None,
                "display_name": attachment.display_name if attachment else upload.filename,
                "kind": attachment.kind if attachment else upload.kind,
                "created_at": attachment.created_at if attachment else None,
            } if attachment else None,
        }

    async def get_upload(self, user_id: str, upload_id: str) -> dict | None:
        """Get upload by ID."""
        upload = await self.upload_repo.get_by_id(upload_id, user_id)
        if not upload:
            return None
        return {
            "id": upload.id,
            "object_key": upload.object_key,
            "filename": upload.filename,
            "mime_type": upload.mime_type,
            "size_bytes": upload.size_bytes,
            "kind": upload.kind,
            "status": upload.status,
            "created_at": upload.created_at,
            "completed_at": upload.completed_at,
            "expires_at": upload.expires_at,
        }

    async def delete_upload(self, user_id: str, upload_id: str) -> bool:
        """Soft delete an upload."""
        return await self.upload_repo.soft_delete(upload_id, user_id)

    async def get_download_url(
        self, user_id: str, attachment_id: str, preview: bool = False
    ) -> dict:
        """Get presigned download URL for attachment.
        
        Args:
            user_id: User requesting download
            attachment_id: Attachment to download
            preview: If True, use inline disposition for in-browser viewing
            
        Returns:
            Dict with download_url and metadata
            
        Raises:
            AttachmentNotFoundError: If attachment not found
        """
        attachment = await self.attachment_repo.get_by_id(attachment_id, user_id)
        if not attachment:
            raise AttachmentNotFoundError(f"Attachment {attachment_id} not found")
        
        # Get upload for object key
        upload = await self.upload_repo.get_by_id(attachment.upload_id, user_id)
        if not upload:
            raise AttachmentNotFoundError("Associated upload not found")
        
        # Generate presigned GET URL
        presigned = generate_presigned_get_url(
            object_key=upload.object_key,
            filename=upload.filename,
            inline=preview,
        )
        
        return {
            "download_url": presigned["presigned_url"],
            "expires_at": datetime.now(timezone.utc) + timedelta(
                seconds=presigned["expires_in_seconds"]
            ),
            "filename": upload.filename,
            "mime_type": upload.mime_type,
            "size_bytes": upload.size_bytes,
        }

    async def list_item_attachments(
        self, user_id: str, item_id: str
    ) -> list[dict]:
        """List all attachments for an item."""
        attachments = await self.attachment_repo.list_by_item(item_id, user_id)
        
        result = []
        for att in attachments:
            upload = await self.upload_repo.get_by_id(att.upload_id, user_id)
            result.append({
                "id": att.id,
                "upload_id": att.upload_id,
                "display_name": att.display_name,
                "mime_type": upload.mime_type if upload else None,
                "size_bytes": upload.size_bytes if upload else None,
                "kind": att.kind,
                "created_at": att.created_at,
            })
        
        return result

    async def delete_attachment(self, user_id: str, attachment_id: str) -> bool:
        """Soft delete an attachment."""
        return await self.attachment_repo.soft_delete(attachment_id, user_id)
