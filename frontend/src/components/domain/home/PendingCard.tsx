'use client';

import { useState } from 'react';
import { microcopy } from '@/lib/microcopy';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ItemCard } from '@/components/shared/ItemCard';
import { InsightSummaryModal } from '@/components/shared/InsightSummaryModal';
import { useAppContext } from '@/lib/store/AppContext';
import type { Item } from '@/lib/types';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface PendingCardProps {
    item: Item;
}

/**
 * Card component for pending items on the Home page.
 * Handles ENRICHING, FAILED, and READY_TO_CONFIRM states.
 */
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
        const handleRetry = (e: React.MouseEvent) => {
            e.stopPropagation();
            retryItem(item.id);
        };

        const handleOpen = (e: React.MouseEvent) => {
            e.stopPropagation();
            setIsModalOpen(true);
        };

        return (
            <>
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
                        <Button size="sm" onClick={handleRetry}>
                            {microcopy.home.pending.action.retry}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleOpen}>
                            {microcopy.home.pending.action.open}
                        </Button>
                    </div>
                </div>

                <InsightSummaryModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    item={item}
                />
            </>
        );
    }

    // Ready to confirm state - use unified ItemCard
    return (
        <>
            <ItemCard
                title={item.title || 'Untitled'}
                summary={item.summary || item.rawText}
                tags={item.tags}
                statusBadge={microcopy.home.pending.status.ready}
                timestamp={getTimeAgo(item.createdAt)}
                onClick={() => setIsModalOpen(true)}
            />

            <InsightSummaryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                item={item}
            />
        </>
    );
}
