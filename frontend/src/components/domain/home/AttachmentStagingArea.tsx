'use client';

/**
 * AttachmentStagingArea component for displaying staged files
 * in a horizontal scrollable container under the textarea.
 */

import { cn } from '@/lib/utils';
import { StagedAttachment } from './StagedAttachment';
import type { StagedFile } from '@/lib/types/stagedFile';

export interface AttachmentStagingAreaProps {
    stagedFiles: StagedFile[];
    onRemove: (id: string) => void;
    onRetry?: (id: string) => void;
    className?: string;
}

export function AttachmentStagingArea({
    stagedFiles,
    onRemove,
    onRetry,
    className,
}: AttachmentStagingAreaProps) {
    // Don't render if no staged files
    if (stagedFiles.length === 0) {
        return null;
    }

    return (
        <div
            className={cn(
                "flex gap-3 items-center overflow-x-auto py-2 px-1",
                "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
                className
            )}
        >
            {stagedFiles.map(stagedFile => (
                <StagedAttachment
                    key={stagedFile.id}
                    stagedFile={stagedFile}
                    onRemove={() => onRemove(stagedFile.id)}
                    onRetry={onRetry ? () => onRetry(stagedFile.id) : undefined}
                />
            ))}
        </div>
    );
}
