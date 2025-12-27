'use client';

import { microcopy } from '@/lib/microcopy';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { SourceType } from '@/lib/types';
import { FileText, Link as LinkIcon } from 'lucide-react';

interface ItemDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string;
    tags: string[];
    type?: SourceType;
}

export function ItemDetailModal({
    isOpen,
    onClose,
    title,
    content,
    tags,
    type,
}: ItemDetailModalProps) {
    const Icon = type === 'ARTICLE' ? LinkIcon : FileText;
    const typeLabel = type === 'ARTICLE'
        ? microcopy.evidence.type.article
        : microcopy.evidence.type.note;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    {type && (
                        <Badge variant="outline" className="w-fit gap-1.5 mb-2">
                            <Icon className="h-3 w-3" />
                            {typeLabel}
                        </Badge>
                    )}
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Content */}
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                        {content.split('\n').map((line, i) => (
                            <p key={i} className="mb-2 last:mb-0">
                                {line}
                            </p>
                        ))}
                    </div>

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                            {tags.map((tag) => (
                                <Badge key={tag} variant="secondary">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
