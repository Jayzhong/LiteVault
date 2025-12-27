'use client';

import { useState } from 'react';
import { LibraryItemCard } from './LibraryItemCard';
import type { Item } from '@/lib/types';

interface TimelineGroupProps {
    label: string;
    items: Item[];
}

export function TimelineGroup({ label, items }: TimelineGroupProps) {
    return (
        <div className="space-y-3">
            {/* Group Label */}
            <h3 className="text-xs font-semibold text-muted-foreground tracking-wider">
                {label}
            </h3>

            {/* Items */}
            <div className="space-y-2">
                {items.map((item) => (
                    <LibraryItemCard key={item.id} item={item} />
                ))}
            </div>
        </div>
    );
}
