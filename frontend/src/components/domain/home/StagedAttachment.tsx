'use client';

/**
 * StagedAttachment component for displaying a single staged file
 * with upload status overlay and remove/retry actions.
 */

import { X, RotateCw, Loader2, Check, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StagedFile } from '@/lib/types/stagedFile';
import { microcopy } from '@/lib/microcopy';

export interface StagedAttachmentProps {
    stagedFile: StagedFile;
    onRemove: () => void;
    onRetry?: () => void;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function StagedAttachment({
    stagedFile,
    onRemove,
    onRetry,
}: StagedAttachmentProps) {
    const { file, previewUrl, status, error } = stagedFile;
    const isImage = file.type.startsWith('image/');
    const isUploading = status === 'uploading';
    const isSuccess = status === 'success';
    const isFailed = status === 'failed';

    return (
        <div className="relative flex-shrink-0 group">
            {/* Main thumbnail container */}
            <div
                className={cn(
                    "w-16 h-16 rounded-lg border overflow-hidden bg-muted",
                    "flex items-center justify-center",
                    isFailed && "border-destructive/50"
                )}
            >
                {isImage ? (
                    <img
                        src={previewUrl}
                        alt={file.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center p-2">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                        <span className="text-[8px] text-muted-foreground truncate w-full text-center mt-1">
                            {file.name.slice(-8)}
                        </span>
                    </div>
                )}

                {/* Status overlay */}
                {isUploading && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-lg">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                )}

                {isSuccess && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center rounded-lg animate-in fade-in duration-200">
                        <Check className="h-5 w-5 text-primary" />
                    </div>
                )}

                {isFailed && (
                    <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center rounded-lg">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                    </div>
                )}
            </div>

            {/* Remove button (top-right) */}
            <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={onRemove}
                className={cn(
                    "absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full",
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                    "bg-background border shadow-sm hover:bg-destructive hover:text-white"
                )}
            >
                <X className="h-3 w-3" />
            </Button>

            {/* Retry button (bottom center, only on failure) */}
            {isFailed && onRetry && (
                <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={onRetry}
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-5 px-2 text-[10px] gap-0.5"
                >
                    <RotateCw className="h-2.5 w-2.5" />
                    {microcopy.upload?.action?.retry || 'Retry'}
                </Button>
            )}

            {/* Error tooltip on hover */}
            {isFailed && error && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-destructive bg-background px-2 py-1 rounded shadow-sm border opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {error}
                </div>
            )}
        </div>
    );
}
