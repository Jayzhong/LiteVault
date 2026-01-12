'use client';

/**
 * EditorProvider - Context provider for the Item Detail Editor
 * 
 * Provides editor state, form values, and actions to all child components.
 * See: docs/architecture/EDITOR_FIRST_NOTE_STATE_MACHINE.md
 */

import React, { createContext, useContext, useCallback, useEffect, useMemo } from 'react';
import { useEditorState, EditorState, EditorFormState, ValidationError, EditorDirtyState, AttachmentUpload } from '@/lib/hooks/useEditorState';
import { useEditorSave, validateEditorForm, calculateTagChanges, SavePayload } from '@/lib/hooks/useEditorSave';
import { useUnsavedChangesGuard, createGuardedClose } from '@/lib/hooks/useUnsavedChangesGuard';
import { useAppContext } from '@/lib/store/AppContext';
import type { Item, TagInItem } from '@/lib/types';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Context Value Type
// ─────────────────────────────────────────────────────────────────────────────

export interface EditorContextValue {
    // Item
    item: Item;

    // State
    editorState: EditorState;
    form: EditorFormState;
    validationErrors: ValidationError[];
    saveError: string | null;
    loadError: string | null;
    dirtyState: EditorDirtyState;
    hasUnsavedChanges: boolean;

    // Attachments
    attachmentUploads: AttachmentUpload[];
    deletedAttachmentIds: string[];

    // Form actions
    setTitle: (title: string) => void;
    setOriginalText: (text: string) => void;
    addTag: (tag: string) => void;
    removeTag: (tag: string) => void;

    // Lifecycle actions
    save: () => Promise<void>;
    confirm: () => Promise<void>;
    discard: () => Promise<void>;
    cancel: () => void;

    // Unsaved changes dialog
    showUnsavedDialog: boolean;
    onKeepEditing: () => void;
    onDiscardChanges: () => void;

    // Attachment actions
    addUpload: (upload: AttachmentUpload) => void;
    updateUpload: (localId: string, updates: Partial<AttachmentUpload>) => void;
    removeUpload: (localId: string) => void;
    deleteAttachment: (attachmentId: string) => void;
    undoDeleteAttachment: (attachmentId: string) => void;

    // Flags
    isSaving: boolean;
    canEdit: boolean;
    canConfirm: boolean;
    canDiscard: boolean;
}

const EditorContext = createContext<EditorContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Hook to use editor context
// ─────────────────────────────────────────────────────────────────────────────

