"""Tests for upload API endpoints."""

import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient
from datetime import datetime, timezone, timedelta

from app.main import app
from app.config import settings


# Test user for authentication
TEST_USER_ID = "test-user-uploads-001"


class TestInitiateUpload:
    """Tests for POST /uploads/initiate."""

    @pytest.mark.asyncio
    async def test_initiate_upload_success(self, client: AsyncClient):
        """Test successful upload initiation."""
        with patch("app.application.uploads.upload_service.generate_presigned_put_url") as mock_put:
            mock_put.return_value = {
                "presigned_url": "http://minio:9000/test?sig=abc",
                "headers_to_include": {"Content-Type": "image/jpeg", "Content-Length": "1024"},
                "expires_in_seconds": 3600,
            }
            
            response = await client.post(
                "/api/v1/uploads/initiate",
                json={
                    "filename": "test-image.jpg",
                    "mimeType": "image/jpeg",
                    "sizeBytes": 1024,
                    "kind": "image",
                },
                headers={"X-Dev-User-Id": TEST_USER_ID},
            )
            
            assert response.status_code == 201
            data = response.json()
            assert "uploadId" in data
            assert "presignedPutUrl" in data
            assert "objectKey" in data
            assert data["status"] == "INITIATED"

    @pytest.mark.asyncio
    async def test_initiate_upload_file_too_large(self, client: AsyncClient):
        """Test rejection of oversized file."""
        too_large = settings.upload_max_size_bytes + 1
        
        response = await client.post(
            "/api/v1/uploads/initiate",
            json={
                "filename": "huge-file.jpg",
                "mimeType": "image/jpeg",
                "sizeBytes": too_large,
                "kind": "image",
            },
            headers={"X-Dev-User-Id": TEST_USER_ID},
        )
        
        assert response.status_code == 413
        data = response.json()
        assert data["detail"]["code"] == "FILE_TOO_LARGE"
        assert "maxSizeBytes" in data["detail"]["details"]

    @pytest.mark.asyncio
    async def test_initiate_upload_invalid_type(self, client: AsyncClient):
        """Test rejection of invalid MIME type."""
        response = await client.post(
            "/api/v1/uploads/initiate",
            json={
                "filename": "script.exe",
                "mimeType": "application/x-msdownload",
                "sizeBytes": 1024,
                "kind": "file",
            },
            headers={"X-Dev-User-Id": TEST_USER_ID},
        )
        
        assert response.status_code == 415
        data = response.json()
        assert data["detail"]["code"] == "INVALID_FILE_TYPE"
        assert "allowedTypes" in data["detail"]["details"]

    @pytest.mark.asyncio
    async def test_initiate_upload_invalid_kind(self, client: AsyncClient):
        """Test rejection of invalid kind value."""
        response = await client.post(
            "/api/v1/uploads/initiate",
            json={
                "filename": "test.jpg",
                "mimeType": "image/jpeg",
                "sizeBytes": 1024,
                "kind": "invalid",
            },
            headers={"X-Dev-User-Id": TEST_USER_ID},
        )
        
        assert response.status_code == 422  # Validation error


