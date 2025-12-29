'use client';

import { microcopy } from '@/lib/microcopy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAccountProfile } from '@/lib/hooks/useAccountProfile';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

// Language options
const LANGUAGES = [
    { value: 'en', label: 'English (US)' },
    { value: 'zh', label: '中文 (简体)' },
];

// Common timezone options
const TIMEZONES = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (US)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Asia/Shanghai', label: 'Shanghai' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Australia/Sydney', label: 'Sydney' },
];

export function PreferencesCard() {
    const {
        profile,
        isLoading,
        isSignedIn,
        updatePreferences,
        isUpdatingPreferences,
        error,
        refetch
    } = useAccountProfile();

    const handleLanguageChange = async (value: string) => {
        try {
            await updatePreferences({ defaultLanguage: value });
            toast.success('Language updated');
        } catch {
            toast.error('Failed to update language');
        }
    };

    const handleTimezoneChange = async (value: string) => {
        try {
            await updatePreferences({ timezone: value });
            toast.success('Timezone updated');
        } catch {
            toast.error('Failed to update timezone');
        }
    };

    const handleAiToggle = async (checked: boolean) => {
        try {
            await updatePreferences({ aiSuggestionsEnabled: checked });
            toast.success(checked ? 'AI suggestions enabled' : 'AI suggestions disabled');
        } catch {
            toast.error('Failed to update AI suggestions setting');
        }
    };

    // Loading state
    if (isLoading || !isSignedIn) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{microcopy.settings.section.preferences}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-6 w-10" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{microcopy.settings.section.preferences}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                        Failed to load preferences.
                        <Button
                            variant="link"
                            className="text-destructive p-0 h-auto ml-2"
                            onClick={() => refetch()}
                        >
                            {microcopy.common.retry}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const preferences = profile?.preferences;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{microcopy.settings.section.preferences}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Language */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">
                        {microcopy.settings.preferences.defaultLanguage}
                    </span>
                    <Select
                        value={preferences?.defaultLanguage || 'en'}
                        onValueChange={handleLanguageChange}
                        disabled={isUpdatingPreferences}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {LANGUAGES.map((lang) => (
                                <SelectItem key={lang.value} value={lang.value}>
                                    {lang.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Timezone */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">
                        {microcopy.settings.preferences.timezone}
                    </span>
                    <Select
                        value={preferences?.timezone || 'UTC'}
                        onValueChange={handleTimezoneChange}
                        disabled={isUpdatingPreferences}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {TIMEZONES.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                    {tz.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
    );
}
