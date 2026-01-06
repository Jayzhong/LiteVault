'use client';

/**
 * AttachButton component for file upload trigger.
 */

import { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ALLOWED_MIME_TYPES } from '@/lib/api/uploads';

export interface AttachButtonProps {
    onFilesSelected: (files: File[]) => void;
    disabled?: boolean;
    multiple?: boolean;
    className?: string;
}

export function AttachButton({
    onFilesSelected,
    disabled = false,
    multiple = true,
    className,
}: AttachButtonProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {
        inputRef.current?.click();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onFilesSelected(Array.from(files));
            // Reset input to allow selecting same file again
            e.target.value = '';
        }
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClick}
                        disabled={disabled}
                        className={className}
                    >
                        <Paperclip className="h-4 w-4 mr-1" />
                        Attach
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Attach files or images</p>
                </TooltipContent>
            </Tooltip>
            <input
                ref={inputRef}
                type="file"
                accept={ALLOWED_MIME_TYPES.join(',')}
                multiple={multiple}
                onChange={handleChange}
                className="hidden"
                aria-label="Select files to attach"
            />
        </TooltipProvider>
    );
}
