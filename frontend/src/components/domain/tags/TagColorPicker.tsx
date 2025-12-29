'use client';

import { useState } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

// Tag color palette - matches the plan
const TAG_COLORS = [
    { name: 'Gray', hex: '#6B7280' },
    { name: 'Red', hex: '#EF4444' },
    { name: 'Orange', hex: '#F97316' },
    { name: 'Amber', hex: '#F59E0B' },
    { name: 'Green', hex: '#22C55E' },
    { name: 'Teal', hex: '#14B8A6' },
    { name: 'Blue', hex: '#3B82F6' },
    { name: 'Purple', hex: '#8B5CF6' },
    { name: 'Pink', hex: '#EC4899' },
];

interface TagColorPickerProps {
    /** Current color (hex) */
    color: string;
    /** Callback when color changes */
    onChange: (color: string) => void;
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

    const handleSelectColor = (hex: string) => {
        onChange(hex);
        setIsOpen(false);
    };

    const sizeClasses = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        sizeClasses,
                        'rounded-full ring-offset-background transition-all',
                        'hover:ring-2 hover:ring-ring hover:ring-offset-2',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                    )}
                    style={{ backgroundColor: color }}
                    aria-label="Change color"
                />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
                <div className="grid grid-cols-3 gap-1.5">
                    {TAG_COLORS.map((c) => (
                        <button
                            key={c.hex}
                            onClick={() => handleSelectColor(c.hex)}
                            className={cn(
                                'h-7 w-7 rounded-md transition-all',
                                'hover:scale-110 hover:ring-2 hover:ring-ring hover:ring-offset-1',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                            )}
                            style={{ backgroundColor: c.hex }}
                            aria-label={c.name}
                        >
                            {color.toLowerCase() === c.hex.toLowerCase() && (
                                <Check className="h-4 w-4 mx-auto text-white drop-shadow-sm" />
                            )}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export { TAG_COLORS };
