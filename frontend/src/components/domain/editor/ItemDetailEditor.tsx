'use client';

/**
 * ItemDetailEditor - Main editor shell for viewing and editing items
 * 
 * Replaces ItemDetailModal with a more structured, Bear-like editing experience.
 * See: docs/design/EDITOR_FIRST_NOTE_SPEC.md
 */

import { useState, useEffect, useRef } from 'react';
import { microcopy } from '@/lib/microcopy';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Save, Trash2, Loader2, Image, Paperclip } from 'lucide-react';
import { EditorProvider, useEditorContext } from './EditorProvider';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import { TagPicker } from '@/components/shared/TagPicker';
import { AttachmentGrid } from '@/components/shared/AttachmentGrid';
import { AttachmentLightbox } from '@/components/shared/AttachmentLightbox';
import { DocumentPill } from '@/components/shared/DocumentPill';
import { DocumentPreviewDialog } from '@/components/shared/DocumentPreviewDialog';
import { apiClient } from '@/lib/api/client';
import { useUpload } from '@/lib/hooks/useUpload';
import { toast } from 'sonner';
import type { Item, AttachmentInfo } from '@/lib/types';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface ItemDetailEditorProps {
    isOpen: boolean;
    onClose: () => void;
    item: Item;
    onUpdate?: (updatedItem: Item) => void;
    onDiscard?: (itemId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component (Wrapper)
// ─────────────────────────────────────────────────────────────────────────────

export function ItemDetailEditor({
    isOpen,
    onClose,
    item,
    onUpdate,
    onDiscard,
}: ItemDetailEditorProps) {
    if (!isOpen) return null;

    return (
        <EditorProvider
            item={item}
            onClose={onClose}
            onUpdate={onUpdate}
            onDiscard={onDiscard}
        >
            <EditorDialog isOpen={isOpen} onClose={onClose} />
        </EditorProvider>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dialog Component
// ─────────────────────────────────────────────────────────────────────────────

function EditorDialog({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const editor = useEditorContext();

    // Handle dialog close request (may show unsaved changes dialog)
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            editor.cancel();
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <EditorHeader />
                    <EditorBody />
                    <EditorFooter onClose={onClose} />
                </DialogContent>
            </Dialog>

            <UnsavedChangesDialog
                isOpen={editor.showUnsavedDialog}
                onKeepEditing={editor.onKeepEditing}
                onDiscard={editor.onDiscardChanges}
            />
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────────

function EditorHeader() {
    const { item, form, setTitle, canEdit, validationErrors } = useEditorContext();

    const titleError = validationErrors.find(e => e.field === 'title');

    return (
        <DialogHeader className="space-y-2">
            {/* Always render DialogTitle for accessibility */}
            {canEdit ? (
                <>
                    {/* Visually hidden title for screen readers */}
                    <VisuallyHidden>
                        <DialogTitle>Edit note: {form.title || 'Untitled'}</DialogTitle>
                    </VisuallyHidden>
                    <div className="space-y-1">
                        <Input
                            value={form.title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Add a title..."
                            className="text-xl font-semibold border-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                            aria-label="Note title"
                        />
                        {titleError && (
                            <p className="text-sm text-destructive">{titleError.message}</p>
                        )}
                    </div>
                </>
            ) : (
                <DialogTitle className="text-xl font-semibold">
                    {item.title || 'Untitled'}
                </DialogTitle>
            )}
            <DialogDescription className="sr-only">
                Edit note details
            </DialogDescription>
        </DialogHeader>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Body
// ─────────────────────────────────────────────────────────────────────────────

function EditorBody() {
    const {
        item,
        form,
        setOriginalText,
        canEdit,
        validationErrors,
        addTag,
        removeTag
    } = useEditorContext();

    const originalTextError = validationErrors.find(e => e.field === 'originalText');

    // Attachment state
    const [fetchedAttachments, setFetchedAttachments] = useState<AttachmentInfo[]>([]);
    const [loadingAttachments, setLoadingAttachments] = useState(false);
    const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewAttachment, setPreviewAttachment] = useState<AttachmentInfo | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const prevItemIdRef = useRef<string | null>(null);
    const { listAttachments } = useUpload();

    // Fetch attachments when item changes
    useEffect(() => {
        const isNewItem = prevItemIdRef.current !== item.id;
        if (isNewItem) {
            prevItemIdRef.current = item.id;
            setDownloadUrls({});
            setFetchedAttachments([]);

            if (item.attachmentCount && item.attachmentCount > 0) {
                setLoadingAttachments(true);
                listAttachments(item.id)
                    .then(attachments => {
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
    }, [item, listAttachments]);

    // Fetch download URL for an attachment
    const fetchDownloadUrl = async (attachmentId: string, preview: boolean = false): Promise<string> => {
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
        setPreviewLoading(true);
        try {
            const isPdf = attachment.mimeType?.includes('pdf') ?? false;
            const url = await fetchDownloadUrl(attachment.id, isPdf);
            setDownloadUrls(prev => ({ ...prev, [attachment.id]: url }));
        } catch {
            // Error handled in fetchDownloadUrl
        } finally {
            setPreviewLoading(false);
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

    // Filter attachments by type
    const allAttachments = fetchedAttachments.length > 0 ? fetchedAttachments : (item.attachments || []);
    const imageAttachments = allAttachments.filter(a => a.kind === 'image');
    const documentAttachments = allAttachments.filter(a => a.kind === 'file');

    // Handle tag changes from TagPicker
    const handleTagChange = (newTags: string[]) => {
        // Calculate added and removed tags
        const currentTags = new Set(form.tags);
        const newTagSet = new Set(newTags);

        // Remove tags that were removed
        for (const tag of form.tags) {
            if (!newTagSet.has(tag)) {
                removeTag(tag);
            }
        }

        // Add tags that were added
        for (const tag of newTags) {
            if (!currentTags.has(tag)) {
                addTag(tag);
            }
        }
    };

    return (
        <>
            <div className="space-y-6 py-4">
                {/* Summary Section (Read-only) */}
                {item.summary && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                            AI Summary
                        </label>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                            {item.summary}
                        </p>
                    </div>
                )}

                {/* Original Text Section */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                        Original Text
                    </label>
                    {canEdit ? (
                        <div className="space-y-1">
                            <Textarea
                                value={form.originalText}
                                onChange={(e) => setOriginalText(e.target.value)}
                                placeholder="Your captured thought..."
                                className="min-h-[200px] resize-none"
                                maxLength={10000}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                {originalTextError && (
                                    <p className="text-destructive">{originalTextError.message}</p>
                                )}
                                <span className="ml-auto">
                                    {form.originalText.length.toLocaleString()}/10,000
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-md">
                            {item.rawText}
                        </p>
                    )}
                </div>

                {/* Tags Section - Using TagPicker */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                        Tags
                    </label>
                    {canEdit ? (
                        <TagPicker
                            selectedTags={form.tags}
                            onChange={handleTagChange}
                            allowCreate={true}
                        />
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {item.tags.map((tag) => (
                                <Badge key={tag.id || tag.name} variant="secondary">
                                    {tag.name}
                                </Badge>
                            ))}
                            {item.tags.length === 0 && (
                                <span className="text-sm text-muted-foreground italic">
                                    No tags
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Attachments Section */}
                {loadingAttachments && (
                    <div className="pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            Loading attachments...
                        </div>
                    </div>
                )}

                {/* Image Attachments */}
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

                {/* Document Attachments */}
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
                isLoading={previewLoading}
                onDownload={previewAttachment ? () => handleDownload(previewAttachment) : undefined}
            />
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────────────────

function EditorFooter({ onClose }: { onClose: () => void }) {
    const {
        item,
        save,
        confirm,
        discard,
        cancel,
        isSaving,
        hasUnsavedChanges,
        canEdit,
        canConfirm,
        canDiscard,
    } = useEditorContext();

    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const handleDiscard = () => {
        setShowDiscardConfirm(true);
    };

    const confirmDiscard = async () => {
        setShowDiscardConfirm(false);
        await discard();
    };

    return (
        <div className="flex justify-between items-center pt-4 border-t">
            <div>
                {canDiscard && (
                    <Button
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleDiscard}
                        disabled={isSaving}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Discard
                    </Button>
                )}
            </div>

            <div className="flex gap-2">
                <Button variant="outline" onClick={cancel} disabled={isSaving}>
                    {hasUnsavedChanges ? 'Cancel' : 'Close'}
                </Button>

                {canConfirm ? (
                    <Button onClick={confirm} disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Confirm & Save'
                        )}
                    </Button>
                ) : canEdit && hasUnsavedChanges ? (
                    <Button onClick={save} disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save
                            </>
                        )}
                    </Button>
                ) : null}
            </div>

            {/* Discard Confirmation Dialog */}
            {showDiscardConfirm && (
                <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Discard this item?</DialogTitle>
                            <DialogDescription>
                                This will remove it from your library. You can't undo this action.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setShowDiscardConfirm(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={confirmDiscard}>
                                Discard
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

export default ItemDetailEditor;
