'use client';

import { useState } from 'react';
import { microcopy } from '@/lib/microcopy';
import { ItemCard } from '@/components/shared/ItemCard';
import { ItemDetailModal } from '@/components/shared/ItemDetailModal';
import type { EvidenceItem, Item } from '@/lib/types';

interface EvidenceCardProps {
    evidence: EvidenceItem;
}

/**
 * Convert EvidenceItem to Item for modal display.
 */
function toItem(evidence: EvidenceItem): Item {
    return {
        id: evidence.itemId,
        rawText: evidence.snippet,
        title: evidence.title,
        summary: evidence.snippet,
        tags: evidence.tags,
        status: 'ARCHIVED',
        sourceType: evidence.type,
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmedAt: null,
    };
}

/**
 * Evidence card component for displaying search evidence items.
 * Uses unified ItemCard styling.
 */
export function EvidenceCard({ evidence }: EvidenceCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const typeLabel = evidence.type === 'NOTE'
        ? microcopy.evidence.type.note
        : microcopy.evidence.type.article;

    return (
        <>
            <ItemCard
                title={evidence.title}
                summary={evidence.snippet}
                tags={evidence.tags}
                sourceType={evidence.type}
                showIcon={true}
                onClick={() => setIsModalOpen(true)}
            />

            <ItemDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                item={toItem(evidence)}
            />
        </>
    );
}
