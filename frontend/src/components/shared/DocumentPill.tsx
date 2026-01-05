'use client';

/**
 * DocumentPill component for displaying document attachments.
 * 
 * Shows file icon, name, size, and download button in a compact pill.
 * Click pill body to preview, click download button to download.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, File, FileType, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { microcopy } from '@/lib/microcopy';
import type { AttachmentInfo } from '@/lib/types';

export interface DocumentPillProps {
    /** Document attachment to display */
    attachment: AttachmentInfo;
    /** Called when pill body is clicked (opens preview) */
    onPreview?: () => void;
    /** Called when download is triggered */
    onDownload?: () => void;
    /** Whether download is in progress */
    isDownloading?: boolean;
    /** Custom class name */
    className?: string;
}

/**
 * Get appropriate icon for file type based on MIME type
 */
function getFileIcon(mimeType: string | null) {
    if (!mimeType) return FileText;
    if (mimeType.includes('pdf')) return FileType;
    if (mimeType.includes('text')) return FileText;
    return File;
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number | null): string {
    if (bytes === null || bytes === undefined) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
}

export function DocumentPill({
    attachment,
    onPreview,
    onDownload,
    isDownloading = false,
    className,
}: DocumentPillProps) {
    const Icon = getFileIcon(attachment.mimeType);
    const extension = getFileExtension(attachment.displayName);

    return (
        <div
            className={cn(
                "flex items-center gap-3 p-3 rounded-lg border border-border bg-card",
                "hover:bg-muted/50 transition-colors",
                onPreview && "cursor-pointer",
                className
            )}
            role={onPreview ? "button" : undefined}
            tabIndex={onPreview ? 0 : undefined}
            onClick={onPreview}
            onKeyDown={(e) => {
                if (onPreview && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onPreview();
                }
            }}
        >
            {/* File type icon with extension badge */}
            <div className="relative shrink-0">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                {extension && (
                    <span className="absolute -bottom-1 -right-1 text-[9px] font-bold bg-primary text-primary-foreground px-1 rounded">
                        {extension}
                    </span>
                )}
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                    {attachment.displayName}
                </p>
                {attachment.sizeBytes && (
                    <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.sizeBytes)}
                    </p>
                )}
            </div>

            {/* Download button */}
            {onDownload && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDownload();
                    }}
                    disabled={isDownloading}
                    className="shrink-0 h-8 w-8"
                    aria-label={microcopy.attachments?.preview?.download || 'Download'}
                >
                    {isDownloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="h-4 w-4" />
                    )}
                </Button>
            )}
        </div>
    );
}
