"""S3/MinIO client for object storage operations."""

import logging
from functools import lru_cache
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.config import settings


logger = logging.getLogger(__name__)


@lru_cache()
def get_s3_client():
    """Get configured S3 client for backend-to-storage operations (cached singleton).
    
    Returns:
        boto3 S3 client configured for MinIO (local) or S3 (production).
    """
    config = Config(
        signature_version="s3v4",
        s3={"addressing_style": "path"},  # Required for MinIO compatibility
    )
    
    client = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        use_ssl=settings.s3_use_ssl,
        config=config,
    )
    
    logger.info(
        f"S3 client initialized: endpoint={settings.s3_endpoint_url}, "
        f"bucket={settings.s3_bucket_name}"
    )
    
    return client


@lru_cache()
def get_presigned_client():
    """Get S3 client for generating presigned URLs (uses public URL if configured).
    
    This client uses s3_public_url (if set) so presigned URLs are accessible
    from browsers, not just from inside the Docker network.
    
    Returns:
        boto3 S3 client for presigned URL generation.
    """
    # Use public URL if set, otherwise fall back to endpoint URL
    presigned_endpoint = settings.s3_public_url or settings.s3_endpoint_url
    
    config = Config(
        signature_version="s3v4",
        s3={"addressing_style": "path"},
    )
    
    client = boto3.client(
        "s3",
        endpoint_url=presigned_endpoint,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        use_ssl=settings.s3_use_ssl or presigned_endpoint.startswith("https"),
        config=config,
    )
    
    logger.info(f"Presigned URL client initialized: endpoint={presigned_endpoint}")
    
    return client


def ensure_bucket_exists() -> bool:
    """Create bucket if it doesn't exist (dev only).
    
    Returns:
        True if bucket exists or was created, False on error.
    """
    if settings.env not in ("development", "test"):
        logger.debug("Skipping bucket creation in non-dev environment")
        return True
    
    client = get_s3_client()
    
    try:
        client.head_bucket(Bucket=settings.s3_bucket_name)
        logger.debug(f"Bucket {settings.s3_bucket_name} exists")
        return True
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "")
        if error_code in ("404", "NoSuchBucket"):
            try:
                client.create_bucket(Bucket=settings.s3_bucket_name)
                logger.info(f"Created bucket: {settings.s3_bucket_name}")
                return True
            except ClientError as create_error:
                logger.error(f"Failed to create bucket: {create_error}")
                return False
        else:
            logger.error(f"Failed to check bucket: {e}")
            return False


def generate_presigned_put_url(
    object_key: str,
    content_type: str,
    content_length: int,
    expiry_seconds: int | None = None,
) -> dict[str, Any]:
    """Generate a presigned PUT URL for uploading.
    
    Args:
        object_key: S3 object key.
        content_type: MIME type for the upload.
        content_length: Expected file size in bytes.
        expiry_seconds: URL expiry time (default from settings).
    
    Returns:
        Dict with presigned_url, headers_to_include, expires_in_seconds.
    """
    client = get_presigned_client()
    
    if expiry_seconds is None:
        expiry_seconds = settings.upload_presigned_url_expiry_seconds
    
    presigned_url = client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.s3_bucket_name,
            "Key": object_key,
            "ContentType": content_type,
            "ContentLength": content_length,
        },
        ExpiresIn=expiry_seconds,
    )
    
    return {
        "presigned_url": presigned_url,
        "headers_to_include": {
            "Content-Type": content_type,
            "Content-Length": str(content_length),
        },
        "expires_in_seconds": expiry_seconds,
    }


def generate_presigned_get_url(
    object_key: str,
    expiry_seconds: int | None = None,
    filename: str | None = None,
    inline: bool = False,
) -> dict[str, Any]:
    """Generate a presigned GET URL for downloading or inline viewing.
    
    Args:
        object_key: S3 object key.
        expiry_seconds: URL expiry time (default from settings).
        filename: Optional filename for Content-Disposition header.
        inline: If True, use inline disposition (for preview). If False, attachment (for download).
    
    Returns:
        Dict with presigned_url and expires_in_seconds.
    """
    client = get_presigned_client()
    
    if expiry_seconds is None:
        expiry_seconds = settings.upload_presigned_url_expiry_seconds
    
    params: dict[str, Any] = {
        "Bucket": settings.s3_bucket_name,
        "Key": object_key,
    }
    
    if filename:
        disposition = "inline" if inline else "attachment"
        params["ResponseContentDisposition"] = f'{disposition}; filename="{filename}"'
    
    presigned_url = client.generate_presigned_url(
        "get_object",
        Params=params,
        ExpiresIn=expiry_seconds,
    )
    
    return {
        "presigned_url": presigned_url,
        "expires_in_seconds": expiry_seconds,
    }


def head_object(object_key: str) -> dict[str, Any] | None:
    """Check if object exists and get metadata.
    
    Args:
        object_key: S3 object key.
    
    Returns:
        Object metadata dict or None if not found.
    """
    client = get_s3_client()
    
    try:
        response = client.head_object(
            Bucket=settings.s3_bucket_name,
            Key=object_key,
        )
        return {
            "content_length": response.get("ContentLength"),
            "content_type": response.get("ContentType"),
            "etag": response.get("ETag"),
            "last_modified": response.get("LastModified"),
        }
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "")
        if error_code in ("404", "NoSuchKey"):
            return None
        raise


def delete_object(object_key: str) -> bool:
    """Delete an object from storage.
    
    Args:
        object_key: S3 object key.
    
    Returns:
        True if deleted (or didn't exist), False on error.
    """
    client = get_s3_client()
    
    try:
        client.delete_object(
            Bucket=settings.s3_bucket_name,
            Key=object_key,
        )
        logger.info(f"Deleted object: {object_key}")
        return True
    except ClientError as e:
        logger.error(f"Failed to delete object {object_key}: {e}")
        return False
