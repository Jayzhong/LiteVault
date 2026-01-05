/**
 * Staged file type for tracking uploads during the capture flow.
 */

export interface StagedFile {
    /** Client-side unique ID */
    id: string;
    /** The actual File object */
    file: File;
    /** Blob URL for optimistic preview */
    previewUrl: string;
    /** Current upload status */
    status: 'staged' | 'uploading' | 'success' | 'failed';
    /** Upload progress 0-100 */
    progress: number;
    /** Backend attachment ID after successful upload */
    attachmentId?: string;
    /** Error message on failure */
    error?: string;
}

/**
 * Create a new StagedFile from a File with Blob URL preview.
 */
export function createStagedFile(file: File): StagedFile {
    return {
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'staged',
        progress: 0,
    };
}

/**
 * Revoke the Blob URL to free memory.
 */
export function revokeStagedFile(stagedFile: StagedFile): void {
    URL.revokeObjectURL(stagedFile.previewUrl);
}
