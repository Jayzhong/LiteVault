'use client';

import { useState } from 'react';
import { microcopy } from '@/lib/microcopy';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TimelineGroup } from '@/components/domain/library/TimelineGroup';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAppContext } from '@/lib/store/AppContext';
import { Search } from 'lucide-react';
import type { Item } from '@/lib/types';

export default function LibraryPage() {
    const { libraryItems, isLoading } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');

    // Filter items by search query
    const filteredItems = libraryItems.filter((item) =>
        searchQuery
            ? item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.rawText.toLowerCase().includes(searchQuery.toLowerCase())
            : true
    );

    // Group items by date
    const groupedItems = groupItemsByDate(filteredItems);

    // Loading state
    if (isLoading) {
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

    // Empty state
    if (libraryItems.length === 0) {
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

            {/* Empty filtered state */}
            {filteredItems.length === 0 && searchQuery && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No items match "{searchQuery}"</p>
                </div>
            )}
        </div>
    );
}

// Helper function to group items by date
function groupItemsByDate(items: Item[]) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups: { label: string; items: Item[] }[] = [];
    const todayItems: Item[] = [];
    const yesterdayItems: Item[] = [];
    const lastWeekItems: Item[] = [];

    items.forEach((item) => {
        const itemDate = new Date(item.createdAt);
        if (itemDate >= today) {
            todayItems.push(item);
        } else if (itemDate >= yesterday) {
            yesterdayItems.push(item);
        } else if (itemDate >= lastWeek) {
            lastWeekItems.push(item);
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

    return groups;
}
