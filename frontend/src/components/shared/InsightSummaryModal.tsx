'use client';

import { useState, useMemo } from 'react';
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
import { TagPicker } from '@/components/shared/TagPicker';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useAppContext } from '@/lib/store/AppContext';
import { toast } from 'sonner';
import type { Item, SuggestedTag } from '@/lib/types';
import { Sparkles, Check, X, Tag as TagIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InsightSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Item;
}

/**
 * Modal for reviewing and confirming pending items.
 * Shows AI-generated summary and suggested tags with accept/reject workflow.
 */
export function InsightSummaryModal({ isOpen, onClose, item }: InsightSummaryModalProps) {
    const { confirmItem, discardItem, tags: existingTags } = useAppContext();
    const [isConfirming, setIsConfirming] = useState(false);
    const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);

    // Editable states
    const [title, setTitle] = useState(item.title || '');
    const [summary, setSummary] = useState(item.summary || item.rawText);

    // Suggestion states
    const [reviewState, setReviewState] = useState<Record<string, 'ACCEPTED' | 'REJECTED' | 'PENDING'>>({});

    // Manual tags state
    // Initialize with existing confirmed tags (usually empty for AI flow, but good for fallback)
    const [manualTags, setManualTags] = useState<string[]>(item.tags.map(t => t.name));

    // Initialize review state from suggestions on open
    useMemo(() => {
        const initialReview: Record<string, 'ACCEPTED' | 'REJECTED' | 'PENDING'> = {};
        item.suggestedTags?.forEach(tag => {
            // Default to PENDING, or keep PENDING if status is passed
            initialReview[tag.id] = tag.status === 'ACCEPTED' ? 'ACCEPTED' :
                tag.status === 'REJECTED' ? 'REJECTED' :
                    'PENDING';
        });
        setReviewState(initialReview);
    }, [item.suggestedTags]);

    const handleConfirm = async () => {
        setIsConfirming(true);
        // Simulate API delay ensures UI feedback
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Group suggestions by status
        const acceptedSuggestionIds = Object.entries(reviewState)
            .filter(([_, status]) => status === 'ACCEPTED')
            .map(([id]) => id);

        const rejectedSuggestionIds = Object.entries(reviewState)
            .filter(([_, status]) => status === 'REJECTED')
            .map(([id]) => id);

        // Tags to add (names) from "Your tags" section
        // We pass these as 'tags' and backend handles them alongside suggestions via our patch
        try {
            await confirmItem(item.id, {
                title: title || undefined,
                summary: summary,
                tags: manualTags,
                acceptedSuggestionIds,
                rejectedSuggestionIds,
            });

            toast.success(microcopy.toast.savedToLibrary);
            onClose();
        } catch (error) {
            console.error('Failed to confirm item:', error);
            toast.error(microcopy.modal.insight.error.saveFailed);
        } finally {
            setIsConfirming(false);
        }
    };

    const handleDiscard = () => {
        discardItem(item.id);
        toast.success(microcopy.toast.discarded);
        setIsDiscardDialogOpen(false);
        onClose();
    };

    const toggleSuggestion = (id: string) => {
        setReviewState(prev => {
            const current = prev[id];
            let next: 'ACCEPTED' | 'REJECTED' | 'PENDING' = 'ACCEPTED';

            // Cycle: PENDING -> ACCEPTED -> REJECTED -> PENDING
            if (current === 'PENDING') next = 'ACCEPTED';
            else if (current === 'ACCEPTED') next = 'REJECTED';
            else next = 'PENDING';

            return { ...prev, [id]: next };
        });
    };

    // Get available tags for the picker
    const availableTags = existingTags?.map((t) => t.name) || [];

    const hasSuggestions = item.suggestedTags && item.suggestedTags.length > 0;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="gap-1.5">
                                <Sparkles className="h-3 w-3" />
                                {microcopy.modal.insight.badge}
                            </Badge>
                        </div>
                        <DialogTitle>{microcopy.modal.insight.title}</DialogTitle>
                    </DialogHeader>

                    {/* Summary Content */}
                    <div className="py-4 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="title-input" className="text-sm font-medium text-muted-foreground">
                                    {microcopy.modal.detail.edit.titleLabel}
                                </label>
                                <Input
                                    id="title-input"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Untitled"
                                    className="font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="summary-input" className="text-sm font-medium text-muted-foreground">
                                    {item.summary ? microcopy.modal.detail.edit.summaryLabel : 'Original Text'}
                                </label>
                                <Textarea
                                    id="summary-input"
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    className="min-h-[150px] leading-relaxed resize-y"
                                />
                            </div>
                        </div>

                        {/* Suggested Tags */}
                        {hasSuggestions && (
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Sparkles className="h-3 w-3 text-emerald-500" />
                                    {microcopy.modal.insight.suggested_tags.title}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {item.suggestedTags!.map((tag) => {
                                        const status = reviewState[tag.id] || 'PENDING';
                                        return (
                                            <button
                                                key={tag.id}
                                                onClick={() => toggleSuggestion(tag.id)}
                                                className={cn(
                                                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-all ring-1",
                                                    status === 'PENDING' && "bg-secondary/50 text-secondary-foreground ring-transparent hover:bg-secondary",
                                                    status === 'ACCEPTED' && "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100",
                                                    status === 'REJECTED' && "bg-red-50 text-zinc-400 ring-zinc-100 hover:bg-red-100 hover:text-red-700 line-through decoration-zinc-400"
                                                )}
                                            >
                                                {tag.name}
                                                {status === 'ACCEPTED' && <Check className="h-3 w-3" />}
                                                {status === 'REJECTED' && <X className="h-3 w-3" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Your Tags (Manual) */}
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TagIcon className="h-3 w-3" />
                                {hasSuggestions ? microcopy.modal.insight.your_tags.title : microcopy.modal.detail.edit.tagsLabel}
                            </div>
                            <TagPicker
                                selectedTags={manualTags}
                                availableTags={availableTags}
                                onChange={setManualTags}
                                allowCreate={true}
                                trigger={hasSuggestions ? (
                                    <button
                                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/40 px-3 py-1 text-sm text-muted-foreground hover:bg-muted hover:border-muted-foreground/60 transition-colors"
                                    >
                                        {microcopy.modal.insight.your_tags.add}
                                    </button>
                                ) : undefined}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                        <Button
                            variant="ghost"
                            onClick={() => setIsDiscardDialogOpen(true)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            {microcopy.modal.insight.action.discard}
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isConfirming}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isConfirming
                                ? microcopy.modal.insight.action.confirmLoading
                                : microcopy.modal.insight.action.confirm}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Discard Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isDiscardDialogOpen}
                onClose={() => setIsDiscardDialogOpen(false)}
                onConfirm={handleDiscard}
                title={microcopy.dialog.discard.title}
                description={microcopy.dialog.discard.copy}
                cancelLabel={microcopy.dialog.discard.cancel}
                confirmLabel={microcopy.dialog.discard.confirm}
                variant="destructive"
            />
        </>
    );
}
