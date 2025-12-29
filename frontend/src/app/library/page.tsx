'use client';

import { useState, useEffect } from 'react';
import { microcopy } from '@/lib/microcopy';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TimelineGroup } from '@/components/domain/library/TimelineGroup';
import { EmptyState } from '@/components/shared/EmptyState';
import { useLibrary } from '@/lib/hooks/useLibrary';
import { useAccountProfile } from '@/lib/hooks/useAccountProfile';
import { getTimelineGroupLabel } from '@/lib/utils/dateFormat';
import { Search, AlertCircle } from 'lucide-react';
import type { Item } from '@/lib/types';

export default function LibraryPage() {
    const { items, isLoading, isFetching, isError, hasMore, fetchNextPage, isFetchingNextPage, refetch } = useLibrary();
    const { profile } = useAccountProfile();
    const userTimezone = profile?.preferences?.timezone || 'UTC';
    const [searchQuery, setSearchQuery] = useState('');

    // Prevent SSR/hydration mismatch - only show content after mount
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Filter items by search query (client-side)
    const filteredItems = items.filter((item) =>
        searchQuery
            ? item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.rawText.toLowerCase().includes(searchQuery.toLowerCase())
            : true
    );

    // Group items by date using user's timezone
    const groupedItems = groupItemsByDate(filteredItems, userTimezone);

    // Show loading skeleton when:
    // - Not yet mounted (SSR/hydration)
    // - Initial load (isLoading)
    // - Fetching data but no items yet (prevents empty flash)
    if (!mounted || isLoading || (isFetching && items.length === 0)) {
        return (
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-10 w-64" />
                </div>
                <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="h-4 w-20" />
                            <div className="space-y-2">
                                <Skeleton className="h-24 w-full rounded-xl" />
                                <Skeleton className="h-24 w-full rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (isError) {
        return (
            <div className="space-y-8">
                <h1 className="text-2xl font-semibold text-foreground">
                    {microcopy.library.title}
                </h1>
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                    <h2 className="text-xl font-medium text-foreground">
                        {microcopy.library.error?.title || "Couldn't load library"}
                    </h2>
                    <Button onClick={() => refetch()} variant="outline">
                        {microcopy.library.error?.action || 'Retry'}
                    </Button>
                </div>
            </div>
        );
    }

    // Empty state - only show after mounted AND not fetching
    if (items.length === 0 && !isFetching) {
        return (
            <div className="space-y-8">
                <h1 className="text-2xl font-semibold text-foreground">
                    {microcopy.library.title}
                </h1>
                <EmptyState
                    title={microcopy.library.empty.title}
                    copy={microcopy.library.empty.copy}
                    actionLabel={microcopy.library.empty.action}
                    actionHref="/"
                />
            </div>
        );
    }


    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-foreground">
                    {microcopy.library.title}
                </h1>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={microcopy.library.search.placeholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Timeline Groups */}
            <div className="space-y-8">
                {groupedItems.map((group) => (
                    <TimelineGroup key={group.label} label={group.label} items={group.items} />
                ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
                <div className="flex justify-center">
                    <Button
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        variant="outline"
                    >
                        {isFetchingNextPage ? 'Loading...' : 'Load More'}
                    </Button>
                </div>
            )}

            {/* Empty filtered state */}
            {filteredItems.length === 0 && searchQuery && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No items match "{searchQuery}"</p>
                </div>
            )}
        </div>
    );
}

// Helper function to group items by date using user's timezone
function groupItemsByDate(items: Item[], userTimezone: string) {
    const groups: { label: string; items: Item[] }[] = [];
    const todayItems: Item[] = [];
    const yesterdayItems: Item[] = [];
    const lastWeekItems: Item[] = [];
    const olderItems: Item[] = [];

    items.forEach((item) => {
        // Use confirmedAt for library items, fallback to createdAt
        const itemDate = item.confirmedAt || item.createdAt;
        const groupLabel = getTimelineGroupLabel(itemDate, userTimezone);

        switch (groupLabel) {
            case 'today':
                todayItems.push(item);
                break;
            case 'yesterday':
                yesterdayItems.push(item);
                break;
            case 'last7days':
                lastWeekItems.push(item);
                break;
            default:
                olderItems.push(item);
        }
    });

    if (todayItems.length > 0) {
        groups.push({ label: microcopy.library.group.today, items: todayItems });
    }
    if (yesterdayItems.length > 0) {
        groups.push({ label: microcopy.library.group.yesterday, items: yesterdayItems });
    }
    if (lastWeekItems.length > 0) {
        groups.push({ label: microcopy.library.group.last7days, items: lastWeekItems });
    }
    if (olderItems.length > 0) {
        groups.push({ label: 'Older', items: olderItems });
    }

    return groups;
}
