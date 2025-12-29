'use client';

import { useState, useRef, useEffect } from 'react';
import { microcopy } from '@/lib/microcopy';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { X, Plus, Check } from 'lucide-react';

interface TagPickerProps {
    /** Currently selected tags */
    selectedTags: string[];
    /** Available tags to choose from (optional - uses selectedTags if not provided) */
    availableTags?: string[];
    /** Callback when tags change */
    onChange: (tags: string[]) => void;
    /** Whether to allow creating new tags */
    allowCreate?: boolean;
    /** Custom trigger element (defaults to "+ Add Tag" badge) */
    trigger?: React.ReactNode;
    /** Custom class for the trigger */
    triggerClassName?: string;
}

/**
 * TagPicker component for selecting and managing tags.
 * Provides search, add, remove, and optional create functionality.
 */
export function TagPicker({
    selectedTags,
    availableTags = [],
    onChange,
    allowCreate = false,
    trigger,
    triggerClassName,
}: TagPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when popover opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Combine available tags with selected tags (deduped)
    const allTags = [...new Set([...availableTags, ...selectedTags])];

    // Filter tags based on search query
    const filteredTags = allTags.filter((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Check if search query matches an existing tag (for create option)
    const exactMatch = allTags.some(
        (tag) => tag.toLowerCase() === searchQuery.toLowerCase().trim()
    );

    const handleToggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            onChange(selectedTags.filter((t) => t !== tag));
        } else {
            onChange([...selectedTags, tag]);
        }
    };

    const handleRemoveTag = (tag: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(selectedTags.filter((t) => t !== tag));
    };

    const handleCreateTag = () => {
        const newTag = searchQuery.trim();
        if (newTag && !selectedTags.includes(newTag)) {
            onChange([...selectedTags, newTag]);
            setSearchQuery('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && allowCreate && searchQuery.trim() && !exactMatch) {
            e.preventDefault();
            handleCreateTag();
        }
    };

    return (
        <div className="space-y-2">
            {/* Selected Tags Display */}
            <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                    <Badge
                        key={tag}
                        variant="secondary"
                        className="gap-1.5 pr-1.5"
                    >
                        {tag}
                        <button
                            onClick={(e) => handleRemoveTag(tag, e)}
                            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                            aria-label={`Remove ${tag}`}
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}

                {/* Add Tag Trigger */}
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverTrigger asChild>
                        {trigger || (
                            <button
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/40 px-3 py-1',
                                    'text-sm text-muted-foreground hover:bg-muted hover:border-muted-foreground/60 transition-colors',
                                    triggerClassName
                                )}
                            >
                                {microcopy.modal.insight.tags.add}
                            </button>
                        )}
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                        {/* Search Input */}
                        <Input
                            ref={inputRef}
                            placeholder={microcopy.tagPicker.placeholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="mb-2"
                        />

                        {/* Tag List */}
                        <div className="max-h-40 overflow-y-auto space-y-1">
                            {filteredTags.length === 0 && !searchQuery.trim() && (
                                <p className="text-sm text-muted-foreground py-2 text-center">
                                    {microcopy.tagPicker.noResults}
                                </p>
                            )}

                            {filteredTags.map((tag) => {
                                const isSelected = selectedTags.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        onClick={() => handleToggleTag(tag)}
                                        className={cn(
                                            'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left',
                                            'hover:bg-muted transition-colors',
                                            isSelected && 'bg-emerald-50 text-emerald-700'
                                        )}
                                    >
                                        {isSelected && <Check className="h-3 w-3 shrink-0" />}
                                        <span className={cn(!isSelected && 'ml-5')}>{tag}</span>
                                    </button>
                                );
                            })}

                            {/* Create New Tag Option */}
                            {allowCreate && searchQuery.trim() && !exactMatch && (
                                <button
                                    onClick={handleCreateTag}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left hover:bg-muted text-emerald-600"
                                >
                                    <Plus className="h-3 w-3" />
                                    {microcopy.tagPicker.createNew.replace('{tag}', searchQuery.trim())}
                                </button>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
