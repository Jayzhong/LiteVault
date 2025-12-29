'use client';

import { useState } from 'react';
import { microcopy, t } from '@/lib/microcopy';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAccountProfile } from '@/lib/hooks/useAccountProfile';
import { useTags } from '@/lib/hooks/useTags';
import { formatRelativeDate } from '@/lib/utils/dateFormat';
import { TagColorPicker } from '@/components/domain/tags/TagColorPicker';
import { RenameTagModal } from '@/components/domain/tags/RenameTagModal';
import type { Tag } from '@/lib/types';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface TagsTableProps {
    tags: Tag[];
}

export function TagsTable({ tags }: TagsTableProps) {
    const { deleteTag, updateTagColor, renameTag } = useTags();
    const { profile } = useAccountProfile();
    const userTimezone = profile?.preferences?.timezone || 'UTC';
    const [renameTarget, setRenameTarget] = useState<Tag | null>(null);

    const formatDate = (date: Date | null) => {
        if (!date) return 'Never';
        return formatRelativeDate(date, userTimezone);
    };

    const handleRename = (tag: Tag) => {
        setRenameTarget(tag);
    };

    const handleDelete = async (tag: Tag) => {
        try {
            await deleteTag(tag.id);
            toast.success(`Tag "${tag.name}" deleted`);
        } catch {
            toast.error('Failed to delete tag');
        }
    };

    const handleColorChange = async (tag: Tag, newColor: string) => {
        try {
            await updateTagColor(tag.id, newColor);
            toast.success(`Color updated for "${tag.name}"`);
        } catch {
            toast.error('Failed to update color');
        }
    };

    // Tag actions dropdown (shared between mobile and desktop)
    const TagActions = ({ tag }: { tag: Tag }) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleRename(tag)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleDelete(tag)}
                    className="text-destructive focus:text-destructive"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <>
            {/* Mobile: Card Layout */}
            <div className="md:hidden space-y-3">
                {tags.map((tag) => (
                    <div
                        key={tag.id}
                        className="rounded-xl border border-border bg-card p-4"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <TagColorPicker
                                        color={tag.color || '#6B7280'}
                                        onChange={(color) => handleColorChange(tag, color)}
                                        size="sm"
                                    />
                                    <span className="font-medium text-foreground">
                                        {tag.name}
                                    </span>
                                    {tag.usageCount === 0 && (
                                        <Badge variant="outline" className="text-xs">
                                            {microcopy.tags.table.unusedBadge}
                                        </Badge>
                                    )}
                                </div>
                                <div className="mt-2 text-sm text-muted-foreground space-y-1">
                                    <p>{t('tags.table.usageNotes', { n: tag.usageCount })}</p>
                                    <p>Last used: {formatDate(tag.lastUsed)}</p>
                                </div>
                            </div>
                            <TagActions tag={tag} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop: Table Layout */}
            <div className="hidden md:block rounded-xl border border-border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">Color</TableHead>
                            <TableHead>{microcopy.tags.table.col.name}</TableHead>
                            <TableHead>{microcopy.tags.table.col.usage}</TableHead>
                            <TableHead>{microcopy.tags.table.col.lastUsed}</TableHead>
                            <TableHead className="text-right">{microcopy.tags.table.col.actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tags.map((tag) => (
                            <TableRow key={tag.id}>
                                <TableCell>
                                    <TagColorPicker
                                        color={tag.color || '#6B7280'}
                                        onChange={(color) => handleColorChange(tag, color)}
                                        size="md"
                                    />
                                </TableCell>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        {tag.name}
                                        {tag.usageCount === 0 && (
                                            <Badge variant="outline" className="text-xs">
                                                {microcopy.tags.table.unusedBadge}
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {t('tags.table.usageNotes', { n: tag.usageCount })}
                                </TableCell>
                                <TableCell>{formatDate(tag.lastUsed)}</TableCell>
                                <TableCell className="text-right">
                                    <TagActions tag={tag} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Rename Tag Modal */}
            {renameTarget && (
                <RenameTagModal
                    isOpen={!!renameTarget}
                    onClose={() => setRenameTarget(null)}
                    tag={renameTarget}
                    onRename={renameTag}
                />
            )}
        </>
    );
}
