'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient, TagResponse, TagsListResponse, isUsingRealApi } from '@/lib/api/client';
import { useAppContext } from '@/lib/store/AppContext';
import type { Tag } from '@/lib/types';

interface UseTagsParams {
    q?: string;
    sort?: 'name' | 'usage' | 'lastUsed';
    unused?: boolean;
}

interface UseTagsResult {
    tags: Tag[];
    total: number;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
    createTag: (name: string) => Promise<void>;
    renameTag: (id: string, name: string) => Promise<void>;
    updateTagColor: (id: string, color: string) => Promise<void>;
    deleteTag: (id: string) => Promise<void>;
    isCreating: boolean;
    isFetching: boolean;
}

// Parse API response to Tag format
function parseTag(tag: TagResponse): Tag {
    return {
        id: tag.id,
        name: tag.name,
        usageCount: tag.usageCount,
        lastUsed: tag.lastUsed ? new Date(tag.lastUsed) : null,
        createdAt: new Date(tag.createdAt),
        color: tag.color ?? '#6B7280',
    };
}

/**
 * Hook for managing tags with TanStack Query.
 */
export function useTags(params?: UseTagsParams): UseTagsResult {
    const queryClient = useQueryClient();
    const { isAuthReady } = useAppContext();

    const {
        data,
        isLoading,
        isError,
        error,
        refetch,
        isFetching,
    } = useQuery({
        queryKey: ['tags', params],
        queryFn: async () => {
            if (!isUsingRealApi) {
                return { tags: [], total: 0 };
            }
            return apiClient.getTags(params);
        },
        enabled: isUsingRealApi && isAuthReady, // Wait for auth before fetching
        staleTime: 30000,
        placeholderData: keepPreviousData, // Keep previous data during refetch
    });


    // Create mutation
    const createMutation = useMutation({
        mutationFn: (name: string) => apiClient.createTag(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] });
        },
    });

    // Rename mutation
    const renameMutation = useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) => apiClient.renameTag(id, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiClient.deleteTag(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] });
        },
    });

    // Update color mutation
    const updateColorMutation = useMutation({
        mutationFn: ({ id, color }: { id: string; color: string }) => apiClient.updateTagColor(id, color),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] });
        },
    });

    const tags: Tag[] = data?.tags.map(parseTag) ?? [];

    return {
        tags,
        total: data?.total ?? 0,
        isLoading,
        isError,
        error: error as Error | null,
        refetch: () => refetch(),
        createTag: async (name: string) => {
            await createMutation.mutateAsync(name);
        },
        renameTag: async (id: string, name: string) => {
            await renameMutation.mutateAsync({ id, name });
        },
        updateTagColor: async (id: string, color: string) => {
            await updateColorMutation.mutateAsync({ id, color });
        },
        deleteTag: async (id: string) => {
            await deleteMutation.mutateAsync(id);
        },
        isCreating: createMutation.isPending,
        isFetching,
    };
}
