'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { microcopy } from '@/lib/microcopy';
import { InputBar } from '@/components/shared/InputBar';
import { SearchEmptyState } from '@/components/domain/search/SearchEmptyState';
import { ItemCard } from '@/components/shared/ItemCard';
import { ItemDetailModal } from '@/components/shared/ItemDetailModal';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccountProfile } from '@/lib/hooks/useAccountProfile';
import { apiClient, isUsingRealApi, SearchResponse, SearchResultItem } from '@/lib/api/client';
import type { Item } from '@/lib/types';

type SearchState = 'idle' | 'searching' | 'results' | 'no_results' | 'error';
type SearchMode = 'tag_only' | 'combined';

// LocalStorage key for draft search query
const SEARCH_DRAFT_KEY = 'litevault_search_draft';

/**
 * Convert SearchResultItem to Item for modal display.
 */
function toItem(result: SearchResultItem): Item {
    return {
        id: result.id,
        rawText: result.summary || '', // Use summary as rawText for search results
        title: result.title,
        summary: result.summary,
        tags: result.tags,
        status: 'ARCHIVED', // Search results are always archived items
        sourceType: result.sourceType as 'NOTE' | 'ARTICLE' | undefined,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.createdAt), // Use createdAt as fallback
        confirmedAt: result.confirmedAt ? new Date(result.confirmedAt) : null,
    };
}

export default function SearchPage() {
    const { isSignedIn } = useAccountProfile();
    const router = useRouter();
    const [searchState, setSearchState] = useState<SearchState>('idle');
    const [query, setQuery] = useState('');
    const [searchMode, setSearchMode] = useState<SearchMode>('combined');
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [resultCount, setResultCount] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');

    // Modal state
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);

    const handleSearch = async (searchQuery: string) => {
        const trimmed = searchQuery.trim();

        // Empty query: show empty state, not error
        if (!trimmed) {
            setSearchState('idle');
            return;
        }

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
        setErrorMessage('');

        try {
            if (isUsingRealApi) {
                // Call real API
                const response: SearchResponse = await apiClient.search(searchQuery);

                setSearchMode(response.mode);
                setResults(response.items);
                setResultCount(response.items.length);

                if (response.items.length === 0) {
                    setSearchState('no_results');
                } else {
                    setSearchState('results');
                }
            } else {
                // Mock search for development without backend
                await new Promise((resolve) => setTimeout(resolve, 500));

                // Determine mode from query
                const mode = trimmed.startsWith('#') ? 'tag_only' : 'combined';
                setSearchMode(mode);

                // Mock empty results for now
                setResults([]);
                setResultCount(0);
                setSearchState('no_results');
            }
        } catch (err) {
            console.error('Search failed:', err);
            setErrorMessage(err instanceof Error ? err.message : 'Search failed');
            setSearchState('error');
        }
    };

    const handleClear = () => {
        setQuery('');
        setSearchState('idle');
        setResults([]);
    };

    const handleRetry = () => {
        if (query) {
            handleSearch(query);
        }
    };

    const handleCardClick = (result: SearchResultItem) => {
        setSelectedItem(toItem(result));
    };

    const handleItemUpdate = (updatedItem: Item) => {
        // Update the result in the list
        setResults((prev) =>
            prev.map((r) =>
                r.id === updatedItem.id
                    ? {
                        ...r,
                        title: updatedItem.title,
                        summary: updatedItem.summary,
                        tags: updatedItem.tags,
                    }
                    : r
            )
        );
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

            {/* Search Bar with V1 hint */}
            <div className="space-y-2">
                <InputBar
                    mode="search"
                    placeholder={microcopy.search.query.placeholder}
                    buttonLabel={microcopy.search.action.search}
                    onSubmit={handleSearch}
                    defaultValue={query || getSavedDraft()}
                    disabled={searchState === 'searching'}
                />
                <p className="text-xs text-muted-foreground pl-1">
                    {microcopy.search.query.hint}
                </p>
            </div>

            {/* Loading State - V1: Simple skeleton list */}
            {searchState === 'searching' && (
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">{microcopy.search.loading}</p>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                            <Skeleton className="h-5 w-2/3" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ))}
                </div>
            )}

            {/* Results - Using unified ItemCard */}
            {searchState === 'results' && results.length > 0 && (
                <div className="space-y-4">
                    {/* Mode indicator */}
                    <p className="text-sm text-muted-foreground">
                        {searchMode === 'tag_only'
                            ? microcopy.search.mode.tagOnly
                            : microcopy.search.mode.combined}
                        {' '}({resultCount} items)
                    </p>

                    {/* Results list with clickable cards */}
                    {results.map((result) => (
                        <ItemCard
                            key={result.id}
                            title={result.title || 'Untitled'}
                            summary={result.summary || undefined}
                            tags={result.tags}
                            sourceType={result.sourceType as 'NOTE' | 'ARTICLE' | undefined}
                            showIcon={true}
                            onClick={() => handleCardClick(result)}
                        />
                    ))}
                </div>
            )}

            {/* No Results - V1: Differentiated copy for tag-only vs combined */}
            {searchState === 'no_results' && (
                <div className="text-center py-12 space-y-4">
                    <h2 className="text-xl font-medium text-foreground">
                        {microcopy.search.emptyResults.title}
                    </h2>
                    <p className="text-muted-foreground">
                        {searchMode === 'tag_only'
                            ? microcopy.search.emptyResults.copyTag
                            : microcopy.search.emptyResults.copyCombined}
                    </p>
                    <button
                        onClick={handleClear}
                        className="text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                        {microcopy.search.emptyResults.actionClear}
                    </button>
                </div>
            )}

            {/* Error State */}
            {searchState === 'error' && (
                <div className="text-center py-12 space-y-4">
                    <h2 className="text-xl font-medium text-foreground">
                        {microcopy.search.error.title}
                    </h2>
                    <p className="text-muted-foreground">
                        {errorMessage || microcopy.search.error.copy}
                    </p>
                    <button
                        onClick={handleRetry}
                        className="text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                        {microcopy.search.error.action}
                    </button>
                </div>
            )}

            {/* Item Detail Modal */}
            {selectedItem && (
                <ItemDetailModal
                    isOpen={!!selectedItem}
                    onClose={() => setSelectedItem(null)}
                    item={selectedItem}
                    onUpdate={handleItemUpdate}
                />
            )}
        </div>
    );
}
