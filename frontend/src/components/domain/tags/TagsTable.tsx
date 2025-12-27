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

    const formatDate = (date: Date | null) => {
        if (!date) return 'Never';
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    const handleRename = (tag: Tag) => {
        toast.info(`Rename dialog would open for "${tag.name}"`);
    };

    const handleDelete = (tag: Tag) => {
        deleteTag(tag.id);
        toast.success(`Tag "${tag.name}" deleted`);
    };

    return (
        <div className="rounded-xl border border-border">
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
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
