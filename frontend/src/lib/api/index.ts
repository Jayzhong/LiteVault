/**
 * API module exports
 */

export {
    apiClient,
    isUsingRealApi,
    generateIdempotencyKey,
    type ApiError,
    type CreateItemResponse,
    type PendingItemsResponse,
    type UpdateItemResponse,
    type RetryResponse,
} from './client';
