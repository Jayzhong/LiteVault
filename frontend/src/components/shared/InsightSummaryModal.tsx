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
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useAppContext } from '@/lib/store/AppContext';
import { toast } from 'sonner';
import type { Item } from '@/lib/types';
import { Sparkles, X } from 'lucide-react';

interface InsightSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Item;
}

export function InsightSummaryModal({ isOpen, onClose, item }: InsightSummaryModalProps) {
    const { confirmItem, discardItem } = useAppContext();
    const [isConfirming, setIsConfirming] = useState(false);
    const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
    const [tags, setTags] = useState<string[]>(item.tags);

    const handleConfirm = async () => {
        setIsConfirming(true);
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        confirmItem(item.id);
        toast.success(microcopy.toast.savedToLibrary);
        onClose();
        setIsConfirming(false);
    };

    const handleDiscard = () => {
        discardItem(item.id);
        toast.success(microcopy.toast.discarded);
        setIsDiscardDialogOpen(false);
        onClose();
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter((t) => t !== tagToRemove));
    };

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
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <h3 className="font-medium text-foreground">{item.title || 'Untitled'}</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {item.summary || item.rawText}
                            </p>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                                <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="gap-1.5 pr-1.5"
                                >
                                    {tag}
                                    <button
                                        onClick={() => removeTag(tag)}
                                        className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                            <Badge
                                variant="outline"
                                className="cursor-pointer hover:bg-muted"
                            >
                                {microcopy.modal.insight.tags.add}
                            </Badge>
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
