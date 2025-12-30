export const TAG_COLORS = {
    gray: '#6B7280',
    red: '#EF4444',
    orange: '#F97316',
    amber: '#F59E0B',
    green: '#22C55E',
    teal: '#14B8A6',
    blue: '#3B82F6',
    purple: '#8B5CF6',
    pink: '#EC4899',
} as const;

export type TagColorName = keyof typeof TAG_COLORS;
