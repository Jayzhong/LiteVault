'use client';

import { microcopy } from '@/lib/microcopy';
import { AccountCard } from '@/components/domain/settings/AccountCard';
import { PreferencesCard } from '@/components/domain/settings/PreferencesCard';
import { TagsCard } from '@/components/domain/settings/TagsCard';

export default function SettingsPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-foreground">
                    {microcopy.settings.title}
                </h1>
                <p className="text-muted-foreground">{microcopy.settings.subtitle}</p>
            </div>

            {/* Settings Cards */}
            <div className="space-y-6">
                <AccountCard />
                <PreferencesCard />
                <TagsCard />
            </div>
        </div>
    );
}
