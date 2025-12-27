'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ItemDetailModal } from '@/components/shared/ItemDetailModal';
import type { Item } from '@/lib/types';
import { FileText, Link as LinkIcon } from 'lucide-react';

interface LibraryItemCardProps {
    item: Item;
}

export function LibraryItemCard({ item }: LibraryItemCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const Icon = item.sourceType === 'ARTICLE' ? LinkIcon : FileText;

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="w-full rounded-xl border border-border bg-card p-4 text-left hover:border-emerald-300 hover:bg-card/80 transition-colors"
            >
                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <h3 className="font-medium text-foreground truncate">
                            {item.title || 'Untitled'}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.summary || item.rawText}
                        </p>
                        {item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {item.tags.slice(0, 3).map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                                {item.tags.length > 3 && (
                                    <span className="text-xs text-muted-foreground">
                                        +{item.tags.length - 3}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </button>

            <ItemDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={item.title || 'Untitled'}
                content={item.rawText}
                tags={item.tags}
                type={item.sourceType}
            />
        </>
    );
}
