'use client';

import { microcopy, t } from '@/lib/microcopy';
import { Badge } from '@/components/ui/badge';
import { EvidenceCard } from './EvidenceCard';
import type { EvidenceItem } from '@/lib/types';

interface EvidenceGridProps {
    evidence: EvidenceItem[];
    totalSources: number;
}

export function EvidenceGrid({ evidence, totalSources }: EvidenceGridProps) {
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">
                    {microcopy.search.section.evidence}
                </h2>
                <Badge variant="secondary">
                    {t('search.badge.sources', { n: totalSources })}
                </Badge>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {evidence.map((item) => (
                    <EvidenceCard key={item.itemId} evidence={item} />
                ))}
            </div>
        </div>
    );
}
