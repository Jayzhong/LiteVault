'use client';

import { useState } from 'react';
import Link from 'next/link';
import { microcopy } from '@/lib/microcopy';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { TagsTable } from '@/components/domain/tags/TagsTable';
import { CreateTagModal } from '@/components/domain/tags/CreateTagModal';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAppContext } from '@/lib/store/AppContext';
import { Search, ChevronDown, BarChart3, Plus } from 'lucide-react';

export default function TagManagementPage() {
    const { tags, addTag, isLoading } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'usage' | 'lastUsed'>('name');
    const [showUnused, setShowUnused] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Filter and sort tags
    const filteredTags = tags
        .filter((tag) => {
            const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesUnused = showUnused ? tag.usageCount === 0 : true;
            return matchesSearch && matchesUnused;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'usage':
                    return b.usageCount - a.usageCount;
                case 'lastUsed':
                    if (!a.lastUsed) return 1;
                    if (!b.lastUsed) return -1;
                    return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
                default:
                    return 0;
            }
        });

    const handleCreateTag = (name: string) => {
        addTag(name);
        setIsCreateModalOpen(false);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setShowUnused(false);
        setSortBy('name');
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-8">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Breadcrumb */}
            <nav className="text-sm text-muted-foreground">
                <Link href="/settings" className="hover:text-foreground">
                    Settings
                </Link>
                <span className="mx-2">/</span>
                <span className="text-foreground">Tag Management</span>
            </nav>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold text-foreground">
                        {microcopy.tags.title}
                    </h1>
                    <p className="text-muted-foreground">{microcopy.tags.subtitle}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        {microcopy.tags.action.analytics}
                    </Button>
                    <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        {microcopy.tags.action.create}
                    </Button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={microcopy.tags.search.placeholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            {sortBy === 'name' && 'Sort by Name'}
                            {sortBy === 'usage' && 'Sort by Usage'}
                            {sortBy === 'lastUsed' && 'Sort by Last Used'}
                            <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setSortBy('name')}>
                            Sort by Name
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy('usage')}>
                            Sort by Usage
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy('lastUsed')}>
                            Sort by Last Used
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex items-center gap-2">
                    <Switch
                        id="show-unused"
                        checked={showUnused}
                        onCheckedChange={setShowUnused}
                    />
                    <label htmlFor="show-unused" className="text-sm text-muted-foreground">
                        {microcopy.tags.toggle.unused}
                    </label>
                </div>
            </div>

            {/* Table or Empty State */}
            {tags.length === 0 ? (
                <EmptyState
                    title={microcopy.tags.empty.title}
                    copy={microcopy.tags.empty.copy}
                    actionLabel={microcopy.tags.empty.action}
                    actionHref="/"
                />
            ) : filteredTags.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                    <p className="text-muted-foreground">{microcopy.tags.emptyFiltered.title}</p>
                    <Button variant="ghost" onClick={clearFilters}>
                        {microcopy.tags.emptyFiltered.action}
                    </Button>
                </div>
            ) : (
                <TagsTable tags={filteredTags} />
            )}

            {/* Create Tag Modal */}
            <CreateTagModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateTag}
            />
        </div>
    );
}
