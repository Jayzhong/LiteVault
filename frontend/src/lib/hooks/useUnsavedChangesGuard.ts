'use client';

/**
 * useUnsavedChangesGuard - Prevents accidental navigation with unsaved changes
 * 
 * Registers browser beforeunload event and provides state for showing
 * confirmation dialogs within the app.
 * See: docs/architecture/EDITOR_FIRST_NOTE_STATE_MACHINE.md
 */

import { useEffect, useCallback, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UseUnsavedChangesGuardOptions {
    /**
     * Whether there are unsaved changes that should be protected
     */
    hasChanges: boolean;

    /**
     * Custom message for the browser dialog (note: most browsers ignore custom messages)
     */
    message?: string;

    /**
     * Whether to enable the guard (useful for disabling during save)
     */
    enabled?: boolean;
}

export interface UseUnsavedChangesGuardResult {
    /**
     * Whether the confirmation dialog should be shown
     */
    showConfirmDialog: boolean;

    /**
     * Call this when user wants to leave/close but has unsaved changes
     * Returns true if they should be allowed to leave (no changes or already confirmed)
     */
    confirmNavigation: () => boolean;

    /**
     * Call this when user confirms they want to discard changes
     */
    onConfirmDiscard: () => void;

    /**
     * Call this when user cancels and wants to keep editing
     */
    onCancelDiscard: () => void;

    /**
     * Pending callback to execute after discard confirmation
     */
    pendingAction: (() => void) | null;

    /**
     * Set a pending action to execute after user confirms discard
     */
    setPendingAction: (action: (() => void) | null) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useUnsavedChangesGuard(
    options: UseUnsavedChangesGuardOptions
): UseUnsavedChangesGuardResult {
    const { hasChanges, message = 'You have unsaved changes.', enabled = true } = options;

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

    // Browser beforeunload event - prevents tab close/refresh
    useEffect(() => {
        if (!enabled) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (hasChanges) {
                event.preventDefault();
                // Modern browsers require returnValue to be set
                event.returnValue = message;
                return message;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasChanges, message, enabled]);

    // Check if navigation should be blocked
    const confirmNavigation = useCallback((): boolean => {
        if (!enabled || !hasChanges) {
            return true; // Allow navigation
        }
        setShowConfirmDialog(true);
        return false; // Block navigation, show dialog
    }, [enabled, hasChanges]);

    // User confirms they want to discard
    const onConfirmDiscard = useCallback(() => {
        setShowConfirmDialog(false);
        if (pendingAction) {
            pendingAction();
            setPendingAction(null);
        }
    }, [pendingAction]);

    // User cancels and wants to keep editing
    const onCancelDiscard = useCallback(() => {
        setShowConfirmDialog(false);
        setPendingAction(null);
    }, []);

    return {
        showConfirmDialog,
        confirmNavigation,
        onConfirmDiscard,
        onCancelDiscard,
        pendingAction,
        setPendingAction,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Create guarded close handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a close handler that checks for unsaved changes before closing
 * 
 * @example
 * const guard = useUnsavedChangesGuard({ hasChanges: true });
 * const handleClose = createGuardedClose(guard, () => onClose());
 */
export function createGuardedClose(
    guard: UseUnsavedChangesGuardResult,
    onClose: () => void
): () => void {
    return () => {
        const canClose = guard.confirmNavigation();
        if (canClose) {
            onClose();
        } else {
            // Store the close action to execute after confirmation
            guard.setPendingAction(() => onClose);
        }
    };
}
