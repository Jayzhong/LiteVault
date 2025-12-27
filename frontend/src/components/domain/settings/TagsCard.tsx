'use client';

import Link from 'next/link';
import { microcopy, t } from '@/lib/microcopy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/lib/store/AppContext';
import { ArrowRight } from 'lucide-react';

export function TagsCard() {
    const { tags } = useAppContext();
    const activeTagCount = tags.filter((t) => t.usageCount > 0).length;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{microcopy.settings.section.tags}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    {t('settings.tags.summary', { n: activeTagCount })}
                </p>
                <Link href="/settings/tags">
                    <Button variant="outline" className="gap-2">
                        {microcopy.settings.tags.manage}
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}
