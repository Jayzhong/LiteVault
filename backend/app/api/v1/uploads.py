"""Uploads API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Header, status

from app.api.dependencies import (
    get_current_user,
    get_db_session,
)
from app.api.schemas.uploads import (
    InitiateUploadRequest,
    InitiateUploadResponse,
    CompleteUploadRequest,
    CompleteUploadResponse,
    GetUploadResponse,
    DownloadUrlResponse,
    AttachmentListResponse,
    AttachmentListItem,
    UploadInfo,
    AttachmentInfo,
)
from app.domain.entities.user import User
from app.infrastructure.persistence.repositories.upload_repository_impl import (
    SQLAlchemyUploadRepository,
)
from app.infrastructure.persistence.repositories.item_attachment_repository_impl import (
    SQLAlchemyItemAttachmentRepository,
)
from app.application.uploads.upload_service import (
    UploadService,
    FileTooLargeError,
    InvalidFileTypeError,
    UploadNotFoundError,
    UploadExpiredError,
    UploadInvalidStateError,
    UploadVerificationError,
    AttachmentNotFoundError,
)

router = APIRouter(prefix="/uploads", tags=["uploads"])


async def get_upload_service(
    session=Depends(get_db_session),
) -> UploadService:
    """Dependency to get UploadService instance."""
    upload_repo = SQLAlchemyUploadRepository(session)
    attachment_repo = SQLAlchemyItemAttachmentRepository(session)
    return UploadService(upload_repo, attachment_repo)


@router.post(
    "/initiate",
    status_code=status.HTTP_201_CREATED,
    response_model=InitiateUploadResponse,
)
async def initiate_upload(
    request: InitiateUploadRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    upload_service: Annotated[UploadService, Depends(get_upload_service)],
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Initiate a file upload and get presigned PUT URL.
    
    Returns a presigned URL for direct upload to object storage.
    Client should PUT file bytes to the returned URL with required headers.
    """
    try:
        result = await upload_service.initiate_upload(
            user_id=current_user.id,
            filename=request.filename,
            mime_type=request.mime_type,
            size_bytes=request.size_bytes,
            kind=request.kind,
            item_id=request.item_id,
            checksum=request.checksum,
            idempotency_key=request.idempotency_key,
            request_id=x_request_id,
        )
        return InitiateUploadResponse(
            upload_id=result["upload_id"],
            object_key=result["object_key"],
            presigned_put_url=result["presigned_put_url"],
            headers_to_include=result["headers_to_include"],
            expires_at=result["expires_at"],
            status=result["status"],
        )
    except FileTooLargeError as e:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "code": "FILE_TOO_LARGE",
                "message": f"File size {e.size_bytes} exceeds maximum of {e.max_size} bytes",
                "details": {
                    "maxSizeBytes": e.max_size,
                    "requestedSizeBytes": e.size_bytes,
                },
            },
        )
    except InvalidFileTypeError as e:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={
                "code": "INVALID_FILE_TYPE",
                "message": f"File type {e.mime_type} is not supported",
                "details": {
                    "mimeType": e.mime_type,
                    "allowedTypes": e.allowed,
                },
            },
        )


@router.post(
    "/complete",
    status_code=status.HTTP_200_OK,
    response_model=CompleteUploadResponse,
)
async def complete_upload(
    request: CompleteUploadRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    upload_service: Annotated[UploadService, Depends(get_upload_service)],
):
    """Complete an upload after file has been uploaded to storage.
    
    Verifies the object exists in storage and creates an attachment record.
    This endpoint is idempotent - calling multiple times returns same result.
    """
    try:
        result = await upload_service.complete_upload(
            user_id=current_user.id,
            upload_id=request.upload_id,
            item_id=request.item_id,
            etag=request.etag,
        )
        return CompleteUploadResponse(
            upload=UploadInfo(**result["upload"]),
            attachment=AttachmentInfo(**result["attachment"]) if result["attachment"] else None,
        )
    except UploadNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "UPLOAD_NOT_FOUND", "message": "Upload not found"},
        )
    except UploadExpiredError:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail={"code": "UPLOAD_EXPIRED", "message": "Presigned URL has expired"},
        )
    except UploadInvalidStateError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "INVALID_UPLOAD_STATE",
                "message": f"Upload status is {e.current_status}, expected {e.expected}",
            },
        )
    except UploadVerificationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "UPLOAD_VERIFICATION_FAILED",
                "message": "Object not found in storage - upload may have failed",
            },
        )


@router.get(
    "/{upload_id}",
    response_model=GetUploadResponse,
)
async def get_upload(
    upload_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    upload_service: Annotated[UploadService, Depends(get_upload_service)],
):
    """Get upload status and metadata."""
    result = await upload_service.get_upload(current_user.id, upload_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "UPLOAD_NOT_FOUND", "message": "Upload not found"},
        )
    return GetUploadResponse(**result)


@router.delete(
    "/{upload_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_upload(
    upload_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    upload_service: Annotated[UploadService, Depends(get_upload_service)],
):
    """Soft delete an upload."""
    deleted = await upload_service.delete_upload(current_user.id, upload_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "UPLOAD_NOT_FOUND", "message": "Upload not found"},
        )
    return None


# Attachment endpoints
attachments_router = APIRouter(prefix="/attachments", tags=["attachments"])


@attachments_router.get(
    "/{attachment_id}/download_url",
    response_model=DownloadUrlResponse,
)
async def get_download_url(
    attachment_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    upload_service: Annotated[UploadService, Depends(get_upload_service)],
    preview: bool = False,
):
    """Get presigned download URL for an attachment.
    
    Args:
        attachment_id: Attachment ID
        preview: If true, returns inline URL for in-browser viewing (PDF preview)
    """
    try:
        result = await upload_service.get_download_url(
            current_user.id, attachment_id, preview=preview
        )
        return DownloadUrlResponse(**result)
    except AttachmentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ATTACHMENT_NOT_FOUND", "message": "Attachment not found"},
        )


@attachments_router.delete(
    "/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_attachment(
    attachment_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    upload_service: Annotated[UploadService, Depends(get_upload_service)],
):
    """Soft delete an attachment."""
    deleted = await upload_service.delete_attachment(current_user.id, attachment_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ATTACHMENT_NOT_FOUND", "message": "Attachment not found"},
        )
    return None


# Item attachments endpoint (to be added to items router, but defined here for grouping)
items_attachments_router = APIRouter(prefix="/items", tags=["items"])


@items_attachments_router.get(
    "/{item_id}/attachments",
    response_model=AttachmentListResponse,
)
async def list_item_attachments(
    item_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    upload_service: Annotated[UploadService, Depends(get_upload_service)],
):
    """List all attachments for an item."""
    attachments = await upload_service.list_item_attachments(current_user.id, item_id)
    return AttachmentListResponse(
        attachments=[AttachmentListItem(**a) for a in attachments],
        total=len(attachments),
    )
