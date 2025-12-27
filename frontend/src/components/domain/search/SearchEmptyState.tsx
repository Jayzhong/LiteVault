'use client';

import { getGreeting, microcopy } from '@/lib/microcopy';
import { InputBar } from '@/components/shared/InputBar';

interface SearchEmptyStateProps {
    onSearch: (query: string) => void;
}

export function SearchEmptyState({ onSearch }: SearchEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="space-y-2 mb-8">
                <h1 className="text-3xl font-semibold text-foreground">
                    {getGreeting('Alex')}
                </h1>
                <p className="text-lg text-muted-foreground">
                    {microcopy.search.empty.subtitle}
                </p>
            </div>
            <div className="w-full max-w-xl">
                <InputBar
                    mode="search"
                    placeholder={microcopy.search.empty.placeholder}
                    buttonLabel={microcopy.search.empty.action}
                    onSubmit={onSearch}
                />
            </div>
        </div>
    );
}
