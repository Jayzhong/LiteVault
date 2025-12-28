'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, LibraryResponse, isUsingRealApi } from '@/lib/api/client';
import type { Item } from '@/lib/types';

// Result type for useLibrary hook
interface UseLibraryResult {
    items: Item[];
    isLoading: boolean;
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

    const {
        data,
        isLoading,
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
        enabled: isUsingRealApi,
        staleTime: 30000, // 30 seconds
    });

    // Flatten all pages into a single items array
    const items: Item[] = data?.pages.flatMap(
        page => page.items.map(parseLibraryItem)
    ) ?? [];

    return {
        items,
        isLoading,
        isError,
        error: error as Error | null,
        hasMore: hasNextPage ?? false,
        fetchNextPage: () => fetchNextPage(),
        isFetchingNextPage,
        refetch: () => refetch(),
    };
}
