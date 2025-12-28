'use client';

import { getGreeting, microcopy } from '@/lib/microcopy';
import { InputBar } from '@/components/shared/InputBar';
import { useAccountProfile } from '@/lib/hooks/useAccountProfile';
import { Skeleton } from '@/components/ui/skeleton';

// LocalStorage key for draft search query (shared with search page)
const SEARCH_DRAFT_KEY = 'litevault_search_draft';

interface SearchEmptyStateProps {
    onSearch: (query: string) => void;
}

export function SearchEmptyState({ onSearch }: SearchEmptyStateProps) {
    const { profile, isLoading } = useAccountProfile();
    const displayName = profile?.displayName || 'Member';

    // Get saved draft for defaultValue (restore after login redirect)
    const getSavedDraft = (): string => {
        if (typeof window === 'undefined') return '';
        try {
            return localStorage.getItem(SEARCH_DRAFT_KEY) || '';
        } catch {
            return '';
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="space-y-2 mb-8">
                {isLoading ? (
                    <Skeleton className="h-9 w-64 mx-auto" />
                ) : (
                    <h1 className="text-3xl font-semibold text-foreground">
                        {getGreeting(displayName)}
                    </h1>
                )}
                <p className="text-lg text-muted-foreground">
                    {microcopy.search.empty.subtitle}
                </p>
            </div>
            <div className="w-full max-w-xl">
                <InputBar
                    mode="search"
                    placeholder={microcopy.search.empty.placeholder}
                    buttonLabel={microcopy.search.empty.action}
                    onSubmit={onSearch}
                    defaultValue={getSavedDraft()}
                />
            </div>
        </div>
    );
}
