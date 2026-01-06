'use client';

import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { microcopy } from '@/lib/microcopy';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ColoredTagBadge } from '@/components/shared/ColoredTagBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TagPicker } from '@/components/shared/TagPicker';
import { apiClient, isUsingRealApi } from '@/lib/api/client';
import { useAppContext } from '@/lib/store/AppContext';
import { useUpload } from '@/lib/hooks/useUpload';
import { toast } from 'sonner';
import type { Item, AttachmentInfo } from '@/lib/types';
import { FileText, Link as LinkIcon, Pencil, Trash2, Paperclip, Download, Image } from 'lucide-react';
import { AttachmentGrid } from '@/components/shared/AttachmentGrid';
import { AttachmentLightbox } from '@/components/shared/AttachmentLightbox';
import { DocumentPill } from '@/components/shared/DocumentPill';
import { DocumentPreviewDialog } from '@/components/shared/DocumentPreviewDialog';

interface ItemDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Item to display (full Item object) */
    item: Item;
    /** Callback when item is updated */
    onUpdate?: (updatedItem: Item) => void;
    /** Callback when item is discarded */
    onDiscard?: (itemId: string) => void;
}

function formatFileSize(bytes: number | null): string {
    if (bytes === null || bytes === undefined) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


/**
 * Modal for viewing and editing item details.
 * Used by Library and Search pages.
 * Supports read mode and edit mode for ARCHIVED items.
 */
export function ItemDetailModal({
    isOpen,
    onClose,
    item,
    onUpdate,
    onDiscard,
}: ItemDetailModalProps) {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDiscarding, setIsDiscarding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Attachment viewing state
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewAttachment, setPreviewAttachment] = useState<AttachmentInfo | null>(null);
    const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
    const [loadingUrl, setLoadingUrl] = useState(false);

    // Fetched attachments (since library list only provides count)
    const [fetchedAttachments, setFetchedAttachments] = useState<AttachmentInfo[]>([]);
    const [loadingAttachments, setLoadingAttachments] = useState(false);
    const { listAttachments } = useUpload();

    // Edit form state
    const [editTitle, setEditTitle] = useState(item.title || '');
    const [editSummary, setEditSummary] = useState(item.summary || '');
    const [editTags, setEditTags] = useState<string[]>(item.tags.map(t => t.name));
    const [editOriginalText, setEditOriginalText] = useState(item.rawText);

    // Get available tags from AppContext
    const { tags: existingTags } = useAppContext();
    const availableTags = existingTags?.map((t) => t.name) || [];

    // Track previously opened item to avoid clearing URLs unnecessarily
    const prevItemIdRef = useRef<string | null>(null);

    // Reset to edit mode when modal opens
    useEffect(() => {
        if (isOpen) {
            setIsEditing(true);
            setEditTitle(item.title || '');
            setEditSummary(item.summary || '');
            setEditTags(item.tags.map(t => t.name));
            setEditOriginalText(item.rawText);
            setError(null);

            // Only clear URLs and attachments when switching to a different item
            const isNewItem = prevItemIdRef.current !== item.id;
            if (isNewItem) {
                prevItemIdRef.current = item.id;
                setDownloadUrls({});
                setFetchedAttachments([]);

                // Fetch attachments if item has any
                if (item.attachmentCount && item.attachmentCount > 0) {
                    setLoadingAttachments(true);
                    listAttachments(item.id)
                        .then(attachments => {
                            // Convert AttachmentListItem to AttachmentInfo
                            const converted: AttachmentInfo[] = attachments.map(a => ({
                                id: a.id,
                                uploadId: a.uploadId,
                                displayName: a.displayName,
                                mimeType: a.mimeType,
                                sizeBytes: a.sizeBytes,
                                kind: a.kind as 'image' | 'file',
                                createdAt: new Date(a.createdAt),
                            }));
                            setFetchedAttachments(converted);
                        })
                        .catch(err => {
                            console.error('Failed to fetch attachments:', err);
                        })
                        .finally(() => {
                            setLoadingAttachments(false);
                        });
                }
            }
        }
    }, [isOpen, item, listAttachments]);

    const Icon = item.sourceType === 'ARTICLE' ? LinkIcon : FileText;
    const typeLabel = item.sourceType === 'ARTICLE'
        ? microcopy.evidence.type.article
        : microcopy.evidence.type.note;

    // Can edit only archived items
    const canEdit = item.status === 'ARCHIVED';

    const handleStartEdit = () => {
        setEditTitle(item.title || '');
        setEditSummary(item.summary || '');
        setEditTags(item.tags.map(t => t.name));
        setEditOriginalText(item.rawText);
        setError(null);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setError(null);
    };

    // Fetch download URL for an attachment
    const fetchDownloadUrl = async (attachmentId: string, preview: boolean = false): Promise<string> => {
        // Use different cache key for preview vs download to avoid conflicts
        const cacheKey = preview ? `${attachmentId}_preview` : attachmentId;
        if (downloadUrls[cacheKey]) return downloadUrls[cacheKey];
        try {
            const response = await apiClient.getAttachmentDownloadUrl(attachmentId, preview);
            setDownloadUrls(prev => ({ ...prev, [cacheKey]: response.downloadUrl }));
            return response.downloadUrl;
        } catch (error) {
            console.error('Failed to get download URL:', error);
            toast.error(microcopy.attachments.error.downloadFailed);
            throw error;
        }
    };

    // Handle image click - open lightbox
    const handleImageClick = (index: number) => {
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    // Handle document preview
    const handleDocumentPreview = async (attachment: AttachmentInfo) => {
        setPreviewAttachment(attachment);
        setPreviewOpen(true);
        setLoadingUrl(true);
        try {
            // Request preview URL (inline disposition) for PDFs
            const isPdf = attachment.mimeType?.includes('pdf') ?? false;
            const url = await fetchDownloadUrl(attachment.id, isPdf);
            // Store the preview URL with the attachment ID for the dialog
            setDownloadUrls(prev => ({ ...prev, [attachment.id]: url }));
        } catch {
            // Error handled in fetchDownloadUrl
        } finally {
            setLoadingUrl(false);
        }
    };

    // Handle download
    const handleDownload = async (attachment: AttachmentInfo) => {
        try {
            const url = await fetchDownloadUrl(attachment.id);
            window.open(url, '_blank');
        } catch {
            // Error handled in fetchDownloadUrl
        }
    };

    // Filter attachments by type - use fetched attachments if available, else item.attachments
    const allAttachments = fetchedAttachments.length > 0 ? fetchedAttachments : (item.attachments || []);
    const imageAttachments = allAttachments.filter(a => a.kind === 'image');
    const documentAttachments = allAttachments.filter(a => a.kind === 'file');

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        try {
            if (isUsingRealApi) {
                await apiClient.updateItem(item.id, {
                    title: editTitle || undefined,
                    summary: editSummary || undefined,
                    tags: editTags,
                    originalText: editOriginalText,
                });
            } else {
                // Mock delay
                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            // Update local state
            const updatedItem: Item = {
                ...item,
                title: editTitle || null,
                summary: editSummary || null,
                rawText: editOriginalText,
                tags: editTags.map(name => ({
                    id: '',
                    name,
                    color: '#6B7280',
                })),
                updatedAt: new Date(),
            };

            onUpdate?.(updatedItem);
            toast.success(microcopy.toast.savedToLibrary);
            onClose();
        } catch (err) {
            console.error('Failed to update item:', err);
            setError(microcopy.modal.detail.error.saveFailed);
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setIsEditing(false);
        setError(null);
        onClose();
    };

    const handleDiscard = async () => {
        setIsDiscarding(true);
        try {
            if (isUsingRealApi) {
                await apiClient.discardItem(item.id);
            } else {
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
            toast.success(microcopy.toast.discarded);

            // Invalidate library and search queries to refresh the lists
            queryClient.invalidateQueries({ queryKey: ['library'] });
            queryClient.invalidateQueries({ queryKey: ['search'] });

            onDiscard?.(item.id);
            onClose();
        } catch (err) {
            console.error('Failed to discard item:', err);
            toast.error('Failed to discard item. Please try again.');
        } finally {
            setIsDiscarding(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg max-w-[90vw] min-w-[320px] min-h-[400px] max-h-[90vh] flex flex-col resize overflow-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {item.sourceType && (
                                <Badge variant="outline" className="gap-1.5">
                                    <Icon className="h-3 w-3" />
                                    {typeLabel}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <DialogTitle>
                        {isEditing ? 'Edit Item' : (item.title || 'Untitled')}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {isEditing ? (
                        /* Edit Mode */
                        <div className="space-y-4">
                            {/* Error Banner */}
                            {error && (
                                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                                    {error}
                                </div>
                            )}

                            {/* Title */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-title">
                                    {microcopy.modal.detail.edit.titleLabel}
                                </Label>
                                <Input
                                    id="edit-title"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="Enter title..."
                                />
                            </div>

                            {/* Summary */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-summary">
                                    {microcopy.modal.detail.edit.summaryLabel}
                                </Label>
                                <Textarea
                                    id="edit-summary"
                                    value={editSummary}
                                    onChange={(e) => setEditSummary(e.target.value)}
                                    placeholder="Enter summary..."
                                    rows={4}
                                    className="resize-none"
                                />
                            </div>

                            {/* Tags */}
                            <div className="space-y-2">
                                <Label>{microcopy.modal.detail.edit.tagsLabel}</Label>
                                <TagPicker
                                    selectedTags={editTags}
                                    availableTags={availableTags}
                                    onChange={setEditTags}
                                    allowCreate={true}
                                />
                            </div>

                            {/* Original Text (Editable) */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-text" className="text-muted-foreground">Original Text</Label>
                                <Textarea
                                    id="edit-text"
                                    value={editOriginalText}
                                    onChange={(e) => setEditOriginalText(e.target.value)}
                                    placeholder="Enter text..."
                                    rows={8}
                                    className="resize-y font-mono text-sm leading-relaxed"
                                />
                            </div>

                            {/* Attachments in Edit Mode */}
                            {loadingAttachments && (
                                <div className="pt-2 border-t">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        Loading attachments...
                                    </div>
                                </div>
                            )}

                            {!loadingAttachments && imageAttachments.length > 0 && (
                                <div className="pt-2 border-t space-y-3">
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Image className="h-3.5 w-3.5" />
                                        Images ({imageAttachments.length})
                                    </div>
                                    <AttachmentGrid
                                        attachments={imageAttachments}
                                        downloadUrls={downloadUrls}
                                        onRequestUrl={fetchDownloadUrl}
                                        onImageClick={handleImageClick}
                                    />
                                </div>
                            )}

                            {!loadingAttachments && documentAttachments.length > 0 && (
                                <div className="pt-2 border-t space-y-3">
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Paperclip className="h-3.5 w-3.5" />
                                        Documents ({documentAttachments.length})
                                    </div>
                                    <div className="space-y-2">
                                        {documentAttachments.map((att) => (
                                            <DocumentPill
                                                key={att.id}
                                                attachment={att}
                                                onPreview={() => handleDocumentPreview(att)}
                                                onDownload={() => handleDownload(att)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Read Mode */
                        <>
                            {/* Summary */}
                            {item.summary && (
                                <div className="text-sm text-muted-foreground rounded-lg bg-muted/50 p-3">
                                    {item.summary}
                                </div>
                            )}

                            {/* Raw Content (scrollable) */}
                            <div className="prose prose-sm max-w-none text-muted-foreground max-h-60 overflow-y-auto">
                                {item.rawText.split('\n').map((line, i) => (
                                    <p key={i} className="mb-2 last:mb-0">
                                        {line}
                                    </p>
                                ))}
                            </div>

                            {/* Tags */}
                            {item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2 border-t">
                                    {item.tags.map((tag) => (
                                        <ColoredTagBadge key={tag.id || tag.name} name={tag.name} color={tag.color} />
                                    ))}
                                </div>
                            )}

                            {/* Attachments Loading */}
                            {loadingAttachments && (
                                <div className="pt-2 border-t">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        Loading attachments...
                                    </div>
                                </div>
                            )}

                            {/* Attachments - Images */}
                            {!loadingAttachments && imageAttachments.length > 0 && (
                                <div className="pt-2 border-t space-y-3">
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Image className="h-3.5 w-3.5" />
                                        Images ({imageAttachments.length})
                                    </div>
                                    <AttachmentGrid
                                        attachments={imageAttachments}
                                        downloadUrls={downloadUrls}
                                        onRequestUrl={fetchDownloadUrl}
                                        onImageClick={handleImageClick}
                                    />
                                </div>
                            )}

                            {/* Attachments - Documents */}
                            {!loadingAttachments && documentAttachments.length > 0 && (
                                <div className="pt-2 border-t space-y-3">
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Paperclip className="h-3.5 w-3.5" />
                                        Documents ({documentAttachments.length})
                                    </div>
                                    <div className="space-y-2">
                                        {documentAttachments.map((att) => (
                                            <DocumentPill
                                                key={att.id}
                                                attachment={att}
                                                onPreview={() => handleDocumentPreview(att)}
                                                onDownload={() => handleDownload(att)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Edit Mode Footer */}
                {isEditing && (
                    <div className="flex items-center justify-between gap-2 pt-4 border-t">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    disabled={isSaving || isDiscarding}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    {microcopy.dialog.discard.confirm}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        {microcopy.dialog.discard.title}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {microcopy.dialog.discard.copy}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>
                                        {microcopy.dialog.discard.cancel}
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDiscard}
                                        disabled={isDiscarding}
                                        className="bg-destructive text-white hover:bg-destructive/90"
                                    >
                                        {isDiscarding
                                            ? 'Discarding...'
                                            : microcopy.dialog.discard.confirm}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                            >
                                {microcopy.modal.detail.action.cancel}
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                            >
                                {isSaving
                                    ? microcopy.modal.detail.action.saving
                                    : microcopy.modal.detail.action.save}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>

            {/* Image Lightbox */}
            <AttachmentLightbox
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                attachments={imageAttachments}
                currentIndex={lightboxIndex}
                onNavigate={setLightboxIndex}
                downloadUrls={downloadUrls}
                onRequestUrl={fetchDownloadUrl}
                onDownload={handleDownload}
            />

            {/* Document Preview Dialog */}
            <DocumentPreviewDialog
                isOpen={previewOpen}
                onClose={() => setPreviewOpen(false)}
                attachment={previewAttachment}
                downloadUrl={previewAttachment ? downloadUrls[previewAttachment.id] : null}
                isLoading={loadingUrl}
                onDownload={previewAttachment ? () => handleDownload(previewAttachment) : undefined}
            />
        </Dialog>
    );
}
