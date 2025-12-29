'use client';

import { useState } from 'react';
import { microcopy } from '@/lib/microcopy';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TagPicker } from '@/components/shared/TagPicker';
import { apiClient, isUsingRealApi } from '@/lib/api/client';
import { toast } from 'sonner';
import type { Item } from '@/lib/types';
import { FileText, Link as LinkIcon, Pencil } from 'lucide-react';

interface ItemDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Item to display (full Item object) */
    item: Item;
    /** Callback when item is updated */
    onUpdate?: (updatedItem: Item) => void;
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
}: ItemDetailModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Edit form state
    const [editTitle, setEditTitle] = useState(item.title || '');
    const [editSummary, setEditSummary] = useState(item.summary || '');
    const [editTags, setEditTags] = useState<string[]>(item.tags);

    const Icon = item.sourceType === 'ARTICLE' ? LinkIcon : FileText;
    const typeLabel = item.sourceType === 'ARTICLE'
        ? microcopy.evidence.type.article
        : microcopy.evidence.type.note;

    // Can edit only archived items
    const canEdit = item.status === 'ARCHIVED';

    const handleStartEdit = () => {
        setEditTitle(item.title || '');
        setEditSummary(item.summary || '');
        setEditTags([...item.tags]);
        setError(null);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setError(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        try {
            if (isUsingRealApi) {
                await apiClient.updateItem(item.id, {
                    title: editTitle || undefined,
                    summary: editSummary || undefined,
                    tags: editTags,
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
                tags: editTags,
                updatedAt: new Date(),
            };

            onUpdate?.(updatedItem);
            toast.success(microcopy.toast.savedToLibrary);
            setIsEditing(false);
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

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
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
                        {canEdit && !isEditing && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleStartEdit}
                                className="gap-1.5"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                                {microcopy.modal.detail.action.edit}
                            </Button>
                        )}
                    </div>
                    {!isEditing && (
                        <DialogTitle>{item.title || 'Untitled'}</DialogTitle>
                    )}
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
                                    onChange={setEditTags}
                                    allowCreate={true}
                                />
                            </div>

                            {/* Raw Text (read-only) */}
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Original Text</Label>
                                <div className="prose prose-sm max-w-none text-muted-foreground max-h-40 overflow-y-auto bg-muted/50 p-3 rounded-lg text-sm">
                                    {item.rawText}
                                </div>
                            </div>
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
                                        <Badge key={tag} variant="secondary">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Edit Mode Footer */}
                {isEditing && (
                    <div className="flex items-center justify-end gap-2 pt-4 border-t">
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
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isSaving
                                ? microcopy.modal.detail.action.saving
                                : microcopy.modal.detail.action.save}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
