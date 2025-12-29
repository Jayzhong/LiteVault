'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAccountProfile } from '@/lib/hooks/useAccountProfile';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { microcopy } from '@/lib/microcopy';
import { Settings, LogOut } from 'lucide-react';

export function UserCard() {
    const { profile, isLoading, isSignedIn } = useAccountProfile();
    const { signOut } = useClerk();
    const router = useRouter();

    // Prevent hydration mismatch from Radix UI dynamic IDs
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogout = async () => {
        await signOut();
        router.push('/auth/login');
    };

    const handleSettings = () => {
        router.push('/settings');
    };

    // Loading state or not yet mounted (prevents hydration mismatch)
    if (isLoading || !mounted) {
        return (
            <div className="border-t border-border p-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 min-w-0 space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                </div>
            </div>
        );
    }

    // Signed out state - show sign in link
    if (!isSignedIn || !profile) {
        return (
            <div className="border-t border-border p-4">
                <Link
                    href="/auth/login"
                    className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                >
                    {microcopy.auth.login.action}
                </Link>
            </div>
        );
    }

    const initials = profile.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="border-t border-border p-4">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 w-full rounded-lg p-1 -m-1 hover:bg-muted transition-colors text-left">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={profile.avatarUrl || undefined} alt={profile.displayName} />
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-medium">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{profile.displayName}</p>
                            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                        </div>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-48">
                    <DropdownMenuItem onClick={handleSettings} className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        {microcopy.nav.settings}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        {microcopy.settings.account.logout}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

