'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { microcopy, getGreeting } from '@/lib/microcopy';
import { InputBar } from '@/components/shared/InputBar';
import { SearchEmptyState } from '@/components/domain/search/SearchEmptyState';
import { ItemCard } from '@/components/shared/ItemCard';
import { ItemDetailEditor } from '@/components/domain/editor';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccountProfile } from '@/lib/hooks/useAccountProfile';
import { apiClient, isUsingRealApi, SearchResponse, SearchResultItem } from '@/lib/api/client';
import type { Item } from '@/lib/types';
import { Hash, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagPicker } from '@/components/shared/TagPicker';
import { useTagSearch } from '@/lib/hooks/useTagSearch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
        status: 'ARCHIVED',
        sourceType: result.sourceType as 'NOTE' | 'ARTICLE' | undefined,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.createdAt),
        confirmedAt: result.confirmedAt ? new Date(result.confirmedAt) : null,
        attachmentCount: result.attachmentCount,
    };
}

export default function SearchPage() {
    const { isSignedIn, profile } = useAccountProfile();
    const router = useRouter();
    const [searchState, setSearchState] = useState<SearchState>('idle');
    const [query, setQuery] = useState('');
    const [searchMode, setSearchMode] = useState<SearchMode>('combined');
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [resultCount, setResultCount] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');

    // Tag Popover State
    const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
    // Derived query for tag search (after the '#')
    const tagSearchQuery = query.startsWith('#') ? query.slice(1) : '';

    const { tags: suggestedTags, isLoading: isTagsLoading } = useTagSearch(tagSearchQuery, {
        enabled: query.startsWith('#'),
        debounceMs: 250,
    });

    const [selectedItem, setSelectedItem] = useState<Item | null>(null);

    // Initial draft load
    useEffect(() => {
        const saved = localStorage.getItem(SEARCH_DRAFT_KEY);
        if (saved) {
            setQuery(saved);
            // Optionally auto-search? Let's just restore text for V1
        }
    }, []);

    const handleSearch = async (searchQuery: string) => {
        const trimmed = searchQuery.trim();
        setIsTagPopoverOpen(false); // Close popover on submit

        if (!trimmed) {
            setSearchState('idle');
            return;
        }

        if (!isSignedIn) {
            try { localStorage.setItem(SEARCH_DRAFT_KEY, searchQuery); } catch { }
            router.push('/auth/login?redirect_url=/search');
            return;
        }

        try { localStorage.removeItem(SEARCH_DRAFT_KEY); } catch { }

        setQuery(searchQuery);
        setSearchState('searching');
        setErrorMessage('');

        try {
            if (isUsingRealApi) {
                const response: SearchResponse = await apiClient.search(searchQuery);
                setSearchMode(response.mode);
                setResults(response.items);
                setResultCount(response.items.length);
                setSearchState(response.items.length === 0 ? 'no_results' : 'results');
            } else {
                // Mock behavior
                await new Promise((resolve) => setTimeout(resolve, 500));
                const mode = trimmed.startsWith('#') ? 'tag_only' : 'combined';
                setSearchMode(mode);
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

    const handleTagChipClick = () => {
        if (!query.startsWith('#')) {
            setQuery('#');
        }
        // Focus is handled by InputBar usually, but here we just ensure state triggers popover
        setIsTagPopoverOpen(true);
    };

    const handleTagSelect = (tagName: string) => {
        const newQuery = `#${tagName}`;
        setQuery(newQuery);
        setIsTagPopoverOpen(false);
        // Optional: Auto-search on tag select?
        // handleSearch(newQuery); 
    };

    // Open popover if typing #...
    useEffect(() => {
        if (query.startsWith('#') && query.length > 1) {
            setIsTagPopoverOpen(true);
        } else if (!query.startsWith('#')) {
            setIsTagPopoverOpen(false);
        }
    }, [query]);

    // ... handlers (Clear, Retry, CardClick, ItemUpdate) ...
    const handleClear = () => { setQuery(''); setSearchState('idle'); setResults([]); };
    const handleRetry = () => { if (query) handleSearch(query); };
    const handleCardClick = (result: SearchResultItem) => setSelectedItem(toItem(result));
    const handleItemUpdate = (updatedItem: Item) => {
        setResults((prev) => prev.map((r) => r.id === updatedItem.id ? { ...r, title: updatedItem.title, summary: updatedItem.summary, tags: updatedItem.tags } : r));
    };

    // Typography alignment with Home (text-4xl bold for greeting)
    const displayName = profile?.displayName || 'Member';

    if (searchState === 'idle') {
        // Replicating Home Hero for empty state consistency
        return (
            <div className="space-y-12 py-10">
                <div className="text-center space-y-3">
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">
                        {getGreeting(displayName)}
                    </h1>
                    <p className="text-lg text-muted-foreground font-light">
                        {microcopy.search.empty.subtitle}
                    </p>
                </div>
                <div className="max-w-2xl mx-auto space-y-2">
                    <div className="relative">
                        <InputBar
                            mode="search"
                            placeholder={microcopy.search.query.placeholder}
                            buttonLabel={microcopy.search.action.search}
                            onSubmit={handleSearch}
                            value={query}
                            onChange={setQuery}
                            endAdornment={
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleTagChipClick}
                                    className="h-7 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                                >
                                    {microcopy.search.query.tagChip}
                                </Button>
                            }
                        />
                        {/* Tag Suggestions Popover Layer */}
                        {isTagPopoverOpen && query.startsWith('#') && (
                            <div className="absolute top-full left-0 w-full mt-2 p-2 bg-popover border border-border rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
                                {isTagsLoading ? (
                                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        <span>Loading tags...</span>
                                    </div>
                                ) : suggestedTags.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                                        {suggestedTags.map(tag => (
                                            <button
                                                key={tag.id}
                                                onClick={() => handleTagSelect(tag.name)}
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm text-left transition-colors group"
                                            >
                                                <div className="h-2 w-2 rounded-full bg-primary/40 group-hover:bg-primary" />
                                                <span className="truncate text-foreground">{tag.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-4 text-center text-sm text-muted-foreground">
                                        No matching tags found.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground pl-1 text-center">
                        {microcopy.search.query.hint}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header - Compact for results view */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-foreground">
                    {microcopy.search.title}
                </h1>
            </div>

            {/* Search Input Bar (same logic as empty state) */}
            <div className="relative max-w-3xl">
                <InputBar
                    mode="search"
                    placeholder={microcopy.search.query.placeholder}
                    buttonLabel={microcopy.search.action.search}
                    onSubmit={handleSearch}
                    value={query}
                    onChange={setQuery}
                    disabled={searchState === 'searching'}
                    endAdornment={
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleTagChipClick}
                            className="h-7 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                        >
                            {microcopy.search.query.tagChip}
                        </Button>
                    }
                />
                {/* Tag Suggestions Popover Layer */}
                {isTagPopoverOpen && query.startsWith('#') && (
                    <div className="absolute top-full left-0 w-full mt-2 p-2 bg-popover border border-border rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
                        {isTagsLoading ? (
                            <div className="flex items-center justify-center py-4 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span>Loading tags...</span>
                            </div>
                        ) : suggestedTags.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                                {suggestedTags.map(tag => (
                                    <button
                                        key={tag.id}
                                        onClick={() => handleTagSelect(tag.name)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm text-left transition-colors group"
                                    >
                                        <div className="h-2 w-2 rounded-full bg-primary/40 group-hover:bg-primary" />
                                        <span className="truncate text-foreground">{tag.name}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="py-4 text-center text-sm text-muted-foreground">
                                No matching tags found.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Rest of the UI (Loading, Results, Error) - preserved layout */}
            {searchState === 'searching' && (
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">{microcopy.search.loading}</p>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-xl border border-transparent bg-white shadow-sm p-4 space-y-3">
                            <Skeleton className="h-5 w-2/3" />
                            <Skeleton className="h-4 w-full" />
                        </div> // Simplified skeleton
                    ))}
                </div>
            )}

            {searchState === 'results' && results.length > 0 && (
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        {searchMode === 'tag_only' ? microcopy.search.mode.tagOnly : microcopy.search.mode.combined}
                        {' '}({resultCount} items)
                    </p>
                    {results.map((result) => (
                        <ItemCard
                            key={result.id}
                            title={result.title || 'Untitled'}
                            summary={result.summary || undefined}
                            tags={result.tags}
                            sourceType={result.sourceType as 'NOTE' | 'ARTICLE' | undefined}
                            attachmentCount={result.attachmentCount}
                            showIcon={true}
                            onClick={() => handleCardClick(result)}
                        />
                    ))}
                </div>
            )}

            {/* No Results & Error States with primary colors */}
            {searchState === 'no_results' && (
                <div className="text-center py-12 space-y-4">
                    <h2 className="text-xl font-medium text-foreground">{microcopy.search.emptyResults.title}</h2>
                    <p className="text-muted-foreground">
                        {searchMode === 'tag_only' ? microcopy.search.emptyResults.copyTag : microcopy.search.emptyResults.copyCombined}
                    </p>
                    <button onClick={handleClear} className="text-primary hover:text-primary/80 font-medium">
                        {microcopy.search.emptyResults.actionClear}
                    </button>
                </div>
            )}

            {searchState === 'error' && (
                <div className="text-center py-12 space-y-4">
                    <h2 className="text-xl font-medium text-foreground">{microcopy.search.error.title}</h2>
                    <p className="text-muted-foreground">{errorMessage || microcopy.search.error.copy}</p>
                    <button onClick={handleRetry} className="text-primary hover:text-primary/80 font-medium">
                        {microcopy.search.error.action}
                    </button>
                </div>
            )}

            {selectedItem && (
                <ItemDetailEditor
                    isOpen={!!selectedItem}
                    onClose={() => setSelectedItem(null)}
                    item={selectedItem}
                    onUpdate={handleItemUpdate}
                />
            )}
        </div>
    );
}
