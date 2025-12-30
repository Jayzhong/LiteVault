/**
 * LiteVault Domain Types
 * Source: UI_INTERACTION_SPEC.md - Section 1
 */

// Item status enum
export type ItemStatus = 'ENRICHING' | 'READY_TO_CONFIRM' | 'ARCHIVED' | 'DISCARDED' | 'FAILED';

// Source type for items
export type SourceType = 'NOTE' | 'ARTICLE';

/**
 * TagInItem - Tag object embedded in item responses
 */
export interface TagInItem {
    id: string;
    name: string;
    color: string;
}

/**
 * SuggestedTag - AI-generated tag suggestion
 */
export interface SuggestedTag {
    id: string;
    name: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    confidence: number | null;
}

/**
 * Item - Core data type for captured content
 */
export interface Item {
    id: string;
    rawText: string;
    title: string | null;
    summary: string | null;
    tags: TagInItem[];
    suggestedTags?: SuggestedTag[]; // AI suggestions
    status: ItemStatus;
    sourceType?: SourceType;
    createdAt: Date;
    updatedAt: Date;
    confirmedAt: Date | null;
}

/**
 * Tag - User-created organizational label
 */
export interface Tag {
    id: string;
    name: string;
    usageCount: number;
    lastUsed: Date | null;
    createdAt: Date;
    color?: string; // Hex color code, defaults to #6B7280
}

/**
 * Evidence Item - A reference to an item that supports a search result
 */
export interface EvidenceItem {
    itemId: string;
    snippet: string;
    score?: number;
    type: SourceType;
    tags: TagInItem[];
    title: string;
}

/**
 * Search Result - Response from a search query
 */
export interface SearchResult {
    answer: string;
    evidence: EvidenceItem[];
    totalSources: number;
}

/**
 * User - Current authenticated user
 */
export interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    plan: 'free' | 'pro';
    createdAt: Date;
}

/**
 * Page state types
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface PageState<T> {
    status: LoadingState;
    data: T | null;
    error: string | null;
}

/**
 * Timeline group for Library
 */
export type TimelineGroupLabel = 'TODAY' | 'YESTERDAY' | 'LAST 7 DAYS' | 'OLDER';

export interface TimelineGroup {
    label: TimelineGroupLabel;
    items: Item[];
}
