/**
 * useClipboardPaste hook for handling image paste from clipboard.
 * 
 * Detects when user pastes an image (e.g., screenshot) and extracts it as a File.
 * Does NOT block normal text paste behavior.
 */

import { useCallback, ClipboardEvent } from 'react';
import { toast } from 'sonner';
import { validateFile } from '@/lib/api/uploads';
import { microcopy } from '@/lib/microcopy';

export interface UseClipboardPasteOptions {
    onFilePasted: (file: File) => void;
    disabled?: boolean;
}

export interface UseClipboardPasteResult {
    handlePaste: (e: ClipboardEvent) => void;
}

export function useClipboardPaste({
    onFilePasted,
    disabled = false,
}: UseClipboardPasteOptions): UseClipboardPasteResult {

    const handlePaste = useCallback((e: ClipboardEvent) => {
        if (disabled) return;

        const items = e.clipboardData?.items;
        if (!items) return;

        // Look for image files in clipboard
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            // Check if item is a file (image)
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    // Validate the file
                    const validation = validateFile(file);
                    if (validation.valid) {
                        // Prevent default paste behavior for images
                        e.preventDefault();

                        // Generate a meaningful filename for screenshots
                        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
                        const extension = file.type.split('/')[1] || 'png';
                        const namedFile = new File(
                            [file],
                            `screenshot_${timestamp}.${extension}`,
                            { type: file.type }
                        );

                        onFilePasted(namedFile);
                        toast.success(microcopy.upload?.paste?.added || 'Image added from clipboard');
                        return; // Only handle first image
                    } else {
                        toast.error(validation.error || 'File not supported');
                        return;
                    }
                }
            }
        }

        // If no image file found, let the default paste (text) proceed
        // by not calling e.preventDefault()
    }, [disabled, onFilePasted]);

    return {
        handlePaste,
    };
}
