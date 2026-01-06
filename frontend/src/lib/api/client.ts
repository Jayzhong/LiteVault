/**
 * API Client for LiteVault backend.
 * 
 * Feature flags:
 * - NEXT_PUBLIC_USE_REAL_API: true to call real backend
 * - NEXT_PUBLIC_USE_CLERK_AUTH: true to use Clerk token auth
 */

import { toast } from 'sonner';
import { Item, ItemStatus, TagInItem, SuggestedTag } from '@/lib/types';

// Environment configuration
const USE_REAL_API = process.env.NEXT_PUBLIC_USE_REAL_API === 'true';
const USE_CLERK_AUTH = process.env.NEXT_PUBLIC_USE_CLERK_AUTH === 'true';
// Empty string = same-origin (production via reverse proxy)
// Explicit URL = cross-origin (local dev pointing to backend)
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user-001';

// Error response type from API
export interface ApiError {
    error: {
        code: string;
        message: string;
        requestId: string;
        details?: Record<string, unknown>;
    };
}

// API response types
export interface CreateItemResponse {
    id: string;
    rawText: string;
    title: string | null;
    summary: string | null;
    tags: TagInItem[];
    suggestedTags?: SuggestedTag[];
    status: ItemStatus;
    sourceType: string | null;
    createdAt: string;
    updatedAt: string;
    confirmedAt: string | null;
}

export interface PendingItemsResponse {
    items: CreateItemResponse[];
    total: number;
}

export interface UpdateItemResponse {
    id: string;
    status: string;
    title?: string | null;
    summary?: string | null;
    tags?: TagInItem[];
    updatedAt: string;
    confirmedAt?: string | null;
}

export interface RetryResponse {
    id: string;
    status: string;
    updatedAt: string;
}

export interface LibraryItemResponse {
    id: string;
    rawText: string;
    title: string | null;
    summary: string | null;
    tags: TagInItem[];
    status: string;
    sourceType: string | null;
    createdAt: string;
    confirmedAt: string | null;
    attachmentCount?: number;
}

export interface LibraryResponse {
    items: LibraryItemResponse[];
    pagination: {
        cursor: string | null;
        hasMore: boolean;
    };
}

export interface TagResponse {
    id: string;
    name: string;
    usageCount: number;
    lastUsed: string | null;
    createdAt: string;
    color?: string; // Hex color code
}

export interface TagsListResponse {
    tags: TagResponse[];
    total: number;
}

// Search V1 API types
export interface SearchResultItem {
    id: string;
    title: string | null;
    summary: string | null;
    tags: TagInItem[];
    sourceType: string | null;
    confirmedAt: string | null;
    createdAt: string;
    attachmentCount?: number;
}

export interface SearchResponse {
    items: SearchResultItem[];
    mode: 'tag_only' | 'combined';
    pagination: {
        cursor: string | null;
        hasMore: boolean;
    };
    total: number | null;
}

// Helper to convert API dates to Date objects
function parseApiItem(item: CreateItemResponse): Item {
    return {
        id: item.id,
        rawText: item.rawText,
        title: item.title,
        summary: item.summary,
        tags: item.tags,
        suggestedTags: item.suggestedTags || [],
        status: item.status,
        sourceType: item.sourceType as 'NOTE' | 'ARTICLE' | undefined,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        confirmedAt: item.confirmedAt ? new Date(item.confirmedAt) : null,
        attachmentCount: (item as unknown as { attachmentCount?: number }).attachmentCount,
    };
}

// Generate idempotency key
export function generateIdempotencyKey(): string {
    return crypto.randomUUID();
}

// Token getter function - to be set by useClerkToken hook
let tokenGetter: (() => Promise<string | null>) | null = null;

/**
 * Set the token getter function for Clerk auth.
 * This should be called once from a hook that has access to useAuth().
 */
export function setTokenGetter(getter: () => Promise<string | null>): void {
    tokenGetter = getter;
}

