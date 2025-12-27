'use client';

import { useState } from 'react';
import { microcopy } from '@/lib/microcopy';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CreateTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
}

export function CreateTagModal({ isOpen, onClose, onCreate }: CreateTagModalProps) {
    const [name, setName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setIsCreating(true);
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 300));
        onCreate(name.trim());
        setName('');
        setIsCreating(false);
    };

    const handleClose = () => {
        setName('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{microcopy.tags.createModal.title}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <label className="text-sm font-medium text-foreground">
                        {microcopy.tags.createModal.fieldLabel}
                    </label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={microcopy.tags.createModal.placeholder}
                        className="mt-2"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && name.trim()) {
                                handleCreate();
                            }
                        }}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isCreating}>
                        {microcopy.tags.createModal.cancel}
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={!name.trim() || isCreating}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {isCreating ? 'Creating...' : microcopy.tags.createModal.confirm}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
