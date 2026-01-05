"""Pydantic schemas for upload API."""

from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class InitiateUploadRequest(BaseModel):
    """Request to initiate an upload."""
    model_config = ConfigDict(populate_by_name=True)
    
    filename: str = Field(..., max_length=255)
    mime_type: str = Field(..., alias="mimeType")
    size_bytes: int = Field(..., alias="sizeBytes", gt=0)
    kind: str = Field(..., pattern="^(image|file)$")
    item_id: str | None = Field(None, alias="itemId")
    checksum: str | None = None
    idempotency_key: str | None = Field(None, alias="idempotencyKey", max_length=36)


class InitiateUploadResponse(BaseModel):
    """Response for upload initiation."""
    model_config = ConfigDict(populate_by_name=True)
    
    upload_id: str = Field(..., alias="uploadId")
    object_key: str = Field(..., alias="objectKey")
    presigned_put_url: str = Field(..., alias="presignedPutUrl")
    headers_to_include: dict[str, str] = Field(..., alias="headersToInclude")
    expires_at: datetime = Field(..., alias="expiresAt")
    status: str


class CompleteUploadRequest(BaseModel):
    """Request to complete an upload."""
    model_config = ConfigDict(populate_by_name=True)
    
    upload_id: str = Field(..., alias="uploadId")
    item_id: str = Field(..., alias="itemId")
    etag: str | None = None


class UploadInfo(BaseModel):
    """Upload information in response."""
    model_config = ConfigDict(populate_by_name=True)
    
    id: str
    object_key: str = Field(..., alias="objectKey")
    filename: str
    mime_type: str = Field(..., alias="mimeType")
    size_bytes: int = Field(..., alias="sizeBytes")
    kind: str
    status: str
    created_at: datetime = Field(..., alias="createdAt")
    completed_at: datetime | None = Field(None, alias="completedAt")


class AttachmentInfo(BaseModel):
    """Attachment information in response."""
    model_config = ConfigDict(populate_by_name=True)
    
    id: str
    upload_id: str = Field(..., alias="uploadId")
    item_id: str | None = Field(None, alias="itemId")
    display_name: str = Field(..., alias="displayName")
    kind: str
    created_at: datetime | None = Field(None, alias="createdAt")


class CompleteUploadResponse(BaseModel):
    """Response for upload completion."""
    model_config = ConfigDict(populate_by_name=True)
    
    upload: UploadInfo
    attachment: AttachmentInfo | None = None


class GetUploadResponse(BaseModel):
    """Response for getting upload status."""
    model_config = ConfigDict(populate_by_name=True)
    
    id: str
    object_key: str = Field(..., alias="objectKey")
    filename: str
    mime_type: str = Field(..., alias="mimeType")
    size_bytes: int = Field(..., alias="sizeBytes")
    kind: str
    status: str
    created_at: datetime = Field(..., alias="createdAt")
    completed_at: datetime | None = Field(None, alias="completedAt")
    expires_at: datetime = Field(..., alias="expiresAt")


class DownloadUrlResponse(BaseModel):
    """Response for download URL request."""
    model_config = ConfigDict(populate_by_name=True)
    
    download_url: str = Field(..., alias="downloadUrl")
    expires_at: datetime = Field(..., alias="expiresAt")
    filename: str
    mime_type: str = Field(..., alias="mimeType")
    size_bytes: int = Field(..., alias="sizeBytes")


class AttachmentListItem(BaseModel):
    """Attachment in list response."""
    model_config = ConfigDict(populate_by_name=True)
    
    id: str
    upload_id: str = Field(..., alias="uploadId")
    display_name: str = Field(..., alias="displayName")
    mime_type: str | None = Field(None, alias="mimeType")
    size_bytes: int | None = Field(None, alias="sizeBytes")
    kind: str
    created_at: datetime = Field(..., alias="createdAt")


class AttachmentListResponse(BaseModel):
    """Response for listing attachments."""
    model_config = ConfigDict(populate_by_name=True)
    
    attachments: list[AttachmentListItem]
    total: int


class UploadErrorDetail(BaseModel):
    """Error detail for upload errors."""
    code: str
    message: str
    details: dict | None = None


class UploadErrorResponse(BaseModel):
    """Error response for upload endpoints."""
    model_config = ConfigDict(populate_by_name=True)
    
    error: UploadErrorDetail
    request_id: str | None = Field(None, alias="requestId")
