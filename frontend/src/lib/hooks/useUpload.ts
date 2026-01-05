/**
 * useUpload hook for file upload workflow.
 * 
 * Handles: initiate → PUT to presigned URL → complete
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { isUsingRealApi, getAuthHeaders, API_BASE_URL } from '@/lib/api/client';
import {
    InitiateUploadResponse,
    CompleteUploadResponse,
    AttachmentListItem,
    DownloadUrlResponse,
    getFileKind,
    validateFile,
    UploadError,
} from '@/lib/api/uploads';

export type UploadStatus = 'idle' | 'initiating' | 'uploading' | 'completing' | 'success' | 'error';

export interface UploadProgress {
    file: File;
    status: UploadStatus;
    progress: number; // 0-100
    uploadId?: string;
    attachmentId?: string;
    error?: string;
}

export interface UseUploadResult {
    uploads: UploadProgress[];
    isUploading: boolean;
    uploadFile: (file: File, itemId: string) => Promise<CompleteUploadResponse | null>;
    uploadFiles: (files: File[], itemId: string) => Promise<CompleteUploadResponse[]>;
    getDownloadUrl: (attachmentId: string) => Promise<DownloadUrlResponse | null>;
    listAttachments: (itemId: string) => Promise<AttachmentListItem[]>;
    deleteAttachment: (attachmentId: string) => Promise<boolean>;
    clearUploads: () => void;
}

export function useUpload(): UseUploadResult {
    const [uploads, setUploads] = useState<UploadProgress[]>([]);

    const updateUpload = useCallback((file: File, update: Partial<UploadProgress>) => {
        setUploads(prev =>
            prev.map(u =>
                u.file === file ? { ...u, ...update } : u
            )
        );
    }, []);

    const uploadFile = useCallback(async (
        file: File,
        itemId: string
    ): Promise<CompleteUploadResponse | null> => {
        // Validate
        const validation = validateFile(file);
        if (!validation.valid) {
            toast.error(validation.error);
            return null;
        }

        // Add to uploads list
        const initialProgress: UploadProgress = {
            file,
            status: 'initiating',
            progress: 0,
        };
        setUploads(prev => [...prev, initialProgress]);

        if (!isUsingRealApi) {
            // Mock mode - simulate upload
            await new Promise(r => setTimeout(r, 500));
            updateUpload(file, { status: 'success', progress: 100 });
            toast.success('File uploaded (mock)');
            return null;
        }

        try {
            // Get auth headers for API calls
            const authHeaders = await getAuthHeaders();

            // Step 1: Initiate upload
            const initResponse = await fetch(`${API_BASE_URL}/api/v1/uploads/initiate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders,
                },
                body: JSON.stringify({
                    filename: file.name,
                    mimeType: file.type,
                    sizeBytes: file.size,
                    kind: getFileKind(file.type),
                }),
            });

            if (!initResponse.ok) {
                const error = await initResponse.json();
                throw new UploadError(
                    error.detail?.code || 'INIT_FAILED',
                    error.detail?.message || 'Failed to initiate upload',
                    error.detail?.details
                );
            }

            const initData: InitiateUploadResponse = await initResponse.json();
            updateUpload(file, {
                status: 'uploading',
                progress: 10,
                uploadId: initData.uploadId,
            });

            // Step 2: PUT file to presigned URL
            const putResponse = await fetch(initData.presignedPutUrl, {
                method: 'PUT',
                headers: initData.headersToInclude,
                body: file,
            });

            if (!putResponse.ok) {
                throw new UploadError('PUT_FAILED', 'Failed to upload file to storage');
            }

            const etag = putResponse.headers.get('ETag');
            updateUpload(file, { status: 'completing', progress: 80 });

            // Step 3: Complete upload
            const completeResponse = await fetch(`${API_BASE_URL}/api/v1/uploads/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders,
                },
                body: JSON.stringify({
                    uploadId: initData.uploadId,
                    itemId,
                    etag: etag || undefined,
                }),
            });

            if (!completeResponse.ok) {
                const error = await completeResponse.json();
                throw new UploadError(
                    error.detail?.code || 'COMPLETE_FAILED',
                    error.detail?.message || 'Failed to complete upload'
                );
            }

            const completeData: CompleteUploadResponse = await completeResponse.json();
            updateUpload(file, {
                status: 'success',
                progress: 100,
                attachmentId: completeData.attachment?.id,
            });

            return completeData;

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Upload failed';
            updateUpload(file, { status: 'error', error: message });
            toast.error(message);
            return null;
        }
    }, [updateUpload]);

    const uploadFiles = useCallback(async (
        files: File[],
        itemId: string
    ): Promise<CompleteUploadResponse[]> => {
        const results: CompleteUploadResponse[] = [];

        for (const file of files) {
            const result = await uploadFile(file, itemId);
            if (result) {
                results.push(result);
            }
        }

        return results;
    }, [uploadFile]);

    const getDownloadUrl = useCallback(async (
        attachmentId: string
    ): Promise<DownloadUrlResponse | null> => {
        if (!isUsingRealApi) return null;

        try {
            const authHeaders = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/api/v1/attachments/${attachmentId}/download_url`, {
                headers: authHeaders,
            });
            if (!response.ok) {
                throw new Error('Failed to get download URL');
            }
            return await response.json();
        } catch (err) {
            toast.error('Failed to get download link');
            return null;
        }
    }, []);

    const listAttachments = useCallback(async (
        itemId: string
    ): Promise<AttachmentListItem[]> => {
        if (!isUsingRealApi) return [];

        try {
            const authHeaders = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/api/v1/items/${itemId}/attachments`, {
                headers: authHeaders,
            });
            if (!response.ok) {
                throw new Error('Failed to list attachments');
            }
            const data = await response.json();
            return data.attachments;
        } catch (err) {
            console.error('Failed to list attachments:', err);
            return [];
        }
    }, []);

    const deleteAttachment = useCallback(async (
        attachmentId: string
    ): Promise<boolean> => {
        if (!isUsingRealApi) return true;

        try {
            const authHeaders = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/api/v1/attachments/${attachmentId}`, {
                method: 'DELETE',
                headers: authHeaders,
            });
            if (!response.ok) {
                throw new Error('Failed to delete attachment');
            }
            toast.success('Attachment deleted');
            return true;
        } catch (err) {
            toast.error('Failed to delete attachment');
            return false;
        }
    }, []);

    const clearUploads = useCallback(() => {
        setUploads([]);
    }, []);

    return {
        uploads,
        isUploading: uploads.some(u =>
            u.status === 'initiating' || u.status === 'uploading' || u.status === 'completing'
        ),
        uploadFile,
        uploadFiles,
        getDownloadUrl,
        listAttachments,
        deleteAttachment,
        clearUploads,
    };
}