class TestCompleteUpload:
    """Tests for POST /uploads/complete."""

    @pytest.mark.asyncio
    async def test_complete_upload_success(self, client: AsyncClient):
        """Test successful upload completion."""
        with patch("app.application.uploads.upload_service.generate_presigned_put_url") as mock_put, \
             patch("app.application.uploads.upload_service.head_object") as mock_head:
            
            mock_put.return_value = {
                "presigned_url": "http://minio:9000/test?sig=abc",
                "headers_to_include": {"Content-Type": "application/pdf", "Content-Length": "2048"},
                "expires_in_seconds": 3600,
            }
            mock_head.return_value = {
                "content_length": 2048,
                "content_type": "application/pdf",
                "etag": '"test-etag"',
            }
            
            # First initiate
            init_response = await client.post(
                "/api/v1/uploads/initiate",
                json={
                    "filename": "test.pdf",
                    "mimeType": "application/pdf",
                    "sizeBytes": 2048,
                    "kind": "file",
                },
                headers={"X-Dev-User-Id": TEST_USER_ID},
            )
            assert init_response.status_code == 201
            upload_id = init_response.json()["uploadId"]
            
            # Create an item first to attach to
            item_response = await client.post(
                "/api/v1/items",
                json={"rawText": "Test item for attachment", "enrich": False},
                headers={"X-Dev-User-Id": TEST_USER_ID},
            )
            assert item_response.status_code == 201
            item_id = item_response.json()["id"]
            
            # Complete upload
            complete_response = await client.post(
                "/api/v1/uploads/complete",
                json={
                    "uploadId": upload_id,
                    "itemId": item_id,
                },
                headers={"X-Dev-User-Id": TEST_USER_ID},
            )
            
            assert complete_response.status_code == 200
            data = complete_response.json()
            assert data["upload"]["status"] == "COMPLETED"
            assert data["attachment"] is not None
            assert data["attachment"]["itemId"] == item_id

    @pytest.mark.asyncio
    async def test_complete_upload_not_found(self, client: AsyncClient):
        """Test completion of non-existent upload."""
        response = await client.post(
            "/api/v1/uploads/complete",
            json={
                "uploadId": "non-existent-id",
                "itemId": "some-item-id",
            },
            headers={"X-Dev-User-Id": TEST_USER_ID},
        )
        
        assert response.status_code == 404
        assert response.json()["detail"]["code"] == "UPLOAD_NOT_FOUND"


