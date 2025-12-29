'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, isUsingRealApi } from '@/lib/api/client';
import type { Tag } from '@/lib/types';

/**
 * Custom hook for debouncing a value.
 */
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

interface UseTagSearchResult {
    tags: Tag[];
    isLoading: boolean;
    isError: boolean;
}

/**
 * Hook for searching tags with debounced backend query.
 * 
 * @param query - Search query string
 * @param options - Configuration options
 * @returns Search results with loading/error states
 */
export function useTagSearch(
    query: string,
    options?: { debounceMs?: number; enabled?: boolean }
): UseTagSearchResult {
    const debounceMs = options?.debounceMs ?? 300;
    const enabled = options?.enabled ?? true;

    const debouncedQuery = useDebounce(query.trim(), debounceMs);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['tags', 'search', debouncedQuery],
        queryFn: async () => {
            const response = await apiClient.getTags({
                q: debouncedQuery || undefined,
                limit: 20,
            });
            return response.tags.map((t) => ({
                id: t.id,
                name: t.name,
                usageCount: t.usageCount,
                lastUsed: t.lastUsed ? new Date(t.lastUsed) : null,
                createdAt: new Date(t.createdAt),
                color: t.color ?? '#6B7280',
            }));
        },
        enabled: enabled && isUsingRealApi,
        staleTime: 60000, // 1 minute
        gcTime: 300000, // 5 minutes (formerly cacheTime)
    });

    return {
        tags: data ?? [],
        isLoading,
        isError,
    };
}
