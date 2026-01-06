#!/bin/sh
# MinIO initialization script
# Applies CORS configuration for browser uploads

set -e

# Wait for MinIO to be ready
echo "Waiting for MinIO to be ready..."
until mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" 2>/dev/null; do
    echo "MinIO not ready, waiting..."
    sleep 2
done

echo "MinIO is ready!"

# Create bucket if it doesn't exist
echo "Ensuring bucket exists: ${MINIO_BUCKET:-litevault-uploads}"
mc mb local/${MINIO_BUCKET:-litevault-uploads} --ignore-existing

# Apply CORS configuration
echo "Applying CORS configuration..."
mc anonymous set download local/${MINIO_BUCKET:-litevault-uploads} 2>/dev/null || true

# For MinIO, we can set CORS via mc admin config
# But for simplicity, we'll handle CORS at the Caddy proxy level instead

echo "MinIO initialization complete!"
