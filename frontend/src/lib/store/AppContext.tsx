'use client';

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useRef,
    type ReactNode,
} from 'react';
import type { Item, Tag, SearchResult } from '@/lib/types';
import { mockItems, mockTags, mockSearchResult } from '@/lib/fixtures/items';
import { useAuth } from '@clerk/nextjs';
import { apiClient, isUsingRealApi, generateIdempotencyKey, setTokenGetter, isUsingClerkAuth } from '@/lib/api';

interface AppContextType {
    // Pending items
    pendingItems: Item[];
    addPendingItem: (rawText: string, enrich?: boolean) => Promise<void>;
    confirmItem: (id: string, edits?: { title?: string; summary?: string; tags?: string[] }) => Promise<void>;
    discardItem: (id: string) => Promise<void>;
    retryItem: (id: string) => Promise<void>;

    // Library items
    libraryItems: Item[];

    // Search
    searchResult: SearchResult | null;
    setSearchResult: (result: SearchResult | null) => void;
    performSearch: (query: string) => SearchResult | null;

    // Tags
    tags: Tag[];
    addTag: (name: string) => void;
    deleteTag: (id: string) => void;

    // Preferences
    aiSuggestionsEnabled: boolean;
    setAiSuggestionsEnabled: (enabled: boolean) => void;

    // Loading state
    isLoading: boolean;

    // Error state
    error: string | null;
    clearError: () => void;

    // API mode
    isUsingRealApi: boolean;

