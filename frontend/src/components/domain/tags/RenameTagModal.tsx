'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Tag } from '@/lib/types';

interface RenameTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    tag: Tag;
    onRename: (id: string, name: string) => Promise<void>;
}

/**
 * Modal for renaming a tag.
 */
export function RenameTagModal({ isOpen, onClose, tag, onRename }: RenameTagModalProps) {
    const [name, setName] = useState(tag.name);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset name when tag changes
    useEffect(() => {
        setName(tag.name);
    }, [tag.name]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Tag name cannot be empty');
            return;
        }

        if (name.trim() === tag.name) {
            onClose();
            return;
        }

        setIsSubmitting(true);
        try {
            await onRename(tag.id, name.trim());
            toast.success(`Tag renamed to "${name.trim()}"`);
            onClose();
        } catch {
            toast.error('Failed to rename tag. It may already exist.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Rename Tag</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="tag-name">Tag name</Label>
                            <Input
                                id="tag-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter new name"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
