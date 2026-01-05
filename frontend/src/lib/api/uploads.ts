/**
 * Upload API types and client functions.
 */

// Upload types
export interface InitiateUploadRequest {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    kind: 'image' | 'file';
    itemId?: string;
    idempotencyKey?: string;
}

export interface InitiateUploadResponse {
    uploadId: string;
    objectKey: string;
    presignedPutUrl: string;
    headersToInclude: Record<string, string>;
    expiresAt: string;
    status: string;
}

export interface CompleteUploadRequest {
    uploadId: string;
    itemId: string;
    etag?: string;
}

export interface UploadInfo {
    id: string;
    objectKey: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    kind: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
}

export interface AttachmentInfo {
    id: string;
    uploadId: string;
    itemId: string | null;
    displayName: string;
    kind: string;
    createdAt: string | null;
}

export interface CompleteUploadResponse {
    upload: UploadInfo;
    attachment: AttachmentInfo | null;
}

export interface DownloadUrlResponse {
    downloadUrl: string;
    expiresAt: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
}

export interface AttachmentListItem {
    id: string;
    uploadId: string;
    displayName: string;
    mimeType: string | null;
    sizeBytes: number | null;
    kind: string;
    createdAt: string;
}

export interface AttachmentListResponse {
    attachments: AttachmentListItem[];
    total: number;
}

// Upload error types
export class UploadError extends Error {
    code: string;
    details?: Record<string, unknown>;

    constructor(code: string, message: string, details?: Record<string, unknown>) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'UploadError';
    }
}

// Helper: determine kind from MIME type
export function getFileKind(mimeType: string): 'image' | 'file' {
    return mimeType.startsWith('image/') ? 'image' : 'file';
}

// Constants
export const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/markdown',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Validation
export function validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB limit`,
        };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: `File type ${file.type || 'unknown'} is not supported`,
        };
    }

    return { valid: true };
}
