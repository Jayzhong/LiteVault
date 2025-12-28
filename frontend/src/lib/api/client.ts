/**
 * API Client for LiteVault backend.
 * 
 * Feature flags:
 * - NEXT_PUBLIC_USE_REAL_API: true to call real backend
 * - NEXT_PUBLIC_USE_CLERK_AUTH: true to use Clerk token auth
 */

import type { Item, ItemStatus } from '@/lib/types';

// Environment configuration
const USE_REAL_API = process.env.NEXT_PUBLIC_USE_REAL_API === 'true';
const USE_CLERK_AUTH = process.env.NEXT_PUBLIC_USE_CLERK_AUTH === 'true';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
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
    tags: string[];
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
    tags?: string[];
    updatedAt: string;
    confirmedAt?: string | null;
}

export interface RetryResponse {
    id: string;
    status: string;
    updatedAt: string;
}

// Helper to convert API dates to Date objects
function parseApiItem(item: CreateItemResponse): Item {
    return {
        id: item.id,
        rawText: item.rawText,
        title: item.title,
        summary: item.summary,
        tags: item.tags,
        status: item.status,
        sourceType: item.sourceType as 'NOTE' | 'ARTICLE' | undefined,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        confirmedAt: item.confirmedAt ? new Date(item.confirmedAt) : null,
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
            throw error;
        }

        return response.json() as Promise<T>;
    }

    /**
     * Create a new item (POST /items)
     */
    async createItem(rawText: string, idempotencyKey?: string): Promise<Item> {
        const headers: HeadersInit = {};
        if (idempotencyKey) {
            headers['Idempotency-Key'] = idempotencyKey;
        }

        const response = await this.fetch<CreateItemResponse>('/api/v1/items', {
            method: 'POST',
            headers,
            body: JSON.stringify({ rawText }),
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
     */
    async confirmItem(id: string, tags?: string[]): Promise<UpdateItemResponse> {
        return this.fetch<UpdateItemResponse>(`/api/v1/items/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ action: 'confirm', tags }),
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
     * Retry failed enrichment (POST /items/:id/retry)
     */
    async retryItem(id: string): Promise<RetryResponse> {
        return this.fetch<RetryResponse>(`/api/v1/items/${id}/retry`, {
            method: 'POST',
        });
    }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export feature flags
export const isUsingRealApi = USE_REAL_API;
export const isUsingClerkAuth = USE_CLERK_AUTH;
