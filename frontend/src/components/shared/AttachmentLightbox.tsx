'use client';

/**
 * AttachmentLightbox component for fullscreen image viewing.
 * 
 * Features:
 * - Previous/Next navigation
 * - ESC to close
 * - Click backdrop to close
 */

import { useCallback, useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { microcopy } from '@/lib/microcopy';
import type { AttachmentInfo } from '@/lib/types';

export interface AttachmentLightboxProps {
    /** Whether the lightbox is open */
    isOpen: boolean;
    /** Called when the lightbox should close */
    onClose: () => void;
    /** All image attachments */
    attachments: AttachmentInfo[];
    /** Currently selected image index */
    currentIndex: number;
    /** Called when navigating to a different image */
    onNavigate: (index: number) => void;
    /** Download URLs by attachment ID */
    downloadUrls: Record<string, string>;
    /** Called to request a download URL */
    onRequestUrl?: (attachmentId: string) => Promise<string>;
    /** Called when download is clicked */
    onDownload?: (attachment: AttachmentInfo) => void;
}

export function AttachmentLightbox({
    isOpen,
    onClose,
    attachments,
    currentIndex,
    onNavigate,
    downloadUrls,
    onRequestUrl,
    onDownload,
}: AttachmentLightboxProps) {
    const [loadedUrls, setLoadedUrls] = useState<Record<string, string>>(downloadUrls);
    const [isLoading, setIsLoading] = useState(false);

    const currentAttachment = attachments[currentIndex];
    const currentUrl = currentAttachment ? loadedUrls[currentAttachment.id] : null;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < attachments.length - 1;

    // Fetch URL for current image if not loaded
    useEffect(() => {
        if (!currentAttachment || currentUrl || isLoading) return;
        if (!onRequestUrl) return;

        setIsLoading(true);
        onRequestUrl(currentAttachment.id)
            .then(url => {
                setLoadedUrls(prev => ({ ...prev, [currentAttachment.id]: url }));
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [currentAttachment, currentUrl, isLoading, onRequestUrl]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && hasPrev) {
                onNavigate(currentIndex - 1);
            } else if (e.key === 'ArrowRight' && hasNext) {
                onNavigate(currentIndex + 1);
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentIndex, hasPrev, hasNext, onNavigate, onClose]);

    const handlePrev = useCallback(() => {
        if (hasPrev) onNavigate(currentIndex - 1);
    }, [hasPrev, currentIndex, onNavigate]);

    const handleNext = useCallback(() => {
        if (hasNext) onNavigate(currentIndex + 1);
    }, [hasNext, currentIndex, onNavigate]);

    if (!currentAttachment) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0 overflow-hidden"
                aria-describedby={undefined}
            >
                {/* Visually hidden title for accessibility */}
                <VisuallyHidden>
                    <DialogTitle>Image Viewer</DialogTitle>
                </VisuallyHidden>

                {/* Header with counter and close */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
                    <span className="text-white/80 text-sm">
                        {currentIndex + 1} / {attachments.length}
                    </span>
                    <div className="flex items-center gap-2">
                        {onDownload && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDownload(currentAttachment)}
                                className="text-white/80 hover:text-white hover:bg-white/20"
                            >
                                <Download className="h-5 w-5" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="text-white/80 hover:text-white hover:bg-white/20"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Main image area */}
                <div className="flex items-center justify-center w-full h-[80vh]">
                    {isLoading ? (
                        <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : currentUrl ? (
                        <img
                            src={currentUrl}
                            alt={currentAttachment.displayName}
                            className="max-w-full max-h-full object-contain"
                        />
                    ) : (
                        <div className="text-white/60">
                            {microcopy.attachments?.error?.loadFailed || 'Failed to load image'}
                        </div>
                    )}
                </div>

                {/* Navigation buttons */}
                {hasPrev && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50"
                        aria-label={microcopy.attachments?.lightbox?.prev || 'Previous image'}
                    >
                        <ChevronLeft className="h-8 w-8" />
                    </Button>
                )}
                {hasNext && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50"
                        aria-label={microcopy.attachments?.lightbox?.next || 'Next image'}
                    >
                        <ChevronRight className="h-8 w-8" />
                    </Button>
                )}

                {/* Filename footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                    <p className="text-white/80 text-sm text-center truncate">
                        {currentAttachment.displayName}
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
