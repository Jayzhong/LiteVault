import type { Item, Tag, SearchResult, EvidenceItem, TagInItem } from '@/lib/types';

// Helper to create TagInItem from name
function tag(name: string, id?: string): TagInItem {
    return { id: id || `tag-${name.toLowerCase()}`, name, color: '#6B7280' };
}

// Static dates to avoid SSR/client hydration mismatch
// These are fixed reference points, not dynamic
const TODAY = new Date('2025-01-01T12:00:00.000Z');
const YESTERDAY = new Date('2024-12-31T12:00:00.000Z');
const THREE_DAYS_AGO = new Date('2024-12-29T12:00:00.000Z');
const ONE_WEEK_AGO = new Date('2024-12-25T12:00:00.000Z');

// Mock Items
export const mockItems: Item[] = [
    {
        id: 'item-1',
        rawText: 'Meeting notes from the product review session. We discussed the new feature roadmap and prioritized items for Q1. Key decisions: focus on search improvements and mobile experience.',
        title: 'Product Review Meeting Notes',
        summary: 'Product review discussing Q1 roadmap with focus on search improvements and mobile experience.',
        tags: [tag('Meetings', 'tag-1'), tag('Product', 'tag-2')],
        status: 'ARCHIVED',
        sourceType: 'NOTE',
        createdAt: TODAY,
        updatedAt: TODAY,
        confirmedAt: TODAY,
    },
    {
        id: 'item-2',
        rawText: 'Design references for the new dashboard. Looking at Notion, Linear, and Craft for inspiration. Key elements: clean typography, minimal color palette, focus on content.',
        title: 'Dashboard Design References',
        summary: 'Design inspiration from Notion, Linear, and Craft focusing on clean typography and minimal design.',
        tags: [tag('Design', 'tag-3'), tag('Research', 'tag-4')],
        status: 'ARCHIVED',
        sourceType: 'NOTE',
        createdAt: YESTERDAY,
        updatedAt: YESTERDAY,
        confirmedAt: YESTERDAY,
    },
    {
        id: 'item-3',
        rawText: 'Article about effective knowledge management. Key insights: capture everything, review regularly, connect ideas.',
        title: 'Knowledge Management Best Practices',
        summary: 'Article insights on capturing, reviewing, and connecting ideas for effective knowledge management.',
        tags: [tag('Learning', 'tag-5'), tag('Productivity', 'tag-6')],
        status: 'ARCHIVED',
        sourceType: 'ARTICLE',
        createdAt: THREE_DAYS_AGO,
        updatedAt: THREE_DAYS_AGO,
        confirmedAt: THREE_DAYS_AGO,
    },
];

// Mock Tags
export const mockTags: Tag[] = [
    { id: 'tag-1', name: 'Meetings', usageCount: 12, lastUsed: TODAY, createdAt: ONE_WEEK_AGO },
    { id: 'tag-2', name: 'Product', usageCount: 8, lastUsed: TODAY, createdAt: ONE_WEEK_AGO },
    { id: 'tag-3', name: 'Design', usageCount: 15, lastUsed: YESTERDAY, createdAt: ONE_WEEK_AGO },
    { id: 'tag-4', name: 'Research', usageCount: 6, lastUsed: THREE_DAYS_AGO, createdAt: ONE_WEEK_AGO },
    { id: 'tag-5', name: 'Learning', usageCount: 4, lastUsed: THREE_DAYS_AGO, createdAt: ONE_WEEK_AGO },
    { id: 'tag-6', name: 'Productivity', usageCount: 3, lastUsed: ONE_WEEK_AGO, createdAt: ONE_WEEK_AGO },
    { id: 'tag-7', name: 'Ideas', usageCount: 0, lastUsed: null, createdAt: ONE_WEEK_AGO },
    { id: 'tag-8', name: 'Notes', usageCount: 0, lastUsed: null, createdAt: ONE_WEEK_AGO },
];

// Mock Search Result
export const mockSearchResult: SearchResult = {
    answer: `Based on your notes, here are the key insights about organizing design references:

1. **Look at established tools**: Notion, Linear, and Craft are great sources of inspiration for clean, modern interfaces.

2. **Focus on fundamentals**: Clean typography, minimal color palette, and content-first approach are recurring themes in successful designs.

3. **Document your decisions**: Keep track of what works and what doesn't as you iterate on your designs.

Your recent product review also emphasized the importance of focusing on search improvements and mobile experience for Q1.`,
    evidence: [
        {
            itemId: 'item-2',
            snippet: 'Design references for the new dashboard. Looking at Notion, Linear, and Craft for inspiration...',
            score: 0.95,
            type: 'NOTE',
            tags: [tag('Design', 'tag-3'), tag('Research', 'tag-4')],
            title: 'Dashboard Design References',
        },
        {
            itemId: 'item-1',
            snippet: 'Key decisions: focus on search improvements and mobile experience.',
            score: 0.72,
            type: 'NOTE',
            tags: [tag('Meetings', 'tag-1'), tag('Product', 'tag-2')],
            title: 'Product Review Meeting Notes',
        },
        {
            itemId: 'item-3',
            snippet: 'Key insights: capture everything, review regularly, connect ideas.',
            score: 0.65,
            type: 'ARTICLE',
            tags: [tag('Learning', 'tag-5'), tag('Productivity', 'tag-6')],
            title: 'Knowledge Management Best Practices',
        },
    ],
    totalSources: 3,
};