/**
 * Get authentication headers for API calls.
 * Used by direct fetch calls (e.g., in useUpload hook).
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    if (USE_CLERK_AUTH && tokenGetter) {
        try {
            const token = await tokenGetter();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        } catch (err) {
            console.warn('Failed to get Clerk token:', err);
        }
    }

    // Fallback to dev user ID if no token and not using Clerk
    if (!USE_CLERK_AUTH || !headers['Authorization']) {
        headers['X-Dev-User-Id'] = DEV_USER_ID;
    }

    return headers;
}

class ApiClient {
    private baseUrl: string;
    private devUserId: string;

    constructor() {
        this.baseUrl = API_BASE_URL;
        this.devUserId = DEV_USER_ID;
    }

    private async fetch<T>(
        path: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${path}`;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        // Add auth header
        if (USE_CLERK_AUTH && tokenGetter) {
            try {
                const token = await tokenGetter();
                if (token) {
                    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
                }
            } catch (err) {
                console.warn('Failed to get Clerk token:', err);
            }
        }

        // Fallback to dev user ID if no token and not using Clerk
        if (!USE_CLERK_AUTH || !(headers as Record<string, string>)['Authorization']) {
            (headers as Record<string, string>)['X-Dev-User-Id'] = this.devUserId;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        // Get request ID from response for debugging
        const requestId = response.headers.get('X-Request-Id');

        if (!response.ok) {
            const errorData = await response.json() as ApiError;
            const error = new Error(errorData.error.message) as Error & {
                code: string;
                requestId: string;
                details?: Record<string, unknown>;
            };
            error.code = errorData.error.code;
            error.requestId = errorData.error.requestId || requestId || 'unknown';
            error.details = errorData.error.details;

            // Handle Rate Limiting (429) - Global Toast
            if (response.status === 429) {
                if (error.code === 'DAILY_QUOTA_EXCEEDED') {
                    toast.error("Daily AI limit reached. Upgrade to Pro for more.");
                } else if (error.code === 'CONCURRENCY_LIMIT_EXCEEDED') {
                    toast.error("Too many requests. Please wait a moment.");
                } else {
                    toast.error("Too many requests. Please try again later.");
                }
            }

            throw error;
        }

        // Handle 204 No Content (e.g., DELETE responses)
        if (response.status === 204) {
            return undefined as T;
        }

        return response.json() as Promise<T>;
    }

    /**
     * Create a new item (POST /items)
     * @param rawText - The text content
     * @param idempotencyKey - Optional idempotency key
     * @param enrich - If true (default), triggers AI enrichment. If false, saves directly to ARCHIVED.
     * @param tagIds - Optional array of tag UUIDs to associate (used with enrich=false)
     */
    async createItem(
        rawText: string,
        idempotencyKey?: string,
        enrich: boolean = true,
        tagIds: string[] = []
    ): Promise<Item> {
        const headers: HeadersInit = {};
        if (idempotencyKey) {
            headers['Idempotency-Key'] = idempotencyKey;
        }

        const response = await this.fetch<CreateItemResponse>('/api/v1/items', {
            method: 'POST',
            headers,
            body: JSON.stringify({ rawText, enrich, tagIds }),
        });

        return parseApiItem(response);
    }

    /**
     * Get pending items (GET /items/pending)
     */
    async getPendingItems(): Promise<Item[]> {
        const response = await this.fetch<PendingItemsResponse>('/api/v1/items/pending');
        return response.items.map(parseApiItem);
    }

    /**
     * Get item by ID (GET /items/:id)
     */
    async getItem(id: string): Promise<Item> {
        const response = await this.fetch<CreateItemResponse>(`/api/v1/items/${id}`);
        return parseApiItem(response);
    }

    /**
     * Confirm item (PATCH /items/:id with action=confirm)
     * Optionally pass title, summary, tags to edit before confirming.
     */
    /**
     * Confirm item (PATCH /items/:id with action=confirm)
     */
    async confirmItem(
        id: string,
        data?: {
            title?: string;
            summary?: string;
            tags?: string[]; // Legacy: simple tag names
            acceptedSuggestionIds?: string[];
            rejectedSuggestionIds?: string[];
            addedTagIds?: string[];
        }
    ): Promise<UpdateItemResponse> {
        return this.fetch<UpdateItemResponse>(`/api/v1/items/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                action: 'confirm',
                title: data?.title,
                summary: data?.summary,
                tags: data?.tags,
                acceptedSuggestionIds: data?.acceptedSuggestionIds,
                rejectedSuggestionIds: data?.rejectedSuggestionIds,
                addedTagIds: data?.addedTagIds,
            }),
        });
    }

    /**
     * Discard item (PATCH /items/:id with action=discard)
     */
    async discardItem(id: string): Promise<UpdateItemResponse> {
        return this.fetch<UpdateItemResponse>(`/api/v1/items/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ action: 'discard' }),
        });
    }

    /**
     * Update item fields (PATCH /items/:id without action).
     * Used for editing title, summary, tags on archived items.
     */
    /**
     * Update item fields (PATCH /items/:id without action).
     * Used for editing title, summary, tags, originalText on archived items.
     */
    async updateItem(
        id: string,
        updates: {
            title?: string;
            summary?: string;
            tags?: string[];
            originalText?: string;
        }
    ): Promise<UpdateItemResponse> {
        return this.fetch<UpdateItemResponse>(`/api/v1/items/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
    }

    /**
     * Retry failed enrichment (POST /items/:id/retry)
     */
    async retryItem(id: string): Promise<RetryResponse> {
        return this.fetch<RetryResponse>(`/api/v1/items/${id}/retry`, {
            method: 'POST',
        });
    }

    /**
     * Get library items (GET /library)
     */
    async getLibrary(cursor?: string, limit: number = 20): Promise<LibraryResponse> {
        const params = new URLSearchParams();
        if (cursor) params.set('cursor', cursor);
        params.set('limit', limit.toString());
        const queryString = params.toString();
        return this.fetch<LibraryResponse>(`/api/v1/library?${queryString}`);
    }

    /**
     * Get tags (GET /tags)
     */
    async getTags(params?: {
        q?: string;
        sort?: 'name' | 'usage' | 'lastUsed';
        unused?: boolean;
        limit?: number;
    }): Promise<TagsListResponse> {
        const searchParams = new URLSearchParams();
        if (params?.q) searchParams.set('q', params.q);
        if (params?.sort) searchParams.set('sort', params.sort);
        if (params?.unused !== undefined) searchParams.set('unused', String(params.unused));
        if (params?.limit) searchParams.set('limit', String(params.limit));
        const queryString = searchParams.toString();
        return this.fetch<TagsListResponse>(`/api/v1/tags${queryString ? `?${queryString}` : ''}`);
    }

    /**
     * Create tag (POST /tags)
     */
    async createTag(name: string): Promise<TagResponse> {
        return this.fetch<TagResponse>('/api/v1/tags', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
    }

    /**
     * Rename tag (PATCH /tags/:id)
     */
    async renameTag(id: string, name: string): Promise<TagResponse> {
        return this.fetch<TagResponse>(`/api/v1/tags/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ name }),
        });
    }

    /**
     * Update tag color (PATCH /tags/:id)
     */
    async updateTagColor(id: string, color: string): Promise<TagResponse> {
        return this.fetch<TagResponse>(`/api/v1/tags/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ color }),
        });
    }

    /**
     * Delete tag (DELETE /tags/:id)
     */
    async deleteTag(id: string): Promise<void> {
        await this.fetch<void>(`/api/v1/tags/${id}`, {
            method: 'DELETE',
        });
    }

    /**
     * Search library items (GET /search)
     * V1 lexical search with two modes:
     * - Tag-only: query starts with '#' -> matches tags only
     * - Combined: otherwise -> matches text OR tags
     */
    async search(query: string, cursor?: string, limit: number = 20): Promise<SearchResponse> {
        const params = new URLSearchParams();
        params.set('q', query);
        if (cursor) params.set('cursor', cursor);
        params.set('limit', limit.toString());
        return this.fetch<SearchResponse>(`/api/v1/search?${params.toString()}`);
    }

    /**
     * Get attachment download URL (GET /attachments/:id/download_url)
     * @param preview If true, returns inline URL for in-browser viewing (PDF preview)
     */
    async getAttachmentDownloadUrl(attachmentId: string, preview: boolean = false): Promise<{ downloadUrl: string }> {
        const params = preview ? '?preview=true' : '';
        return this.fetch<{ downloadUrl: string }>(`/api/v1/attachments/${attachmentId}/download_url${params}`);
    }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export feature flags
export const isUsingRealApi = USE_REAL_API;
export const isUsingClerkAuth = USE_CLERK_AUTH;
