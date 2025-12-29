'use client';

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
import { useAppContext } from '@/lib/store/AppContext';
import { useAccountProfile } from '@/lib/hooks/useAccountProfile';
import { formatRelativeDate } from '@/lib/utils/dateFormat';
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
    const { deleteTag } = useAppContext();
    const { profile } = useAccountProfile();
    const userTimezone = profile?.preferences?.timezone || 'UTC';

    const formatDate = (date: Date | null) => {
        if (!date) return 'Never';
        return formatRelativeDate(date, userTimezone);
    };

    const handleRename = (tag: Tag) => {
        toast.info(`Rename dialog would open for "${tag.name}"`);
    };

    const handleDelete = (tag: Tag) => {
        deleteTag(tag.id);
        toast.success(`Tag "${tag.name}" deleted`);
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
                            <TableHead>{microcopy.tags.table.col.name}</TableHead>
                            <TableHead>{microcopy.tags.table.col.usage}</TableHead>
                            <TableHead>{microcopy.tags.table.col.lastUsed}</TableHead>
                            <TableHead className="text-right">{microcopy.tags.table.col.actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tags.map((tag) => (
                            <TableRow key={tag.id}>
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
        </>
    );
}
