'use client';

import { microcopy, t } from '@/lib/microcopy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const mockUser = {
    name: 'Alex Chen',
    email: 'alex@example.com',
    avatarUrl: undefined,
    memberSince: 2024,
};

export function AccountCard() {
    const initials = mockUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase();

    const handleLogout = () => {
        toast.info('Logout would be triggered here');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{microcopy.settings.section.account}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={mockUser.avatarUrl} alt={mockUser.name} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg font-medium">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <p className="font-medium text-foreground">{mockUser.name}</p>
                        <p className="text-sm text-muted-foreground">{mockUser.email}</p>
                        <p className="text-xs text-muted-foreground">
                            {t('settings.account.memberSince', { year: mockUser.memberSince })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t">
                    <Button variant="outline" size="sm">
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
    );
}
