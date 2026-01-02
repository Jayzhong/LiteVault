'use client';

import { useState } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { TAG_PALETTE, getTagColor } from '@/lib/tag-palette';

interface TagColorPickerProps {
    /** Current color (ID or hex) */
    color: string;
    /** Callback when color changes (returns ID) */
    onChange: (colorId: string) => void;
    /** Size of the color swatch */
    size?: 'sm' | 'md';
}

/**
 * Color picker component for tags.
 * Shows a clickable color swatch that opens a palette popover.
 */
export function TagColorPicker({
    color,
    onChange,
    size = 'sm',
}: TagColorPickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Resolve current color to palette entry for display
    const currentColor = getTagColor(color);

    const handleSelectColor = (colorId: string) => {
        onChange(colorId);
        setIsOpen(false);
    };

    const sizeClasses = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        sizeClasses,
                        'rounded-full ring-offset-background transition-all border',
                        'hover:ring-2 hover:ring-ring hover:ring-offset-2',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                    )}
                    style={{
                        backgroundColor: currentColor.bg,
                        borderColor: currentColor.border
                    }}
                    aria-label={`Change color (current: ${currentColor.name})`}
                />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
                <div className="grid grid-cols-5 gap-1.5">
                    {TAG_PALETTE.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => handleSelectColor(c.id)}
                            className={cn(
                                'h-7 w-7 rounded-md transition-all border flex items-center justify-center',
                                'hover:scale-110 hover:ring-2 hover:ring-ring hover:ring-offset-1',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                            )}
                            style={{
                                backgroundColor: c.bg,
                                borderColor: c.border,
                                color: c.fg
                            }}
                            aria-label={c.name}
                            title={c.name}
                        >
                            {(currentColor.id === c.id) && (
                                <Check className="h-4 w-4" />
                            )}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
