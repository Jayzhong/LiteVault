'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
    title: string;
    copy: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
}

export function EmptyState({
    title,
    copy,
    actionLabel,
    actionHref,
    onAction,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <svg
                    className="h-8 w-8 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">{copy}</p>
            {actionLabel && (actionHref || onAction) && (
                <>
                    {actionHref ? (
                        <Link href={actionHref}>
                            <Button variant="outline">{actionLabel}</Button>
                        </Link>
                    ) : (
                        <Button variant="outline" onClick={onAction}>
                            {actionLabel}
                        </Button>
                    )}
                </>
            )}
        </div>
    );
}
