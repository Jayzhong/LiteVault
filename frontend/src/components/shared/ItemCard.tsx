'use client';

import { KeyboardEvent, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { ColoredTagBadge } from '@/components/shared/ColoredTagBadge';
import { cn } from '@/lib/utils';
import type { SourceType, TagInItem } from '@/lib/types';
import { Clock, FileText, Link as LinkIcon, Paperclip } from 'lucide-react';

interface ItemCardProps {
    /** Item title (required) */
    title: string;
    /** Item summary or preview text */
    summary?: string;
    /** Tags to display */
    tags?: TagInItem[];
    /** Source type for icon */
    sourceType?: SourceType;
    /** Status badge text (e.g., "Ready to confirm") */
    statusBadge?: string;
    /** Timestamp display (e.g., "2m ago") */
    timestamp?: string;
    /** Number of attachments for this item */
    attachmentCount?: number;
    /** Additional content to render in the card (e.g., action buttons) */
    children?: ReactNode;
    /** Click handler for the entire card */
    onClick?: () => void;
    /** Whether to show the source type icon */
    showIcon?: boolean;
    /** Custom class names */
    className?: string;
    /** Variant styling */
    variant?: 'default' | 'destructive';
    /** If true, card is not interactive (no hover/click) */
    static?: boolean;
}

/**
 * Unified item card component with consistent styling.
 * Used across Pending Review, Library, and Search pages.
 */
export function ItemCard({
    title,
    summary,
    tags = [],
    sourceType,
    statusBadge,
    timestamp,
    attachmentCount,
    children,
    onClick,
    showIcon = false,
    className,
    variant = 'default',
    static: isStatic = false,
}: ItemCardProps) {
    const Icon = sourceType === 'ARTICLE' ? LinkIcon : FileText;

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (!isStatic && onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
        }
    };

    const cardContent = (
        <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Optional source type icon */}
                    {showIcon && (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                    )}

                    <div className="space-y-1 flex-1 min-w-0">
                        {/* Title - 1 line truncation */}
                        <h3 className="font-medium text-foreground line-clamp-1">
                            {title || 'Untitled'}
                        </h3>
                        {/* Summary - 2 lines truncation */}
                        {summary && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {summary}
                            </p>
                        )}
                    </div>
                </div>

                {/* Status badge */}
                {statusBadge && (
                    <Badge
                        variant="outline"
                        className="shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                        {statusBadge}
                    </Badge>
                )}
            </div>

            {/* Footer: timestamp + attachments + tags */}
            <div className="flex items-center gap-4 flex-wrap">
                {timestamp && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {timestamp}
                    </div>
                )}
                {attachmentCount !== undefined && attachmentCount > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Paperclip className="h-3.5 w-3.5" />
                        {attachmentCount}
                    </div>
                )}
                {tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {tags.slice(0, 3).map((tag) => (
                            <ColoredTagBadge key={tag.id || tag.name} name={tag.name} color={tag.color} className="text-xs" />
                        ))}
                        {tags.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                                +{tags.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Optional children (action buttons, etc.) */}
            {children}
        </div>
    );

    // Static card (not interactive)
    if (isStatic) {
        return (
            <div
                className={cn(
                    'rounded-xl border bg-card p-4',
                    variant === 'destructive' ? 'border-destructive/50' : 'border-border',
                    className
                )}
            >
                {cardContent}
            </div>
        );
    }

    // Interactive card (clickable)
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            className={cn(
                'w-full rounded-xl border bg-card p-4 text-left',
                'hover:border-primary/30 hover:bg-primary/5 transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                'cursor-pointer',
                variant === 'destructive' ? 'border-destructive/50' : 'border-border',
                className
            )}
        >
            {cardContent}
        </div>
    );
}
