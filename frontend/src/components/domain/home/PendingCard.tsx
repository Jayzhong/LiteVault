'use client';

import { useState } from 'react';
import { microcopy } from '@/lib/microcopy';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { InsightSummaryModal } from '@/components/shared/InsightSummaryModal';
import { useAppContext } from '@/lib/store/AppContext';
import type { Item } from '@/lib/types';
import { Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface PendingCardProps {
    item: Item;
}

export function PendingCard({ item }: PendingCardProps) {
    const { retryItem } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const getTimeAgo = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return 'Yesterday';
    };

    // Enriching state (skeleton)
    if (item.status === 'ENRICHING') {
        return (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="animate-spin">
                            <RefreshCw className="h-4 w-4" />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{microcopy.home.pending.status.enriching}</span>
                </div>
            </div>
        );
    }

    // Failed state
    if (item.status === 'FAILED') {
        return (
            <div className="rounded-xl border border-destructive/50 bg-card p-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span className="font-medium">{microcopy.home.pending.status.failedTitle}</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.rawText}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button size="sm" onClick={() => retryItem(item.id)}>
                        {microcopy.home.pending.action.retry}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsModalOpen(true)}>
                        {microcopy.home.pending.action.open}
                    </Button>
                </div>
            </div>
        );
    }

    // Ready to confirm state
    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="w-full rounded-xl border border-border bg-card p-4 text-left hover:border-emerald-300 hover:bg-card/80 transition-colors"
            >
                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1 min-w-0">
                            <h3 className="font-medium text-foreground truncate">
                                {item.title || 'Untitled'}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {item.summary || item.rawText}
                            </p>
                        </div>
                        <Badge
                            variant="outline"
                            className="shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200"
                        >
                            {microcopy.home.pending.status.ready}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {getTimeAgo(item.createdAt)}
                        </div>
                        {item.tags.length > 0 && (
                            <div className="flex items-center gap-1.5">
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

            <InsightSummaryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                item={item}
            />
        </>
    );
}
