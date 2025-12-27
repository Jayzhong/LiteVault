'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Mock user data for Phase 2
const mockUser = {
    name: 'Alex Chen',
    email: 'alex@example.com',
    avatarUrl: undefined,
    plan: 'Pro' as const,
};

export function UserCard() {
    const initials = mockUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase();

    return (
        <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={mockUser.avatarUrl} alt={mockUser.name} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-medium">
                        {initials}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{mockUser.name}</p>
                    <p className="text-xs text-muted-foreground">{mockUser.plan}</p>
                </div>
            </div>
        </div>
    );
}
