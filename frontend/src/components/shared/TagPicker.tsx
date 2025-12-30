'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { microcopy } from '@/lib/microcopy';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { X, Plus, Check, Loader2 } from 'lucide-react';
import { useTagSearch } from '@/lib/hooks/useTagSearch';
import { apiClient, isUsingRealApi } from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/lib/store/AppContext';
import { TAG_PALETTE, getTagColor } from '@/lib/tag-palette';

interface TagPickerProps {
    /** Currently selected tags */
    selectedTags: string[];
    /** Available tags to choose from (fallback for non-API mode) */
    availableTags?: string[];
    /** Callback when tags change */
    onChange: (tags: string[]) => void;
    /** Whether to allow creating new tags */
    allowCreate?: boolean;
    /** Custom trigger element (defaults to "Add Tag" badge) */
    trigger?: React.ReactNode;
    /** Custom class for the trigger */
    triggerClassName?: string;
}

/**
 * TagPicker component for selecting and managing tags.
 * Uses debounced backend search when API is available.
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
    const queryClient = useQueryClient();
    const { tags: contextTags } = useAppContext();

    // Debounced backend tag search (only when popover is open)
    const { tags: searchedTags, isLoading } = useTagSearch(searchQuery, {
        enabled: isOpen,
        debounceMs: 300,
    });

    // Resolve tag metadata (color) from multiple sources
    const tagMetadata = useMemo(() => {
        const map = new Map<string, { color: string }>();
        const defaultColor = TAG_PALETTE[0].id; // Use ID as default storage

        // 1. Context tags (highest priority for stable colors)
        contextTags.forEach(t => map.set(t.name.toLowerCase(), { color: t.color || defaultColor }));

        // 2. Searched tags (fresh from API)
        searchedTags.forEach(t => map.set(t.name.toLowerCase(), { color: t.color || defaultColor }));

        return map;
    }, [contextTags, searchedTags]);

    // Internal helper to get the *resolved palette color object*
    const getResolvedColor = (tagName: string) => {
        const storedColor = tagMetadata.get(tagName.toLowerCase())?.color;
        return getTagColor(storedColor);
    };

    // Focus input when popover opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
        // Reset search when closing
        if (!isOpen) {
            setSearchQuery('');
        }
    }, [isOpen]);

    // Combine searched tags with selected tags and availableTags (deduped)
    const allTags = useMemo(() => {
        return [
            ...new Set([
                ...searchedTags.map((t) => t.name),
                ...availableTags,
                ...selectedTags,
            ]),
        ];
    }, [searchedTags, availableTags, selectedTags]);

    // Filter tags based on search query (client-side filter of combined list)
    const filteredTags = useMemo(() => {
        return searchQuery.trim()
            ? allTags.filter((tag) =>
                tag.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : allTags;
    }, [allTags, searchQuery]);

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

    const handleCreateTag = async () => {
        const newTag = searchQuery.trim();
        if (newTag && !selectedTags.includes(newTag)) {
            // Create tag via API if available (upsert returns existing if duplicate)
            if (isUsingRealApi) {
                try {
                    // Note: Backend might require a color, or default it. 
                    // For now we just send the name.
                    await apiClient.createTag(newTag);
                    // Invalidate tags cache to update Settings > Tags list
                    queryClient.invalidateQueries({ queryKey: ['tags'] });
                } catch (error) {
                    console.error('Failed to persist tag:', error);
                }
            }
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

    const badgeStyle = (name: string) => {
        const c = getResolvedColor(name);
        return {
            backgroundColor: c.bg,
            color: c.fg,
            borderColor: c.border,
            borderWidth: '1px'
        };
    };

    return (
        <div className="space-y-2">
            {/* Selected Tags Display */}
            <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                    <Badge
                        key={tag}
                        style={badgeStyle(tag)}
                        className="gap-1.5 pl-3 pr-2 py-1 rounded-full border-none shadow-sm hover:opacity-90 transition-opacity font-normal"
                    >
                        {tag}
                        <button
                            onClick={(e) => handleRemoveTag(tag, e)}
                            className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors"
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
                                    'inline-flex items-center gap-1.5 rounded-full border border-dashed border-input bg-muted/30 px-3 py-1',
                                    'text-sm text-foreground/60 hover:bg-muted hover:text-foreground transition-all',
                                    triggerClassName
                                )}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>{microcopy.modal.insight.tags.add}</span>
                            </button>
                        )}
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                        {/* Search Input */}
                        <div className="relative mb-2">
                            <Input
                                ref={inputRef}
                                placeholder={microcopy.tagPicker.placeholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            {isLoading && (
                                <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                            )}
                        </div>

                        {/* Tag List */}
                        <div className="max-h-56 overflow-y-auto space-y-1">
                            {filteredTags.length === 0 && !searchQuery.trim() && !isLoading && (
                                <p className="text-sm text-muted-foreground py-2 text-center">
                                    {microcopy.tagPicker.noResults}
                                </p>
                            )}

                            {filteredTags.length === 0 && searchQuery.trim() && !isLoading && !allowCreate && (
                                <p className="text-sm text-muted-foreground py-2 text-center">
                                    No matching tags
                                </p>
                            )}

                            {filteredTags.map((tag) => {
                                const isSelected = selectedTags.includes(tag);
                                const color = getResolvedColor(tag);

                                return (
                                    <button
                                        key={tag}
                                        onClick={() => handleToggleTag(tag)}
                                        className={cn(
                                            'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left',
                                            'hover:bg-muted transition-colors',
                                            isSelected && 'bg-muted'
                                        )}
                                    >
                                        <div
                                            className="h-3 w-3 rounded-full shrink-0 border"
                                            style={{
                                                backgroundColor: color.bg,
                                                borderColor: color.border
                                            }}
                                        />
                                        <span className={cn('flex-1 truncate', isSelected && 'font-medium')}>
                                            {tag}
                                        </span>
                                        {isSelected && <Check className="h-3 w-3 shrink-0 text-muted-foreground" />}
                                    </button>
                                );
                            })}

                            {/* Create New Tag Option */}
                            {allowCreate && searchQuery.trim() && !exactMatch && (
                                <button
                                    onClick={handleCreateTag}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left hover:bg-muted text-primary group"
                                >
                                    <Plus className="h-3 w-3" />
                                    <span>
                                        Create <span className="font-medium">"{searchQuery.trim()}"</span>
                                    </span>
                                </button>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
