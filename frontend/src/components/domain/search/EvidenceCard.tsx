'use client';

import { useState } from 'react';
import { microcopy } from '@/lib/microcopy';
import { Badge } from '@/components/ui/badge';
import { ItemDetailModal } from '@/components/shared/ItemDetailModal';
import type { EvidenceItem } from '@/lib/types';
import { FileText, Link as LinkIcon } from 'lucide-react';

interface EvidenceCardProps {
    evidence: EvidenceItem;
}

export function EvidenceCard({ evidence }: EvidenceCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const Icon = evidence.type === 'NOTE' ? FileText : LinkIcon;
    const typeLabel = evidence.type === 'NOTE'
        ? microcopy.evidence.type.note
        : microcopy.evidence.type.article;

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="w-full rounded-xl border border-border bg-card p-4 text-left hover:border-emerald-300 hover:bg-card/80 transition-colors"
            >
                <div className="space-y-3">
                    {/* Type Badge */}
                    <Badge variant="outline" className="gap-1.5">
                        <Icon className="h-3 w-3" />
                        {typeLabel}
                    </Badge>

                    {/* Title */}
                    <h3 className="font-medium text-foreground line-clamp-1">
                        {evidence.title}
                    </h3>

                    {/* Snippet */}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {evidence.snippet}
                    </p>

                    {/* Tags */}
                    {evidence.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {evidence.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </button>

            <ItemDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={evidence.title}
                content={evidence.snippet}
                tags={evidence.tags}
                type={evidence.type}
            />
        </>
    );
}
