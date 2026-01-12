'use client';

/**
 * useEditorState - State machine hook for the Item Detail Editor
 * 
 * Manages editor state transitions, form state, and dirty tracking.
 * See: docs/architecture/EDITOR_FIRST_NOTE_STATE_MACHINE.md
 */

import { useReducer, useCallback, useMemo } from 'react';
import type { Item, AttachmentInfo } from '@/lib/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type EditorState =
    | 'LOADING'
    | 'LOAD_ERROR'
    | 'VIEWING'
    | 'EDITING'
    | 'VALIDATING'
    | 'SAVING'
    | 'SAVED'
    | 'SAVE_FAILED'
    | 'CONFIRM_DISCARD';

export interface EditorFormState {
    title: string;
    originalText: string;
    tags: string[]; // Tag names
}

export interface ValidationError {
    field: string;
    message: string;
}

export interface AttachmentUpload {
    localId: string;
    file: File;
    state: 'PENDING' | 'INITIATING' | 'UPLOADING' | 'COMPLETING' | 'UPLOADED' | 'FAILED';
    progress: number;
    error?: string;
    uploadId?: string;
    attachmentId?: string;
}

export interface EditorDirtyState {
    title: boolean;
    originalText: boolean;
    tags: boolean;
    pendingUploads: boolean;
    pendingDeletions: boolean;
}