export function useEditorContext(): EditorContextValue {
    const context = useContext(EditorContext);
    if (!context) {
        throw new Error('useEditorContext must be used within an EditorProvider');
    }
    return context;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider Props
// ─────────────────────────────────────────────────────────────────────────────

interface EditorProviderProps {
    item: Item;
    onClose: () => void;
    onUpdate?: (item: Item) => void;
    onDiscard?: (itemId: string) => void;
    children: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────────────────────────────────────

export function EditorProvider({
    item,
    onClose,
    onUpdate,
    onDiscard,
    children,
}: EditorProviderProps) {
    // Get available tags from context
    const { tags: availableTags } = useAppContext();

    // Editor state machine
    const editorState = useEditorState(item);

    // Save mutation
    const saveMutation = useEditorSave({
        onSuccess: () => {
            editorState.saveSuccess();
            toast.success('Changes saved.');
        },
        onError: (error) => {
            editorState.saveFailure(error.message);
            toast.error('Couldn\'t save. Please try again.');
        },
    });

    // Unsaved changes guard
    const unsavedGuard = useUnsavedChangesGuard({
        hasChanges: editorState.hasUnsavedChanges,
        enabled: true,
    });

    // Auto-close after successful save
    useEffect(() => {
        if (editorState.editorState === 'SAVED') {
            onClose();
        }
    }, [editorState.editorState, onClose]);

    // Reset when item changes
    useEffect(() => {
        editorState.reset(item);
    }, [item.id]); // Only reset when item ID changes

    // ─────────────────────────────────────────────────────────────────────────
    // Form actions
    // ─────────────────────────────────────────────────────────────────────────

    const setTitle = useCallback((title: string) => {
        editorState.setField('title', title);
    }, [editorState]);

    const setOriginalText = useCallback((text: string) => {
        editorState.setField('originalText', text);
    }, [editorState]);

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle actions
    // ─────────────────────────────────────────────────────────────────────────

    const save = useCallback(async () => {
        // Validate
        const validation = validateEditorForm({
            title: editorState.form.title,
            originalText: editorState.form.originalText,
        });

        if (!validation.isValid) {
            editorState.validationFailed(validation.errors);
            return;
        }

        editorState.validationPassed();

        // Calculate tag changes
        const tagChanges = calculateTagChanges(
            item.tags,
            editorState.form.tags,
            (availableTags || []).map(t => ({ id: t.id, name: t.name }))
        );

        // Build payload
        const payload: SavePayload = {
            type: 'update',
            title: editorState.form.title !== item.title ? editorState.form.title : undefined,
            originalText: editorState.form.originalText !== item.rawText ? editorState.form.originalText : undefined,
            addedTagIds: tagChanges.addedTagIds.length > 0 ? tagChanges.addedTagIds : undefined,
            removedTagIds: tagChanges.removedTagIds.length > 0 ? tagChanges.removedTagIds : undefined,
        };

        try {
            await saveMutation.save(item.id, payload);
        } catch {
            // Error handled in mutation callbacks
        }
    }, [editorState, item, availableTags, saveMutation]);

    const confirm = useCallback(async () => {
        editorState.validationPassed();

        // Build confirm payload
        const payload: SavePayload = {
            type: 'confirm',
            title: editorState.form.title !== item.title ? editorState.form.title : undefined,
            // Note: suggested tags handling would be added here
        };

        try {
            await saveMutation.save(item.id, payload);
            toast.success('Saved to Library.');
        } catch {
            // Error handled in mutation callbacks
        }
    }, [editorState, item.id, item.title, saveMutation]);

    const discard = useCallback(async () => {
        try {
            await saveMutation.save(item.id, { type: 'discard' });
            toast.success('Discarded.');
            onDiscard?.(item.id);
            onClose();
        } catch {
            toast.error('Couldn\'t discard. Please try again.');
        }
    }, [item.id, saveMutation, onDiscard, onClose]);

    const cancel = useCallback(() => {
        if (editorState.hasUnsavedChanges) {
            unsavedGuard.setPendingAction(() => {
                editorState.discardChanges();
                onClose();
            });
            editorState.close();
        } else {
            onClose();
        }
    }, [editorState, unsavedGuard, onClose]);

    // ─────────────────────────────────────────────────────────────────────────
    // Computed flags
    // ─────────────────────────────────────────────────────────────────────────

    const canEdit = useMemo(() => {
        return item.status === 'ARCHIVED' || item.status === 'READY_TO_CONFIRM';
    }, [item.status]);

    const canConfirm = useMemo(() => {
        return item.status === 'READY_TO_CONFIRM';
    }, [item.status]);

    const canDiscard = useMemo(() => {
        return ['READY_TO_CONFIRM', 'FAILED', 'ARCHIVED'].includes(item.status);
    }, [item.status]);

    // ─────────────────────────────────────────────────────────────────────────
    // Context value
    // ─────────────────────────────────────────────────────────────────────────

    const value: EditorContextValue = useMemo(() => ({
        // Item
        item,

        // State
        editorState: editorState.editorState,
        form: editorState.form,
        validationErrors: editorState.validationErrors,
        saveError: editorState.saveError,
        loadError: editorState.loadError,
        dirtyState: editorState.dirtyState,
        hasUnsavedChanges: editorState.hasUnsavedChanges,

        // Attachments
        attachmentUploads: editorState.attachmentUploads,
        deletedAttachmentIds: editorState.deletedAttachmentIds,

        // Form actions
        setTitle,
        setOriginalText,
        addTag: editorState.addTag,
        removeTag: editorState.removeTag,

        // Lifecycle actions
        save,
        confirm,
        discard,
        cancel,

        // Unsaved changes dialog
        showUnsavedDialog: unsavedGuard.showConfirmDialog || editorState.editorState === 'CONFIRM_DISCARD',
        onKeepEditing: () => {
            unsavedGuard.onCancelDiscard();
            editorState.keepEditing();
        },
        onDiscardChanges: () => {
            unsavedGuard.onConfirmDiscard();
            editorState.discardChanges();
        },

        // Attachment actions
        addUpload: editorState.addUpload,
        updateUpload: editorState.updateUpload,
        removeUpload: editorState.removeUpload,
        deleteAttachment: editorState.deleteAttachment,
        undoDeleteAttachment: editorState.undoDeleteAttachment,

        // Flags
        isSaving: editorState.editorState === 'SAVING' || saveMutation.isPending,
        canEdit,
        canConfirm,
        canDiscard,
    }), [
        item,
        editorState,
        setTitle,
        setOriginalText,
        save,
        confirm,
        discard,
        cancel,
        unsavedGuard,
        saveMutation.isPending,
        canEdit,
        canConfirm,
        canDiscard,
    ]);

    return (
        <EditorContext.Provider value={value}>
            {children}
        </EditorContext.Provider>
    );
}
