# MinIO Docker Setup

> Local development configuration for S3-compatible object storage
> For production, use AWS S3 or compatible cloud provider

---

## 1. Overview

MinIO provides S3-compatible object storage for local development. This document covers:
- Docker Compose configuration
- Bucket initialization
- Environment variables
- Production migration path

---

## 2. Docker Compose Service

Add to your local development docker-compose file:

```yaml
# docker-compose.dev.yml (or docker-compose.host-caddy.yml for local)

services:
  # ... existing services ...

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    restart: unless-stopped
    ports:
      - "9000:9000"    # S3 API
      - "9001:9001"    # Web Console
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Bucket initialization (runs once)
  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set myminio http://minio:9000 minioadmin minioadmin;
      mc mb --ignore-existing myminio/litevault-uploads;
      mc anonymous set none myminio/litevault-uploads;
      echo 'Bucket initialized';
      exit 0;
      "

volumes:
  # ... existing volumes ...
  minio_data:
```

---

## 3. Bucket Initialization

### Option A: Init Container (Recommended)

The `minio-init` service above runs the MinIO client (`mc`) to:
1. Create alias for local MinIO
2. Create bucket if not exists
3. Set bucket policy to private (no anonymous access)

### Option B: Backend Bootstrap

Add to backend startup (fast for dev, not for prod):

```python
# backend/app/infrastructure/storage/s3_client.py

import boto3
from botocore.exceptions import ClientError
from app.config import settings

def ensure_bucket_exists():
    """Create bucket if it doesn't exist (dev only)."""
    if settings.env != "development":
        return  # Don't auto-create in production
    
    client = boto3.client(
        's3',
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        use_ssl=settings.s3_use_ssl,
    )
    
    try:
        client.head_bucket(Bucket=settings.s3_bucket_name)
    except ClientError:
        client.create_bucket(Bucket=settings.s3_bucket_name)
        print(f"Created bucket: {settings.s3_bucket_name}")
```

---

## 4. Environment Variables

### Local Development (.env.local)

```bash
# MinIO / S3 Configuration
S3_ENDPOINT_URL=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_NAME=litevault-uploads
S3_REGION=us-east-1
S3_USE_SSL=false

# Upload limits
UPLOAD_MAX_SIZE_BYTES=10485760
UPLOAD_PRESIGNED_EXPIRY=3600

# MinIO credentials (for docker-compose)
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
```

### Production (.env)

```bash
# AWS S3 or S3-compatible provider
S3_ENDPOINT_URL=https://s3.us-east-1.amazonaws.com
S3_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
S3_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET_NAME=litevault-uploads-prod
S3_REGION=us-east-1
S3_USE_SSL=true

# Upload limits (can be higher in prod)
UPLOAD_MAX_SIZE_BYTES=52428800
UPLOAD_PRESIGNED_EXPIRY=3600
```

---

## 5. Backend Configuration

### Settings Class

```python
# backend/app/config.py

class Settings(BaseSettings):
    # ... existing settings ...
    
    # Object Storage
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_bucket_name: str = "litevault-uploads"
    s3_region: str = "us-east-1"
    s3_use_ssl: bool = False
    
    # Upload limits
    upload_max_size_bytes: int = 10 * 1024 * 1024  # 10 MB
    upload_allowed_types: list[str] = [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf", "text/plain", "text/markdown"
    ]
    upload_presigned_url_expiry_seconds: int = 3600
```

### S3 Client Factory

```python
# backend/app/infrastructure/storage/s3_client.py

import boto3
from functools import lru_cache
from app.config import settings

@lru_cache()
def get_s3_client():
    """Get configured S3 client."""
    return boto3.client(
        's3',
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        use_ssl=settings.s3_use_ssl,
        config=boto3.session.Config(
            signature_version='s3v4',
            s3={'addressing_style': 'path'}  # Required for MinIO
        )
    )
```

---

## 6. CORS Configuration

MinIO requires CORS for browser uploads via presigned URLs.

### Via MinIO Console (UI)

1. Open http://localhost:9001
2. Login with MINIO_ROOT_USER/PASSWORD
3. Go to Buckets → litevault-uploads → Access Rules
4. Add CORS rule

### Via mc Client

```bash
# Create cors.json
cat > cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
      "AllowedMethods": ["GET", "PUT", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

# Apply to bucket
mc anonymous set-json cors.json myminio/litevault-uploads
```

### Backend CORS Alternative

If MinIO CORS is problematic, consider proxy pattern:
- POST upload bytes to `/api/v1/uploads/stream` (not presigned)
- Backend uploads to S3
- Trades latency for simpler CORS

**V1 Decision:** Use presigned URLs with MinIO CORS. Simpler and standard.

---

## 7. MinIO Web Console

Access at: http://localhost:9001

**Credentials:**
- Username: minioadmin
- Password: minioadmin

**Features:**
- Browse buckets and objects
- View/download files
- Manage access policies
- Monitor usage

---

## 8. Production Migration

### AWS S3

1. Create S3 bucket in AWS console
2. Create IAM user with S3 permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:HeadObject"
         ],
         "Resource": "arn:aws:s3:::litevault-uploads-prod/*"
       }
     ]
   }
   ```
3. Update .env with AWS credentials
4. Set `S3_USE_SSL=true`
5. Remove `minio` service from docker-compose.vps.yml

### Other S3-Compatible Providers

- **Cloudflare R2:** Free egress, S3 compatible
- **DigitalOcean Spaces:** Simple setup, good pricing
- **Backblaze B2:** Cheap storage, S3 compatible

All use the same S3 API, just change endpoint URL.

---

## 9. Troubleshooting

### Connection Refused

```
botocore.exceptions.EndpointConnectionError
```

**Fix:** Ensure MinIO is running:
```bash
docker compose logs minio
```

### Access Denied

```
botocore.exceptions.ClientError: Access Denied
```

**Fix:** Check credentials match .env and MinIO config.

### Presigned URL Fails

```
SignatureDoesNotMatch
```

**Fix:** Ensure correct region and signature version:
```python
config=boto3.session.Config(signature_version='s3v4')
```

### CORS Error in Browser

```
No 'Access-Control-Allow-Origin' header
```

**Fix:** Configure CORS on MinIO bucket (see section 6).

---

## 10. Local Development Workflow

```bash
# Start all services including MinIO
docker compose -f docker-compose.dev.yml up -d

# Check MinIO is healthy
docker compose -f docker-compose.dev.yml ps minio

# View MinIO logs
docker compose -f docker-compose.dev.yml logs minio

# Access console
open http://localhost:9001

# Run backend (connects to MinIO)
cd backend && uv run uvicorn app.main:app --reload
```