    // Auth state
    isAuthReady: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Polling interval for pending items (2 seconds)
const POLL_INTERVAL_MS = 2000;

export function AppProvider({ children }: { children: ReactNode }) {
    const [pendingItems, setPendingItems] = useState<Item[]>([]);
    const [libraryItems, setLibraryItems] = useState<Item[]>(
        mockItems.filter((i) => i.status === 'ARCHIVED')
    );
    const [tags, setTags] = useState<Tag[]>([]);
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
    const [aiSuggestionsEnabled, setAiSuggestionsEnabled] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auth readiness state
    // If not using Clerk, we are always ready (using dev ID)
    const [isAuthReady, setIsAuthReady] = useState(!isUsingClerkAuth);

    // Clerk Auth Setup
    const { getToken, isSignedIn, isLoaded } = useAuth();

    useEffect(() => {
        if (!isUsingClerkAuth) return;

        if (isLoaded) {
            if (isSignedIn) {
                // Set up token getter
                setTokenGetter(async () => {
                    return await getToken();
                });
            } else {
                // Clear token getter
                setTokenGetter(async () => null);
            }
            // Mark auth as ready once we've handled the token setup
            setIsAuthReady(true);
        }
    }, [isLoaded, isSignedIn, getToken]);

    // Polling state
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Check if we have items that need polling (ENRICHING status)
    const hasEnrichingItems = pendingItems.some((item) => item.status === 'ENRICHING');

    // Fetch pending items from API
    const fetchPendingItems = useCallback(async () => {
        if (!isUsingRealApi) return;

        try {
            const items = await apiClient.getPendingItems();
            setPendingItems(items);
        } catch (err) {
            console.error('Failed to fetch pending items:', err);
            // Don't set error for polling failures to avoid spamming
        }
    }, []);

    // Start/stop polling based on whether we have ENRICHING items
    useEffect(() => {
        if (!isUsingRealApi || !isAuthReady) return; // Wait for auth

        if (hasEnrichingItems && !pollIntervalRef.current) {
            // Start polling
            pollIntervalRef.current = setInterval(fetchPendingItems, POLL_INTERVAL_MS);
        } else if (!hasEnrichingItems && pollIntervalRef.current) {
            // Stop polling
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [hasEnrichingItems, fetchPendingItems, isAuthReady]);

    // Initial fetch of pending items
    useEffect(() => {
        if (isUsingRealApi && isAuthReady && (isSignedIn || !isUsingClerkAuth)) {
            fetchPendingItems();
        }
    }, [fetchPendingItems, isAuthReady, isSignedIn]);

    // Fetch tags from API
    useEffect(() => {
        if (isUsingRealApi && isAuthReady && (isSignedIn || !isUsingClerkAuth)) {
            apiClient.getTags({ limit: 100 })
                .then((response) => {
                    const parsedTags: Tag[] = response.tags.map((t) => ({
                        id: t.id,
                        name: t.name,
                        usageCount: t.usageCount,
                        lastUsed: t.lastUsed ? new Date(t.lastUsed) : null,
                        createdAt: new Date(t.createdAt),
                        color: t.color ?? '#6B7280',
                    }));
                    setTags(parsedTags);
                })
                .catch((err) => {
                    console.error('Failed to fetch tags:', err);
                    // Keep mockTags as fallback
                });
        }
    }, [isAuthReady, isSignedIn]);

    // Add a new pending item
    const addPendingItem = useCallback(async (rawText: string, enrich?: boolean) => {
        // Use passed enrich value, or fall back to aiSuggestionsEnabled preference
        const shouldEnrich = enrich ?? aiSuggestionsEnabled;

        if (isUsingRealApi) {
            // Real API mode
            try {
                setIsLoading(true);
                clearError();
                const idempotencyKey = generateIdempotencyKey();
                const item = await apiClient.createItem(rawText, idempotencyKey, shouldEnrich);
                setPendingItems((prev) => [item, ...prev]);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to save item';
                setError(message);
                throw err;
            } finally {
                setIsLoading(false);
            }
        } else {
            // Mock mode
            const newItem: Item = {
                id: `item-${Date.now()}`,
                rawText,
                title: null,
                summary: null,
                tags: [],
                status: 'ENRICHING',
                createdAt: new Date(),
                updatedAt: new Date(),
                confirmedAt: null,
            };

            setPendingItems((prev) => [newItem, ...prev]);

            // Simulate AI enrichment after delay
            setTimeout(() => {
                setPendingItems((prev) =>
                    prev.map((item) =>
                        item.id === newItem.id
                            ? {
                                ...item,
                                title: generateMockTitle(rawText),
                                summary: generateMockSummary(rawText),
                                tags: [
                                    { id: 'tag-ideas', name: 'Ideas', color: '#6B7280' },
                                    { id: 'tag-notes', name: 'Notes', color: '#6B7280' },
                                ],
                                status: 'READY_TO_CONFIRM' as const,
                                updatedAt: new Date(),
                            }
                            : item
                    )
                );
            }, 2000);
        }
    }, [clearError, aiSuggestionsEnabled]);

    // Confirm an item (move to library)
    const confirmItem = useCallback(
        async (id: string, edits?: { title?: string; summary?: string; tags?: string[] }) => {
            // Convert string[] to TagInItem[] for internal state
            const tagObjects: import('@/lib/types').TagInItem[] | undefined = edits?.tags?.map(name => ({
                id: '',
                name,
                color: '#6B7280',
            }));
            if (isUsingRealApi) {
                // Real API mode
                try {
                    setIsLoading(true);
                    clearError();
                    await apiClient.confirmItem(id, edits);
                    // Remove from pending
                    const item = pendingItems.find((i) => i.id === id);
                    if (item) {
                        const confirmedItem: Item = {
                            ...item,
                            status: 'ARCHIVED',
                            tags: tagObjects || item.tags,
                            confirmedAt: new Date(),
                            updatedAt: new Date(),
                        };
                        setLibraryItems((prev) => [confirmedItem, ...prev]);
                    }
                    setPendingItems((prev) => prev.filter((i) => i.id !== id));
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'Failed to confirm item';
                    setError(message);
                    throw err;
                } finally {
                    setIsLoading(false);
                }
            } else {
                // Mock mode
                const item = pendingItems.find((i) => i.id === id);
                if (item) {
                    const confirmedItem: Item = {
                        ...item,
                        status: 'ARCHIVED',
                        tags: tagObjects || item.tags,
                        confirmedAt: new Date(),
                        updatedAt: new Date(),
                    };
                    setLibraryItems((prev) => [confirmedItem, ...prev]);
                    setPendingItems((prev) => prev.filter((i) => i.id !== id));
                }
            }
        },
        [pendingItems, clearError]
    );

    // Discard an item
    const discardItem = useCallback(
        async (id: string) => {
            if (isUsingRealApi) {
                // Real API mode
                try {
                    setIsLoading(true);
                    clearError();
                    await apiClient.discardItem(id);
                    setPendingItems((prev) => prev.filter((i) => i.id !== id));
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'Failed to discard item';
                    setError(message);
                    throw err;
                } finally {
                    setIsLoading(false);
                }
            } else {
                // Mock mode
                setPendingItems((prev) => prev.filter((i) => i.id !== id));
            }
        },
        [clearError]
    );

    // Retry a failed item
    const retryItem = useCallback(
        async (id: string) => {
            if (isUsingRealApi) {
                // Real API mode
                try {
                    setIsLoading(true);
                    clearError();
                    await apiClient.retryItem(id);
                    // Update status optimistically
                    setPendingItems((prev) =>
                        prev.map((item) =>
                            item.id === id
                                ? { ...item, status: 'ENRICHING' as const, updatedAt: new Date() }
                                : item
                        )
                    );
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'Failed to retry item';
                    setError(message);
                    throw err;
                } finally {
                    setIsLoading(false);
                }
            } else {
                // Mock mode
                setPendingItems((prev) =>
                    prev.map((item) =>
                        item.id === id
                            ? { ...item, status: 'ENRICHING' as const, updatedAt: new Date() }
                            : item
                    )
                );

                // Simulate retry
                setTimeout(() => {
                    setPendingItems((prev) =>
                        prev.map((item) =>
                            item.id === id
                                ? {
                                    ...item,
                                    title: generateMockTitle(item.rawText),
                                    summary: generateMockSummary(item.rawText),
                                    tags: [{ id: 'tag-ideas', name: 'Ideas', color: '#6B7280' }],
                                    status: 'READY_TO_CONFIRM' as const,
                                    updatedAt: new Date(),
                                }
                                : item
                        )
                    );
                }, 2000);
            }
        },
        [clearError]
    );

    // Perform search (mock only for now)
    const performSearch = useCallback((query: string): SearchResult | null => {
        if (!query.trim()) return null;
        // Return mock search result
        return mockSearchResult;
    }, []);

    // Add a new tag (mock only for now)
    const addTag = useCallback((name: string) => {
        const newTag: Tag = {
            id: `tag-${Date.now()}`,
            name,
            usageCount: 0,
            lastUsed: null,
            createdAt: new Date(),
        };
        setTags((prev) => [newTag, ...prev]);
    }, []);

    // Delete a tag (mock only for now)
    const deleteTag = useCallback((id: string) => {
        setTags((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <AppContext.Provider
            value={{
                pendingItems,
                addPendingItem,
                confirmItem,
                discardItem,
                retryItem,
                libraryItems,
                searchResult,
                setSearchResult,
                performSearch,
                tags,
                addTag,
                deleteTag,
                aiSuggestionsEnabled,
                setAiSuggestionsEnabled,
                isLoading,
                error,
                clearError,
                isUsingRealApi,
                isAuthReady,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
}

// Helper functions for mock data generation
function generateMockTitle(text: string): string {
    const words = text.split(' ').slice(0, 6);
    return words.join(' ') + (text.split(' ').length > 6 ? '...' : '');
}

function generateMockSummary(text: string): string {
    if (text.length > 150) {
        return text.substring(0, 150) + '...';
    }
    return text;
}
