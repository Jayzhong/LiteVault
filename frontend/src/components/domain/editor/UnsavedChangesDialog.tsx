'use client';

/**
 * UnsavedChangesDialog - Confirmation dialog for discarding unsaved changes
 * 
 * See: docs/design/EDITOR_FIRST_NOTE_SPEC.md
 */

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UnsavedChangesDialogProps {
    isOpen: boolean;
    onKeepEditing: () => void;
    onDiscard: () => void;
}

export function UnsavedChangesDialog({
    isOpen,
    onKeepEditing,
    onDiscard,
}: UnsavedChangesDialogProps) {
    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onKeepEditing()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have unsaved changes. Discard them?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onKeepEditing}>
                        Keep editing
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={onDiscard}>
                        Discard changes
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default UnsavedChangesDialog;