interface EditorReducerState {
    editorState: EditorState;
    form: EditorFormState;
    originalForm: EditorFormState;
    validationErrors: ValidationError[];
    saveError: string | null;
    loadError: string | null;
    attachmentUploads: AttachmentUpload[];
    deletedAttachmentIds: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

type EditorAction =
    | { type: 'LOAD_SUCCESS'; item: Item }
    | { type: 'LOAD_FAILURE'; error: string }
    | { type: 'RETRY_LOAD' }
    | { type: 'SET_FIELD'; field: keyof EditorFormState; value: string | string[] }
    | { type: 'ADD_TAG'; tag: string }
    | { type: 'REMOVE_TAG'; tag: string }
    | { type: 'SAVE_CLICKED' }
    | { type: 'VALIDATION_PASSED' }
    | { type: 'VALIDATION_FAILED'; errors: ValidationError[] }
    | { type: 'SAVE_SUCCESS' }
    | { type: 'SAVE_FAILURE'; error: string }
    | { type: 'CLOSE_CLICKED' }
    | { type: 'DISCARD_CONFIRMED' }
    | { type: 'KEEP_EDITING' }
    | { type: 'CANCEL_CLICKED' }
    | { type: 'RESET'; item: Item }
    | { type: 'ADD_UPLOAD'; upload: AttachmentUpload }
    | { type: 'UPDATE_UPLOAD'; localId: string; updates: Partial<AttachmentUpload> }
    | { type: 'REMOVE_UPLOAD'; localId: string }
    | { type: 'DELETE_ATTACHMENT'; attachmentId: string }
    | { type: 'UNDO_DELETE_ATTACHMENT'; attachmentId: string };

// ─────────────────────────────────────────────────────────────────────────────
// Initial State Factory
// ─────────────────────────────────────────────────────────────────────────────

function createInitialState(item?: Item): EditorReducerState {
    const form: EditorFormState = item
        ? {
            title: item.title || '',
            originalText: item.rawText,
            tags: item.tags.map((t) => t.name),
        }
        : { title: '', originalText: '', tags: [] };

    return {
        editorState: item ? 'VIEWING' : 'LOADING',
        form,
        originalForm: { ...form },
        validationErrors: [],
        saveError: null,
        loadError: null,
        attachmentUploads: [],
        deletedAttachmentIds: [],
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────────────────────

function editorReducer(
    state: EditorReducerState,
    action: EditorAction
): EditorReducerState {
    switch (action.type) {
        case 'LOAD_SUCCESS': {
            const form: EditorFormState = {
                title: action.item.title || '',
                originalText: action.item.rawText,
                tags: action.item.tags.map((t) => t.name),
            };
            return {
                ...state,
                editorState: 'VIEWING',
                form,
                originalForm: { ...form },
                loadError: null,
            };
        }

        case 'LOAD_FAILURE':
            return {
                ...state,
                editorState: 'LOAD_ERROR',
                loadError: action.error,
            };

        case 'RETRY_LOAD':
            return {
                ...state,
                editorState: 'LOADING',
                loadError: null,
            };

        case 'SET_FIELD': {
            const newForm = { ...state.form, [action.field]: action.value };
            const hasChanges = !formsEqual(newForm, state.originalForm);
            return {
                ...state,
                form: newForm,
                editorState: hasChanges ? 'EDITING' : 'VIEWING',
                validationErrors: state.validationErrors.filter(
                    (e) => e.field !== action.field
                ),
            };
        }

        case 'ADD_TAG': {
            if (state.form.tags.includes(action.tag)) return state;
            const newTags = [...state.form.tags, action.tag];
            const newForm = { ...state.form, tags: newTags };
            return {
                ...state,
                form: newForm,
                editorState: !formsEqual(newForm, state.originalForm)
                    ? 'EDITING'
                    : 'VIEWING',
            };
        }

        case 'REMOVE_TAG': {
            const newTags = state.form.tags.filter((t) => t !== action.tag);
            const newForm = { ...state.form, tags: newTags };
            return {
                ...state,
                form: newForm,
                editorState: !formsEqual(newForm, state.originalForm)
                    ? 'EDITING'
                    : 'VIEWING',
            };
        }

        case 'SAVE_CLICKED':
            return {
                ...state,
                editorState: 'VALIDATING',
                saveError: null,
            };

        case 'VALIDATION_PASSED':
            return {
                ...state,
                editorState: 'SAVING',
                validationErrors: [],
            };

        case 'VALIDATION_FAILED':
            return {
                ...state,
                editorState: 'EDITING',
                validationErrors: action.errors,
            };

        case 'SAVE_SUCCESS':
            return {
                ...state,
                editorState: 'SAVED',
                originalForm: { ...state.form },
                saveError: null,
                deletedAttachmentIds: [],
                attachmentUploads: state.attachmentUploads.filter(
                    (u) => u.state !== 'UPLOADED'
                ),
            };

        case 'SAVE_FAILURE':
            return {
                ...state,
                editorState: 'SAVE_FAILED',
                saveError: action.error,
            };

        case 'CLOSE_CLICKED': {
            const dirty = calculateDirtyState(state);
            if (Object.values(dirty).some(Boolean)) {
                return { ...state, editorState: 'CONFIRM_DISCARD' };
            }
            return state; // Let the component handle closing
        }

        case 'DISCARD_CONFIRMED':
            return {
                ...state,
                form: { ...state.originalForm },
                editorState: 'VIEWING',
                deletedAttachmentIds: [],
                attachmentUploads: [],
            };

        case 'KEEP_EDITING':
            return {
                ...state,
                editorState: 'EDITING',
            };

        case 'CANCEL_CLICKED':
            return {
                ...state,
                form: { ...state.originalForm },
                editorState: 'VIEWING',
                validationErrors: [],
            };

        case 'RESET': {
            const form: EditorFormState = {
                title: action.item.title || '',
                originalText: action.item.rawText,
                tags: action.item.tags.map((t) => t.name),
            };
            return {
                ...createInitialState(action.item),
                form,
                originalForm: { ...form },
            };
        }

        case 'ADD_UPLOAD':
            return {
                ...state,
                attachmentUploads: [...state.attachmentUploads, action.upload],
                editorState: 'EDITING',
            };

        case 'UPDATE_UPLOAD':
            return {
                ...state,
                attachmentUploads: state.attachmentUploads.map((u) =>
                    u.localId === action.localId ? { ...u, ...action.updates } : u
                ),
            };

        case 'REMOVE_UPLOAD':
            return {
                ...state,
                attachmentUploads: state.attachmentUploads.filter(
                    (u) => u.localId !== action.localId
                ),
            };

        case 'DELETE_ATTACHMENT':
            return {
                ...state,
                deletedAttachmentIds: [
                    ...state.deletedAttachmentIds,
                    action.attachmentId,
                ],
                editorState: 'EDITING',
            };

        case 'UNDO_DELETE_ATTACHMENT':
            return {
                ...state,
                deletedAttachmentIds: state.deletedAttachmentIds.filter(
                    (id) => id !== action.attachmentId
                ),
            };

        default:
            return state;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formsEqual(a: EditorFormState, b: EditorFormState): boolean {
    return (
        a.title === b.title &&
        a.originalText === b.originalText &&
        arraysEqual(a.tags.slice().sort(), b.tags.slice().sort())
    );
}

function arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function calculateDirtyState(state: EditorReducerState): EditorDirtyState {
    return {
        title: state.form.title !== state.originalForm.title,
        originalText: state.form.originalText !== state.originalForm.originalText,
        tags: !arraysEqual(
            state.form.tags.slice().sort(),
            state.originalForm.tags.slice().sort()
        ),
        pendingUploads: state.attachmentUploads.some(
            (u) => u.state !== 'UPLOADED' && u.state !== 'FAILED'
        ),
        pendingDeletions: state.deletedAttachmentIds.length > 0,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseEditorStateResult {
    // State
    editorState: EditorState;
    form: EditorFormState;
    validationErrors: ValidationError[];
    saveError: string | null;
    loadError: string | null;
    dirtyState: EditorDirtyState;
    hasUnsavedChanges: boolean;
    attachmentUploads: AttachmentUpload[];
    deletedAttachmentIds: string[];

    // Form actions
    setField: (field: keyof EditorFormState, value: string | string[]) => void;
    addTag: (tag: string) => void;
    removeTag: (tag: string) => void;

    // Lifecycle actions
    save: () => void;
    cancel: () => void;
    close: () => void;
    keepEditing: () => void;
    discardChanges: () => void;
    reset: (item: Item) => void;

    // Loading actions
    loadSuccess: (item: Item) => void;
    loadFailure: (error: string) => void;
    retryLoad: () => void;

    // Save flow actions
    validationPassed: () => void;
    validationFailed: (errors: ValidationError[]) => void;
    saveSuccess: () => void;
    saveFailure: (error: string) => void;

    // Attachment actions
    addUpload: (upload: AttachmentUpload) => void;
    updateUpload: (localId: string, updates: Partial<AttachmentUpload>) => void;
    removeUpload: (localId: string) => void;
    deleteAttachment: (attachmentId: string) => void;
    undoDeleteAttachment: (attachmentId: string) => void;
}

export function useEditorState(initialItem?: Item): UseEditorStateResult {
    const [state, dispatch] = useReducer(
        editorReducer,
        initialItem,
        createInitialState
    );

    const dirtyState = useMemo(() => calculateDirtyState(state), [state]);
    const hasUnsavedChanges = useMemo(
        () => Object.values(dirtyState).some(Boolean),
        [dirtyState]
    );

    // Form actions
    const setField = useCallback(
        (field: keyof EditorFormState, value: string | string[]) => {
            dispatch({ type: 'SET_FIELD', field, value });
        },
        []
    );

    const addTag = useCallback((tag: string) => {
        dispatch({ type: 'ADD_TAG', tag });
    }, []);

    const removeTag = useCallback((tag: string) => {
        dispatch({ type: 'REMOVE_TAG', tag });
    }, []);

    // Lifecycle actions
    const save = useCallback(() => {
        dispatch({ type: 'SAVE_CLICKED' });
    }, []);

    const cancel = useCallback(() => {
        dispatch({ type: 'CANCEL_CLICKED' });
    }, []);

    const close = useCallback(() => {
        dispatch({ type: 'CLOSE_CLICKED' });
    }, []);

    const keepEditing = useCallback(() => {
        dispatch({ type: 'KEEP_EDITING' });
    }, []);

    const discardChanges = useCallback(() => {
        dispatch({ type: 'DISCARD_CONFIRMED' });
    }, []);

    const reset = useCallback((item: Item) => {
        dispatch({ type: 'RESET', item });
    }, []);

    // Loading actions
    const loadSuccess = useCallback((item: Item) => {
        dispatch({ type: 'LOAD_SUCCESS', item });
    }, []);

    const loadFailure = useCallback((error: string) => {
        dispatch({ type: 'LOAD_FAILURE', error });
    }, []);

    const retryLoad = useCallback(() => {
        dispatch({ type: 'RETRY_LOAD' });
    }, []);

    // Save flow actions
    const validationPassed = useCallback(() => {
        dispatch({ type: 'VALIDATION_PASSED' });
    }, []);

    const validationFailed = useCallback((errors: ValidationError[]) => {
        dispatch({ type: 'VALIDATION_FAILED', errors });
    }, []);

    const saveSuccess = useCallback(() => {
        dispatch({ type: 'SAVE_SUCCESS' });
    }, []);

    const saveFailure = useCallback((error: string) => {
        dispatch({ type: 'SAVE_FAILURE', error });
    }, []);

    // Attachment actions
    const addUpload = useCallback((upload: AttachmentUpload) => {
        dispatch({ type: 'ADD_UPLOAD', upload });
    }, []);

    const updateUpload = useCallback(
        (localId: string, updates: Partial<AttachmentUpload>) => {
            dispatch({ type: 'UPDATE_UPLOAD', localId, updates });
        },
        []
    );

    const removeUpload = useCallback((localId: string) => {
        dispatch({ type: 'REMOVE_UPLOAD', localId });
    }, []);

    const deleteAttachment = useCallback((attachmentId: string) => {
        dispatch({ type: 'DELETE_ATTACHMENT', attachmentId });
    }, []);

    const undoDeleteAttachment = useCallback((attachmentId: string) => {
        dispatch({ type: 'UNDO_DELETE_ATTACHMENT', attachmentId });
    }, []);

    return {
        // State
        editorState: state.editorState,
        form: state.form,
        validationErrors: state.validationErrors,
        saveError: state.saveError,
        loadError: state.loadError,
        dirtyState,
        hasUnsavedChanges,
        attachmentUploads: state.attachmentUploads,
        deletedAttachmentIds: state.deletedAttachmentIds,

        // Form actions
        setField,
        addTag,
        removeTag,

        // Lifecycle actions
        save,
        cancel,
        close,
        keepEditing,
        discardChanges,
        reset,

        // Loading actions
        loadSuccess,
        loadFailure,
        retryLoad,

        // Save flow actions
        validationPassed,
        validationFailed,
        saveSuccess,
        saveFailure,

        // Attachment actions
        addUpload,
        updateUpload,
        removeUpload,
        deleteAttachment,
        undoDeleteAttachment,
    };
}
