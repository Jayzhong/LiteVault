'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { microcopy } from '@/lib/microcopy';
import { InputBar } from '@/components/shared/InputBar';
import { AnswerCard } from '@/components/domain/search/AnswerCard';
import { EvidenceGrid } from '@/components/domain/search/EvidenceGrid';
import { SearchEmptyState } from '@/components/domain/search/SearchEmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppContext } from '@/lib/store/AppContext';
import { useAccountProfile } from '@/lib/hooks/useAccountProfile';

type SearchState = 'idle' | 'searching' | 'results' | 'no_results' | 'error';

// LocalStorage key for draft search query
const SEARCH_DRAFT_KEY = 'litevault_search_draft';

export default function SearchPage() {
    const { performSearch, searchResult, setSearchResult } = useAppContext();
    const { isSignedIn } = useAccountProfile();
    const router = useRouter();
    const [searchState, setSearchState] = useState<SearchState>('idle');
    const [query, setQuery] = useState('');

    const handleSearch = async (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        // If signed out, save draft and redirect to login
        if (!isSignedIn) {
            try {
                localStorage.setItem(SEARCH_DRAFT_KEY, searchQuery);
            } catch {
                // Silently fail if localStorage is not available
            }
            router.push('/auth/login?redirect_url=/search');
            return;
        }

        // Clear any saved draft
        try {
            localStorage.removeItem(SEARCH_DRAFT_KEY);
        } catch {
            // Silently fail
        }

        setQuery(searchQuery);
        setSearchState('searching');

        // Simulate search delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const result = performSearch(searchQuery);
        if (result) {
            setSearchResult(result);
            setSearchState('results');
        } else {
            setSearchState('no_results');
        }
    };

    const handleRetry = () => {
        if (query) {
            handleSearch(query);
        }
    };

    // Get saved draft for defaultValue
    const getSavedDraft = (): string => {
        if (typeof window === 'undefined') return '';
        try {
            return localStorage.getItem(SEARCH_DRAFT_KEY) || '';
        } catch {
            return '';
        }
    };

    // Empty/idle state
    if (searchState === 'idle') {
        return <SearchEmptyState onSearch={handleSearch} />;
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <h1 className="text-2xl font-semibold text-foreground">
                {microcopy.search.title}
            </h1>

            {/* Search Bar */}
            <InputBar
                mode="search"
                placeholder={microcopy.search.query.placeholder}
                buttonLabel={microcopy.search.action.ask}
                onSubmit={handleSearch}
                defaultValue={query || getSavedDraft()}
                disabled={searchState === 'searching'}
            />

            {/* Loading State */}
            {searchState === 'searching' && (
                <div className="space-y-6">
                    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-5 w-full" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Results */}
            {searchState === 'results' && searchResult && (
                <div className="space-y-8">
                    <AnswerCard answer={searchResult.answer} />
                    <EvidenceGrid evidence={searchResult.evidence} totalSources={searchResult.totalSources} />
                </div>
            )}

            {/* No Results */}
            {searchState === 'no_results' && (
                <div className="text-center py-12 space-y-4">
                    <h2 className="text-xl font-medium text-foreground">
                        {microcopy.search.emptyResults.title}
                    </h2>
                    <p className="text-muted-foreground">
                        {microcopy.search.emptyResults.copy}
                    </p>
                </div>
            )}

            {/* Error State */}
            {searchState === 'error' && (
                <div className="text-center py-12 space-y-4">
                    <h2 className="text-xl font-medium text-foreground">
                        {microcopy.search.error.title}
                    </h2>
                    <p className="text-muted-foreground">{microcopy.search.error.copy}</p>
                    <button
                        onClick={handleRetry}
                        className="text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                        {microcopy.search.error.action}
                    </button>
                </div>
            )}
        </div>
    );
}
