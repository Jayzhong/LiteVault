'use client';

import { microcopy, t } from '@/lib/microcopy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useClerk, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import { useAccountProfile } from '@/lib/hooks/useAccountProfile';
import { useState } from 'react';
import { EditProfileModal } from './EditProfileModal';

export function AccountCard() {
    const { signOut } = useClerk();
    const { profile, isLoading, isSignedIn, error, refetch } = useAccountProfile();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await signOut();
        } catch {
            toast.error('Failed to sign out');
        }
    };

    // Signed out: redirect to login
    if (!isSignedIn && !isLoading) {
        return (
            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>
        );
    }

    // Loading state
    if (isLoading || !profile) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{microcopy.settings.section.account}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{microcopy.settings.section.account}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                        Failed to load profile.
                        <Button
                            variant="link"
                            className="text-destructive p-0 h-auto ml-2"
                            onClick={() => refetch()}
                        >
                            {microcopy.common.retry}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const initials = profile.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <SignedIn>
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{microcopy.settings.section.account}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={profile.avatarUrl || undefined} alt={profile.displayName} />
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg font-medium">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <p className="font-medium text-foreground">{profile.displayName}</p>
                            <p className="text-sm text-muted-foreground">{profile.email}</p>
                            <p className="text-xs text-muted-foreground">
                                {t('settings.account.memberSince', { year: profile.memberSinceYear })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditModalOpen(true)}
                        >
                            {microcopy.settings.account.editProfile}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleLogout}>
                            {microcopy.settings.account.logout}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            {microcopy.settings.account.deleteAccount}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <EditProfileModal
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
            />
        </SignedIn>
    );
}
