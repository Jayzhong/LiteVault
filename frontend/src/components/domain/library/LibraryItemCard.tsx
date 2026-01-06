'use client';

import { useState } from 'react';
import { ItemCard } from '@/components/shared/ItemCard';
import { ItemDetailModal } from '@/components/shared/ItemDetailModal';
import type { Item } from '@/lib/types';

interface LibraryItemCardProps {
    item: Item;
    /** Callback when item is updated (for optimistic updates) */
    onUpdate?: (updatedItem: Item) => void;
}

/**
 * Card component for library items on the Library page.
 * Uses unified ItemCard styling.
 */
export function LibraryItemCard({ item, onUpdate }: LibraryItemCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleUpdate = (updatedItem: Item) => {
        onUpdate?.(updatedItem);
    };

    return (
        <>
            <ItemCard
                title={item.title || 'Untitled'}
                summary={item.summary || item.rawText}
                tags={item.tags}
                sourceType={item.sourceType}
                attachmentCount={item.attachmentCount}
                showIcon={true}
                onClick={() => setIsModalOpen(true)}
            />

            <ItemDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                item={item}
                onUpdate={handleUpdate}
            />
        </>
    );
}
