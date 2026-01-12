'use client';

/**
 * useEditorSave - Mutation hook for saving item edits
 * 
 * Handles the save API call with optimistic updates and cache invalidation.
 * See: docs/architecture/EDITOR_FIRST_NOTE_API_IMPACT.md
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, UpdateItemResponse } from '@/lib/api/client';
import type { Item, TagInItem } from '@/lib/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateItemPayload {
    type: 'update';
    title?: string;
    originalText?: string;
    addedTagIds?: string[];
    removedTagIds?: string[];
}

export interface ConfirmItemPayload {
    type: 'confirm';
    acceptedSuggestionIds?: string[];
    rejectedSuggestionIds?: string[];
    addedTagIds?: string[];
    title?: string;
    summary?: string;
}

export interface DiscardItemPayload {
    type: 'discard';
}

export type SavePayload = UpdateItemPayload | ConfirmItemPayload | DiscardItemPayload;

export interface UseEditorSaveOptions {
    onSuccess?: (data: UpdateItemResponse) => void;
    onError?: (error: Error) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Calculate tag changes
// ─────────────────────────────────────────────────────────────────────────────

export function calculateTagChanges(
    originalTags: TagInItem[],
    newTagNames: string[],
    availableTags: { id: string; name: string }[]
): { addedTagIds: string[]; removedTagIds: string[] } {
    const originalNames = new Set(originalTags.map((t) => t.name.toLowerCase()));
    const newNames = new Set(newTagNames.map((n) => n.toLowerCase()));

    // Find added tags
    const addedNames = newTagNames.filter(
        (name) => !originalNames.has(name.toLowerCase())
    );
    const addedTagIds = addedNames
        .map((name) => {
            const tag = availableTags.find(
                (t) => t.name.toLowerCase() === name.toLowerCase()
            );
            return tag?.id;
        })
        .filter((id): id is string => !!id);

    // Find removed tags
    const removedTagIds = originalTags
        .filter((t) => !newNames.has(t.name.toLowerCase()))
        .map((t) => t.id);

    return { addedTagIds, removedTagIds };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseEditorSaveResult {
    save: (itemId: string, payload: SavePayload) => Promise<UpdateItemResponse>;
    isPending: boolean;
    isError: boolean;
    error: Error | null;
    reset: () => void;
}

export function useEditorSave(options?: UseEditorSaveOptions): UseEditorSaveResult {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async ({
            itemId,
            payload,
        }: {
            itemId: string;
            payload: SavePayload;
        }): Promise<UpdateItemResponse> => {
            // Dispatch to the appropriate API method based on payload type
            switch (payload.type) {
                case 'update':
                    return apiClient.updateItem(itemId, {
                        title: payload.title,
                        originalText: payload.originalText,
                        // Note: addedTagIds/removedTagIds need to be handled differently
                        // The current updateItem expects 'tags' array, not add/remove lists
                    });

                case 'confirm':
                    return apiClient.confirmItem(itemId, {
                        title: payload.title,
                        summary: payload.summary,
                        acceptedSuggestionIds: payload.acceptedSuggestionIds,
                        rejectedSuggestionIds: payload.rejectedSuggestionIds,
                        addedTagIds: payload.addedTagIds,
                    });

                case 'discard':
                    return apiClient.discardItem(itemId);

                default:
                    throw new Error('Unknown save payload type');
            }
        },
        onSuccess: (data, variables) => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ['item', variables.itemId] });
            queryClient.invalidateQueries({ queryKey: ['library'] });
            queryClient.invalidateQueries({ queryKey: ['search'] });
            queryClient.invalidateQueries({ queryKey: ['pending'] });

            // Call user's onSuccess callback if provided
            if (options?.onSuccess) {
                options.onSuccess(data);
            }
        },
        onError: (error: Error) => {
            if (options?.onError) {
                options.onError(error);
            }
        },
    });

    const save = async (itemId: string, payload: SavePayload): Promise<UpdateItemResponse> => {
        return mutation.mutateAsync({ itemId, payload });
    };

    return {
        save,
        isPending: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        reset: mutation.reset,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationResult {
    isValid: boolean;
    errors: { field: string; message: string }[];
}

export function validateEditorForm(form: {
    title: string;
    originalText: string;
}): ValidationResult {
    const errors: { field: string; message: string }[] = [];

    // Title validation - optional but if present, must be reasonable length
    if (form.title && form.title.length > 200) {
        errors.push({
            field: 'title',
            message: 'Title must be 200 characters or less',
        });
    }

    // Original text validation
    if (!form.originalText.trim()) {
        errors.push({
            field: 'originalText',
            message: 'Content is required',
        });
    } else if (form.originalText.length > 10000) {
        errors.push({
            field: 'originalText',
            message: 'Content must be 10,000 characters or less',
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}
