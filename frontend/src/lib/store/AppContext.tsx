'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Item, Tag, SearchResult } from '@/lib/types';
import { mockItems, mockTags, mockSearchResult } from '@/lib/fixtures/items';

interface AppContextType {
    // Pending items
    pendingItems: Item[];
    addPendingItem: (rawText: string) => void;
    confirmItem: (id: string) => void;
    discardItem: (id: string) => void;
    retryItem: (id: string) => void;

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [pendingItems, setPendingItems] = useState<Item[]>([]);
    const [libraryItems, setLibraryItems] = useState<Item[]>(mockItems.filter(i => i.status === 'ARCHIVED'));
    const [tags, setTags] = useState<Tag[]>(mockTags);
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
    const [aiSuggestionsEnabled, setAiSuggestionsEnabled] = useState(true);
    const [isLoading] = useState(false);

    // Add a new pending item
    const addPendingItem = useCallback((rawText: string) => {
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
                            tags: ['Ideas', 'Notes'],
                            status: 'READY_TO_CONFIRM' as const,
                            updatedAt: new Date(),
                        }
                        : item
                )
            );
        }, 2000);
    }, []);

    // Confirm an item (move to library)
    const confirmItem = useCallback((id: string) => {
        const item = pendingItems.find((i) => i.id === id);
        if (item) {
            const confirmedItem: Item = {
                ...item,
                status: 'ARCHIVED',
                confirmedAt: new Date(),
                updatedAt: new Date(),
            };
            setLibraryItems((prev) => [confirmedItem, ...prev]);
            setPendingItems((prev) => prev.filter((i) => i.id !== id));
        }
    }, [pendingItems]);

    // Discard an item
    const discardItem = useCallback((id: string) => {
        setPendingItems((prev) => prev.filter((i) => i.id !== id));
    }, []);

    // Retry a failed item
    const retryItem = useCallback((id: string) => {
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
                            tags: ['Ideas'],
                            status: 'READY_TO_CONFIRM' as const,
                            updatedAt: new Date(),
                        }
                        : item
                )
            );
        }, 2000);
    }, []);

    // Perform search
    const performSearch = useCallback((query: string): SearchResult | null => {
        if (!query.trim()) return null;
        // Return mock search result
        return mockSearchResult;
    }, []);

    // Add a new tag
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

    // Delete a tag
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
