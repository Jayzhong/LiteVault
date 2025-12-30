'use client';

import { useState } from 'react';
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
import { toast } from 'sonner';
import type { Item } from '@/lib/types';
import { FileText, Link as LinkIcon, Pencil, Trash2 } from 'lucide-react';

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
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDiscarding, setIsDiscarding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Edit form state
    const [editTitle, setEditTitle] = useState(item.title || '');
    const [editSummary, setEditSummary] = useState(item.summary || '');
    const [editTags, setEditTags] = useState<string[]>(item.tags.map(t => t.name));
    const [editOriginalText, setEditOriginalText] = useState(item.rawText);

    // Get available tags from AppContext
    const { tags: existingTags } = useAppContext();
    const availableTags = existingTags?.map((t) => t.name) || [];

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

    const handleDiscard = async () => {
        setIsDiscarding(true);
        try {
            if (isUsingRealApi) {
                await apiClient.discardItem(item.id);
            } else {
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
            toast.success(microcopy.toast.discarded);
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
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleStartEdit}
                                    className="gap-1.5"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    {microcopy.modal.detail.action.edit}
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="gap-1.5 text-destructive hover:text-destructive"
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
                                                className="bg-destructive hover:bg-destructive/90"
                                            >
                                                {isDiscarding ? 'Discarding...' : microcopy.dialog.discard.confirm}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
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
