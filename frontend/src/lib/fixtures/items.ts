import type { Item, Tag, SearchResult, EvidenceItem } from '@/lib/types';

// Mock Items
export const mockItems: Item[] = [
    {
        id: 'item-1',
        rawText: 'Meeting notes from the product review session. We discussed the new feature roadmap and prioritized items for Q1. Key decisions: focus on search improvements and mobile experience.',
        title: 'Product Review Meeting Notes',
        summary: 'Product review discussing Q1 roadmap with focus on search improvements and mobile experience.',
        tags: ['Meetings', 'Product'],
        status: 'ARCHIVED',
        sourceType: 'NOTE',
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmedAt: new Date(),
    },
    {
        id: 'item-2',
        rawText: 'Design references for the new dashboard. Looking at Notion, Linear, and Craft for inspiration. Key elements: clean typography, minimal color palette, focus on content.',
        title: 'Dashboard Design References',
        summary: 'Design inspiration from Notion, Linear, and Craft focusing on clean typography and minimal design.',
        tags: ['Design', 'Research'],
        status: 'ARCHIVED',
        sourceType: 'NOTE',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        confirmedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
        id: 'item-3',
        rawText: 'Article about effective knowledge management. Key insights: capture everything, review regularly, connect ideas.',
        title: 'Knowledge Management Best Practices',
        summary: 'Article insights on capturing, reviewing, and connecting ideas for effective knowledge management.',
        tags: ['Learning', 'Productivity'],
        status: 'ARCHIVED',
        sourceType: 'ARTICLE',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        confirmedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
];

// Mock Tags
export const mockTags: Tag[] = [
    { id: 'tag-1', name: 'Meetings', usageCount: 12, lastUsed: new Date(), createdAt: new Date() },
    { id: 'tag-2', name: 'Product', usageCount: 8, lastUsed: new Date(), createdAt: new Date() },
    { id: 'tag-3', name: 'Design', usageCount: 15, lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000), createdAt: new Date() },
    { id: 'tag-4', name: 'Research', usageCount: 6, lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), createdAt: new Date() },
    { id: 'tag-5', name: 'Learning', usageCount: 4, lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), createdAt: new Date() },
    { id: 'tag-6', name: 'Productivity', usageCount: 3, lastUsed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), createdAt: new Date() },
    { id: 'tag-7', name: 'Ideas', usageCount: 0, lastUsed: null, createdAt: new Date() },
    { id: 'tag-8', name: 'Notes', usageCount: 0, lastUsed: null, createdAt: new Date() },
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
            tags: ['Design', 'Research'],
            title: 'Dashboard Design References',
        },
        {
            itemId: 'item-1',
            snippet: 'Key decisions: focus on search improvements and mobile experience.',
            score: 0.72,
            type: 'NOTE',
            tags: ['Meetings', 'Product'],
            title: 'Product Review Meeting Notes',
        },
        {
            itemId: 'item-3',
            snippet: 'Key insights: capture everything, review regularly, connect ideas.',
            score: 0.65,
            type: 'ARTICLE',
            tags: ['Learning', 'Productivity'],
            title: 'Knowledge Management Best Practices',
        },
    ],
    totalSources: 3,
};
