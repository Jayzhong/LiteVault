export const TAG_PALETTE = [
    { id: 'gray', name: 'Gray', bg: '#F3F4F6', fg: '#1F2937', border: '#E5E7EB' },
    { id: 'red', name: 'Red', bg: '#FEF2F2', fg: '#991B1B', border: '#FECACA' },
    { id: 'orange', name: 'Orange', bg: '#FFF7ED', fg: '#9A3412', border: '#FED7AA' },
    { id: 'amber', name: 'Amber', bg: '#FFFBEB', fg: '#92400E', border: '#FDE68A' },
    { id: 'green', name: 'Green', bg: '#ECFDF5', fg: '#065F46', border: '#A7F3D0' },
    { id: 'teal', name: 'Teal', bg: '#F0FDFA', fg: '#115E59', border: '#99F6E4' },
    { id: 'blue', name: 'Blue', bg: '#EFF6FF', fg: '#1E40AF', border: '#BFDBFE' },
    { id: 'indigo', name: 'Indigo', bg: '#EEF2FF', fg: '#3730A3', border: '#C7D2FE' },
    { id: 'purple', name: 'Purple', bg: '#F5F3FF', fg: '#5B21B6', border: '#DDD6FE' },
    { id: 'pink', name: 'Pink', bg: '#FDF2F8', fg: '#9D174D', border: '#FBCFE8' },
] as const;

export type TagColorId = typeof TAG_PALETTE[number]['id'];

// Default color if none matches
export const DEFAULT_TAG_COLOR = TAG_PALETTE[0];

/**
 * Helper to get palette entry by hex or ID.
 * Supports legacy hex codes by finding the closest match or defaulting.
 */
export function getTagColor(identifier?: string) {
    if (!identifier) return DEFAULT_TAG_COLOR;

    // Try finding by ID first
    const byId = TAG_PALETTE.find(c => c.id === identifier);
    if (byId) return byId;

    // Try finding by hex (legacy support) -- approximate or exact match
    // For V1, we just check if any bg/fg matches, unlikely with raw hex.
    // If it's a raw hex not in our palette, we might map it to 'Gray' or
    // return a custom object to keep backward compatibility?
    // STRICT MODE: Map known hexes from previous hardcoded list to IDs.

    const legacyMap: Record<string, string> = {
        '#6B7280': 'gray',
        '#EF4444': 'red',
        '#F97316': 'orange',
        '#F59E0B': 'amber',
        '#22C55E': 'green',
        '#14B8A6': 'teal',
        '#3B82F6': 'blue',
        '#8B5CF6': 'purple',
        '#EC4899': 'pink'
    };

    const mappedId = legacyMap[identifier.toUpperCase()] || legacyMap[identifier];
    if (mappedId) {
        return TAG_PALETTE.find(c => c.id === mappedId) || DEFAULT_TAG_COLOR;
    }

    // Fallback: Return default gray
    return DEFAULT_TAG_COLOR;
}
