'use client';

import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/lib/store/AppContext';
import { cn } from '@/lib/utils';

interface ColoredTagBadgeProps {
    /** Tag name (string) */
    name: string;
    /** Optional direct color (bypasses AppContext lookup) */
    color?: string;
    /** Additional className */
    className?: string;
}

/**
 * Badge component for displaying tags with their assigned colors.
 * Uses provided color or looks up the tag color from AppContext by name.
 */
export function ColoredTagBadge({ name, color: propColor, className }: ColoredTagBadgeProps) {
    const { tags } = useAppContext();

    // Use provided color or look up from AppContext
    const tag = !propColor ? tags.find((t) => t.name.toLowerCase() === name.toLowerCase()) : null;
    const color = propColor || tag?.color || '#6B7280';

    // Calculate contrasting text color (simple luminance check)
    const isLight = isLightColor(color);

    return (
        <Badge
            className={cn(
                'border-transparent',
                isLight ? 'text-gray-900' : 'text-white',
                className
            )}
            style={{
                backgroundColor: color,
            }}
        >
            {name}
        </Badge>
    );
}

/**
 * Check if a hex color is light (for text contrast).
 */
function isLightColor(hex: string): boolean {
    // Remove # if present
    const color = hex.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
}
