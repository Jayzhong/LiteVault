'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { microcopy } from '@/lib/microcopy';
import { useAccountProfile } from '@/lib/hooks/useAccountProfile';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface EditProfileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditProfileModal({ open, onOpenChange }: EditProfileModalProps) {
    const { profile, updateProfile, isUpdatingProfile } = useAccountProfile();

    const [nickname, setNickname] = useState(profile?.nickname || '');
    const [avatarUrl, setAvatarUrl] = useState(profile?.customAvatarUrl || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [error, setError] = useState<string | null>(null);

    // Sync form when modal opens
    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen && profile) {
            setNickname(profile.nickname || '');
            setAvatarUrl(profile.customAvatarUrl || '');
            setBio(profile.bio || '');
            setError(null);
        }
        onOpenChange(isOpen);
    };

    const handleSave = async () => {
        setError(null);

        // Client-side validation
        if (nickname && nickname.length > 40) {
            setError('Nickname must be 40 characters or less');
            return;
        }
        if (avatarUrl && !avatarUrl.match(/^https?:\/\//i)) {
            setError('Avatar URL must start with http:// or https://');
            return;
        }
        if (bio && bio.length > 200) {
            setError('Bio must be 200 characters or less');
            return;
        }

        try {
            await updateProfile({
                nickname: nickname || null,
                avatarUrl: avatarUrl || null,
                bio: bio || null,
            });
            toast.success('Profile updated');
            onOpenChange(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update profile';
            setError(message);
            toast.error(message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{microcopy.settings.account.editProfile}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {error && (
                        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="nickname">Nickname</Label>
                        <Input
                            id="nickname"
                            placeholder="Your display name"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            maxLength={40}
                        />
                        <p className="text-xs text-muted-foreground">
                            {nickname.length}/40 characters
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="avatarUrl">Custom Avatar URL</Label>
                        <Input
                            id="avatarUrl"
                            placeholder="https://example.com/avatar.png"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Leave empty to use your Google/GitHub avatar
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                            id="bio"
                            placeholder="Tell us about yourself..."
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            maxLength={200}
                            rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                            {bio.length}/200 characters
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isUpdatingProfile}
                    >
                        {microcopy.common.cancel}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isUpdatingProfile}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {isUpdatingProfile ? 'Saving...' : microcopy.common.save}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
