'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/lib/store/AppContext';
import { apiClient, LibraryResponse, isUsingRealApi } from '@/lib/api/client';
import type { Item } from '@/lib/types';

// Result type for useLibrary hook
interface UseLibraryResult {
    items: Item[];
    isLoading: boolean;
    isFetching: boolean;  // Added to track any fetching state
    isError: boolean;
    error: Error | null;
    hasMore: boolean;
    fetchNextPage: () => void;
    isFetchingNextPage: boolean;
    refetch: () => void;
}

// Parse API response to Item format
function parseLibraryItem(item: LibraryResponse['items'][0]): Item {
    return {
        id: item.id,
        rawText: item.rawText,
        title: item.title,
        summary: item.summary,
        tags: item.tags,
        status: item.status as Item['status'],
        sourceType: item.sourceType as Item['sourceType'],
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.createdAt), // Not in response, use createdAt
        confirmedAt: item.confirmedAt ? new Date(item.confirmedAt) : null,
    };
}

/**
 * Hook for fetching library items with cursor pagination.
 * Uses TanStack Query for caching, pagination, and loading states.
 */
export function useLibrary(): UseLibraryResult {
    const queryClient = useQueryClient();
    /*
     * We need to wait for auth to be fully ready (including token setup)
     * before we enable the query, otherwise we get 401s and retry delays.
     * isAuthReady from AppContext handles this check.
     */
    const { isAuthReady } = useAppContext();

    const {
        data,
        isLoading: isQueryLoading,
        isPending,
        isFetching,  // Track any fetching state
        isError,
        error,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
        refetch,
    } = useInfiniteQuery({
        queryKey: ['library'],
        queryFn: async ({ pageParam }) => {
            if (!isUsingRealApi) {
                // Return empty for mock mode
                return { items: [], pagination: { cursor: null, hasMore: false } };
            }
            return apiClient.getLibrary(pageParam as string | undefined);
        },
        getNextPageParam: (lastPage) => {
            return lastPage.pagination.hasMore ? lastPage.pagination.cursor : undefined;
        },
        initialPageParam: undefined as string | undefined,
        // If using real API, wait for auth. If mock, run immediately (returns empty).
        enabled: isUsingRealApi ? isAuthReady : true,
        staleTime: 30000, // 30 seconds
    });

    // Flatten all pages into a single items array
    const items: Item[] = data?.pages.flatMap(
        page => page.items.map(parseLibraryItem)
    ) ?? [];

    // In React Query v5, isLoading is false if enabled is false (query disabled).
    // We want to report loading if we are waiting for auth OR if the query is actually loading.
    const effectiveIsLoading = (isPending && !isError) || (!isAuthReady && isUsingRealApi);

    return {
        items,
        isLoading: effectiveIsLoading,
        isFetching,  // Return fetching state
        isError,
        error: error as Error | null,
        hasMore: hasNextPage ?? false,
        fetchNextPage: () => fetchNextPage(),
        isFetchingNextPage,
        refetch: () => refetch(),
    };
}