class TestGetUpload:
    """Tests for GET /uploads/{id}."""

    @pytest.mark.asyncio
    async def test_get_upload_success(self, client: AsyncClient):
        """Test getting upload status."""
        with patch("app.application.uploads.upload_service.generate_presigned_put_url") as mock_put:
            mock_put.return_value = {
                "presigned_url": "http://minio:9000/test?sig=abc",
                "headers_to_include": {"Content-Type": "image/png", "Content-Length": "512"},
                "expires_in_seconds": 3600,
            }
            
            # Initiate
            init_response = await client.post(
                "/api/v1/uploads/initiate",
                json={
                    "filename": "status-test.png",
                    "mimeType": "image/png",
                    "sizeBytes": 512,
                    "kind": "image",
                },
                headers={"X-Dev-User-Id": TEST_USER_ID},
            )
            upload_id = init_response.json()["uploadId"]
            
            # Get status
            response = await client.get(
                f"/api/v1/uploads/{upload_id}",
                headers={"X-Dev-User-Id": TEST_USER_ID},
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == upload_id
            assert data["status"] == "INITIATED"
            assert data["filename"] == "status-test.png"


class TestDeleteUpload:
    """Tests for DELETE /uploads/{id}."""

    @pytest.mark.asyncio
    async def test_delete_upload_success(self, client: AsyncClient):
        """Test soft deleting an upload."""
        with patch("app.application.uploads.upload_service.generate_presigned_put_url") as mock_put:
            mock_put.return_value = {
                "presigned_url": "http://minio:9000/test?sig=abc",
                "headers_to_include": {"Content-Type": "text/plain", "Content-Length": "100"},
                "expires_in_seconds": 3600,
            }
            
            # Initiate
            init_response = await client.post(
                "/api/v1/uploads/initiate",
                json={
                    "filename": "delete-test.txt",
                    "mimeType": "text/plain",
                    "sizeBytes": 100,
                    "kind": "file",
                },
                headers={"X-Dev-User-Id": TEST_USER_ID},
            )
            upload_id = init_response.json()["uploadId"]
            
            # Delete
            response = await client.delete(
                f"/api/v1/uploads/{upload_id}",
                headers={"X-Dev-User-Id": TEST_USER_ID},
            )
            
            assert response.status_code == 204
            
            # Verify deleted
            get_response = await client.get(
                f"/api/v1/uploads/{upload_id}",
                headers={"X-Dev-User-Id": TEST_USER_ID},
            )
            assert get_response.status_code == 404


class TestDownloadUrl:
    """Tests for GET /attachments/{id}/download_url."""

    @pytest.mark.asyncio
    async def test_download_url_success(self, client: AsyncClient):
        """Test getting download URL for attachment."""
        with patch("app.application.uploads.upload_service.generate_presigned_put_url") as mock_put, \
             patch("app.application.uploads.upload_service.head_object") as mock_head, \
             patch("app.application.uploads.upload_service.generate_presigned_get_url") as mock_get:
            
            mock_put.return_value = {
                "presigned_url": "http://minio:9000/test?sig=abc",
                "headers_to_include": {"Content-Type": "application/pdf", "Content-Length": "4096"},
                "expires_in_seconds": 3600,
            }
            mock_head.return_value = {
                "content_length": 4096,
                "content_type": "application/pdf",
                "etag": '"test-etag"',
            }
            mock_get.return_value = {
                "presigned_url": "http://minio:9000/test?sig=download",
                "expires_in_seconds": 3600,
            }
            
            # Initiate
            init_response = await client.post(
                "/api/v1/uploads/initiate",
                json={
                    "filename": "download-test.pdf",
                    "mimeType": "application/pdf",
                    "sizeBytes": 4096,
                    "kind": "file",
                },
                headers={"X-Dev-User-Id": TEST_USER_ID},
            )
            upload_id = init_response.json()["uploadId"]
            
            # Create item
            item_response = await client.post(
                "/api/v1/items",
                json={"rawText": "Item for download test", "enrich": False},
                headers={"X-Dev-User-Id": TEST_USER_ID},
            )
            item_id = item_response.json()["id"]
            
            # Complete
            complete_response = await client.post(
                "/api/v1/uploads/complete",
                json={"uploadId": upload_id, "itemId": item_id},
                headers={"X-Dev-User-Id": TEST_USER_ID},
            )
            assert complete_response.status_code == 200
            attachment_id = complete_response.json()["attachment"]["id"]
            
            # Get download URL
            response = await client.get(
                f"/api/v1/attachments/{attachment_id}/download_url",
                headers={"X-Dev-User-Id": TEST_USER_ID},
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "downloadUrl" in data
            assert "expiresAt" in data
            assert data["filename"] == "download-test.pdf"


class TestListAttachments:
    """Tests for GET /items/{id}/attachments."""

    @pytest.mark.asyncio
    async def test_list_attachments_success(self, client: AsyncClient):
        """Test listing attachments for an item."""
        with patch("app.application.uploads.upload_service.generate_presigned_put_url") as mock_put, \
             patch("app.application.uploads.upload_service.head_object") as mock_head:
            
            mock_put.return_value = {
                "presigned_url": "http://minio:9000/test?sig=abc",
                "headers_to_include": {"Content-Type": "application/pdf", "Content-Length": "1024"},
                "expires_in_seconds": 3600,
            }
            mock_head.return_value = {
                "content_length": 1024,
                "content_type": "application/pdf",
                "etag": '"test-etag"',
            }
            
            # Create item
            item_response = await client.post(
                "/api/v1/items",
                json={"rawText": "Item with attachments", "enrich": False},
                headers={"X-Dev-User-Id": TEST_USER_ID},
            )
            item_id = item_response.json()["id"]
            
            # Upload and attach two files
            for fname in ["file1.pdf", "file2.pdf"]:
                init = await client.post(
                    "/api/v1/uploads/initiate",
                    json={"filename": fname, "mimeType": "application/pdf", "sizeBytes": 1024, "kind": "file"},
                    headers={"X-Dev-User-Id": TEST_USER_ID},
                )
                upload_id = init.json()["uploadId"]
                
                await client.post(
                    "/api/v1/uploads/complete",
                    json={"uploadId": upload_id, "itemId": item_id},
                    headers={"X-Dev-User-Id": TEST_USER_ID},
                )
            
            # List attachments
            response = await client.get(
                f"/api/v1/items/{item_id}/attachments",
                headers={"X-Dev-User-Id": TEST_USER_ID},
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 2
            assert len(data["attachments"]) == 2
