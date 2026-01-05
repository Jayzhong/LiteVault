'use client';

/**
 * AttachmentPreview component for showing upload progress and previews.
 */

import { useState } from 'react';
import { X, FileText, Image as ImageIcon, Download, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { UploadProgress } from '@/lib/hooks/useUpload';
import type { AttachmentListItem } from '@/lib/api/uploads';

// Format bytes to human readable
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Get icon based on file type
function getFileIcon(mimeType: string | null) {
    if (!mimeType) return <FileText className="h-5 w-5" />;
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
}

export interface UploadPreviewProps {
    upload: UploadProgress;
    onRemove?: () => void;
}

export function UploadPreview({ upload, onRemove }: UploadPreviewProps) {
    const isComplete = upload.status === 'success';
    const isError = upload.status === 'error';
    const isUploading = ['initiating', 'uploading', 'completing'].includes(upload.status);

    return (
        <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg border bg-card",
            isError && "border-destructive/50 bg-destructive/5"
        )}>
            {/* Icon */}
            <div className="flex-shrink-0 text-muted-foreground">
                {getFileIcon(upload.file.type)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{upload.file.name}</p>
                <p className="text-xs text-muted-foreground">
                    {formatBytes(upload.file.size)}
                    {isError && upload.error && (
                        <span className="text-destructive ml-2">{upload.error}</span>
                    )}
                </p>
                {isUploading && (
                    <Progress value={upload.progress} className="h-1 mt-1" />
                )}
            </div>

            {/* Status/Actions */}
            <div className="flex-shrink-0">
                {isUploading && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {(isComplete || isError) && onRemove && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={onRemove}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}

export interface AttachmentItemProps {
    attachment: AttachmentListItem;
    onDownload?: () => void;
    onDelete?: () => void;
    isDeleting?: boolean;
}

export function AttachmentItem({
    attachment,
    onDownload,
    onDelete,
    isDeleting = false,
}: AttachmentItemProps) {
    return (
        <div className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            {/* Icon */}
            <div className="flex-shrink-0 text-muted-foreground">
                {getFileIcon(attachment.mimeType)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachment.displayName}</p>
                {attachment.sizeBytes && (
                    <p className="text-xs text-muted-foreground">
                        {formatBytes(attachment.sizeBytes)}
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex items-center gap-1">
                {onDownload && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={onDownload}
                        title="Download"
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                )}
                {onDelete && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={onDelete}
                        disabled={isDeleting}
                        title="Delete"
                    >
                        {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}

export interface AttachmentsListProps {
    attachments: AttachmentListItem[];
    onDownload?: (id: string) => void;
    onDelete?: (id: string) => void;
    deletingIds?: Set<string>;
    className?: string;
}

export function AttachmentsList({
    attachments,
    onDownload,
    onDelete,
    deletingIds = new Set(),
    className,
}: AttachmentsListProps) {
    if (attachments.length === 0) {
        return (
            <div className={cn("text-sm text-muted-foreground py-2", className)}>
                No attachments
            </div>
        );
    }

    return (
        <div className={cn("space-y-2", className)}>
            {attachments.map(attachment => (
                <AttachmentItem
                    key={attachment.id}
                    attachment={attachment}
                    onDownload={onDownload ? () => onDownload(attachment.id) : undefined}
                    onDelete={onDelete ? () => onDelete(attachment.id) : undefined}
                    isDeleting={deletingIds.has(attachment.id)}
                />
            ))}
        </div>
    );
}
