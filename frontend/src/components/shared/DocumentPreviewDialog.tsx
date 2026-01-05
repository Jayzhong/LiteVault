'use client';

/**
 * DocumentPreviewDialog component for previewing documents.
 * 
 * PDF: Embeds in iframe
 * Other: Shows fallback with download option
 */

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, AlertCircle } from 'lucide-react';
import { microcopy } from '@/lib/microcopy';
import type { AttachmentInfo } from '@/lib/types';

export interface DocumentPreviewDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Called when the dialog should close */
    onClose: () => void;
    /** Document attachment to preview */
    attachment: AttachmentInfo | null;
    /** Download URL for the document */
    downloadUrl: string | null;
    /** Whether the URL is loading */
    isLoading?: boolean;
    /** Error message if loading failed */
    error?: string | null;
    /** Called when download is triggered */
    onDownload?: () => void;
}

/**
 * Check if a MIME type is a PDF
 */
function isPdf(mimeType: string | null): boolean {
    return mimeType?.includes('pdf') ?? false;
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

export function DocumentPreviewDialog({
    isOpen,
    onClose,
    attachment,
    downloadUrl,
    isLoading = false,
    error = null,
    onDownload,
}: DocumentPreviewDialogProps) {
    if (!attachment) return null;

    const canPreview = isPdf(attachment.mimeType);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] max-w-[95vw] min-w-[400px] min-h-[400px] h-[95vh] flex flex-col p-0 gap-0 resize overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b shrink-0 pr-14">
                    <div className="flex items-center justify-between gap-4">
                        <DialogTitle className="text-lg font-medium truncate">
                            {attachment.displayName}
                        </DialogTitle>
                        {onDownload && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onDownload}
                                className="gap-2 shrink-0"
                            >
                                <Download className="h-4 w-4" />
                                {microcopy.attachments?.preview?.download || 'Download'}
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                {/* Content area */}
                <div className="flex-1 overflow-hidden">
                    {/* Loading state */}
                    {isLoading && (
                        <div className="flex items-center justify-center h-full">
                            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {/* Error state */}
                    {!isLoading && error && (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-destructive p-8">
                            <AlertCircle className="h-12 w-12" />
                            <p className="text-lg font-medium">
                                {microcopy.attachments?.error?.loadFailed || 'Failed to load preview'}
                            </p>
                            <p className="text-sm text-muted-foreground">{error}</p>
                        </div>
                    )}

                    {/* PDF Preview */}
                    {!isLoading && !error && canPreview && downloadUrl && (
                        <iframe
                            src={downloadUrl}
                            title={attachment.displayName}
                            className="w-full h-full border-0"
                        />
                    )}

                    {/* Fallback for non-previewable files */}
                    {!isLoading && !error && !canPreview && (
                        <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
                            <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center">
                                <FileText className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-lg font-medium">
                                    {microcopy.attachments?.preview?.noPreview || 'Preview not available'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {attachment.displayName}
                                    {attachment.sizeBytes && ` • ${formatFileSize(attachment.sizeBytes)}`}
                                </p>
                            </div>
                            {onDownload && (
                                <Button onClick={onDownload} className="gap-2">
                                    <Download className="h-4 w-4" />
                                    {microcopy.attachments?.preview?.download || 'Download'}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
