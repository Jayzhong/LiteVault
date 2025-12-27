'use client';

import { microcopy, t } from '@/lib/microcopy';
import { Badge } from '@/components/ui/badge';
import { PendingCard } from './PendingCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAppContext } from '@/lib/store/AppContext';
import { Skeleton } from '@/components/ui/skeleton';

export function PendingReviewSection() {
    const { pendingItems, isLoading } = useAppContext();

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-5 w-40" />
                <div className="space-y-3">
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <section className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold text-muted-foreground tracking-wider">
                    {microcopy.home.pending.title}
                </h2>
                {pendingItems.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                        {pendingItems.length}
                    </Badge>
                )}
            </div>

            {/* Content */}
            {pendingItems.length === 0 ? (
                <EmptyState
                    title={microcopy.home.pending.empty.title}
                    copy={microcopy.home.pending.empty.copy}
                />
            ) : (
                <div className="space-y-3">
                    {pendingItems.map((item) => (
                        <PendingCard key={item.id} item={item} />
                    ))}
                </div>
            )}
        </section>
    );
}
