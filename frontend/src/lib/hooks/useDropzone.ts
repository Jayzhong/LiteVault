/**
 * useDropzone hook for drag-and-drop file uploads.
 * 
 * Provides invisible dropzone management with visual feedback on drag over.
 */

import { useState, useCallback, DragEvent } from 'react';
import { toast } from 'sonner';
import { validateFile, ALLOWED_MIME_TYPES } from '@/lib/api/uploads';
import { microcopy } from '@/lib/microcopy';

export interface UseDropzoneOptions {
    onFilesAccepted: (files: File[]) => void;
    disabled?: boolean;
}

export interface UseDropzoneResult {
    isDragActive: boolean;
    getRootProps: () => {
        onDragEnter: (e: DragEvent) => void;
        onDragOver: (e: DragEvent) => void;
        onDragLeave: (e: DragEvent) => void;
        onDrop: (e: DragEvent) => void;
    };
}

export function useDropzone({
    onFilesAccepted,
    disabled = false,
}: UseDropzoneOptions): UseDropzoneResult {
    const [isDragActive, setIsDragActive] = useState(false);
    const [dragCounter, setDragCounter] = useState(0);

    const handleDragEnter = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;

        setDragCounter(prev => prev + 1);

        // Check if files are being dragged
        if (e.dataTransfer?.items?.length > 0) {
            setIsDragActive(true);
        }
    }, [disabled]);

    const handleDragOver = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;

        // Required to allow drop
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
        }
    }, [disabled]);

    const handleDragLeave = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;

        setDragCounter(prev => {
            const newCount = prev - 1;
            if (newCount === 0) {
                setIsDragActive(false);
            }
            return newCount;
        });
    }, [disabled]);

    const handleDrop = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsDragActive(false);
        setDragCounter(0);

        if (disabled) return;

        const droppedFiles = e.dataTransfer?.files;
        if (!droppedFiles || droppedFiles.length === 0) return;

        const acceptedFiles: File[] = [];
        const rejectedTypes: string[] = [];

        Array.from(droppedFiles).forEach(file => {
            const validation = validateFile(file);
            if (validation.valid) {
                acceptedFiles.push(file);
            } else {
                rejectedTypes.push(file.type || 'unknown');
            }
        });

        if (rejectedTypes.length > 0) {
            toast.error(microcopy.upload?.dropzone?.reject || 'Some files were not supported');
        }

        if (acceptedFiles.length > 0) {
            onFilesAccepted(acceptedFiles);
        }
    }, [disabled, onFilesAccepted]);

    const getRootProps = useCallback(() => ({
        onDragEnter: handleDragEnter,
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
    }), [handleDragEnter, handleDragOver, handleDragLeave, handleDrop]);

    return {
        isDragActive,
        getRootProps,
    };
}
