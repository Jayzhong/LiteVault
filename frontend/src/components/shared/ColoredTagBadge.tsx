'use client';

import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/lib/store/AppContext';
import { cn } from '@/lib/utils';
import { getTagColor } from '@/lib/tag-palette';

interface ColoredTagBadgeProps {
    /** Tag name (string) */
    name: string;
    /** Optional direct color (bypasses AppContext lookup) - can be ID or Hex */
    color?: string;
    /** Additional className */
    className?: string;
}

/**
 * Badge component for displaying tags with their assigned colors.
 * Uses unified palette system via getTagColor helper.
 */
export function ColoredTagBadge({ name, color: propColor, className }: ColoredTagBadgeProps) {
    const { tags } = useAppContext();

    // Use provided color or look up from AppContext
    const tag = !propColor ? tags.find((t) => t.name.toLowerCase() === name.toLowerCase()) : null;

    // Resolve color using the unified palette helper
    const rawColor = propColor || tag?.color;
    const paletteColor = getTagColor(rawColor);

    return (
        <Badge
            className={cn(
                'border',
                className
            )}
            style={{
                backgroundColor: paletteColor.bg,
                color: paletteColor.fg,
                borderColor: paletteColor.border,
            }}
        >
            {name}
        </Badge>
    );
}
