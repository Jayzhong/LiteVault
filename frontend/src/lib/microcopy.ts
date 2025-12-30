/**
 * LiteVault Microcopy Module
 * Source: /docs/design/MICROCOPY.md
 * 
 * All UI strings are defined here. Never hardcode copy in components.
 */

export const microcopy = {
    // Global
    app: {
        name: 'LiteVault',
    },
    common: {
        loading: 'Loading...',
        retry: 'Retry',
        cancel: 'Cancel',
        close: 'Close',
        save: 'Save',
        search: 'Search',
        ask: 'Ask →',
        edit: 'Edit',
        done: 'Done',
    },
    toast: {
        savedGenerating: 'Saved. Generating insight…',
        savedToLibrary: 'Saved to Library.',
        discarded: 'Discarded.',
        actionFailed: 'Something went wrong. Please try again.',
        networkError: 'Network error. Please check your connection.',
        original_text_saved: 'Original text updated.',
        original_text_error: "Couldn't save changes. Please try again.",
    },

    // Sidebar
    nav: {
        home: 'Home',
        search: 'Search',
        library: 'Library',
        settings: 'Settings',
        menu: 'Menu',
    },

    // Home
    home: {
        greeting: 'Good Morning, {name}.',
        subtitle: 'What is growing in your mind today?',
        capture: {
            placeholder: 'Capture your thought...',
            action: 'Save',
            disabledHint: 'Write something to save.',
            toggle: {
                label: 'AI suggestions',
                onHint: 'AI will suggest title and tags',
                offHint: 'Save directly to Library',
                tooltip: 'AI enhancement: generate title/summary/suggested tags',
            },
            tagHint: 'Type # to add tags',
        },
        pending: {
            title: 'PENDING REVIEW',
            status: {
                enriching: 'Enriching...',
                ready: 'Ready to confirm',
                failedTitle: "Couldn't generate insight",
                failedHelp: 'Please try again.',
            },
            action: {
                open: 'Open',
                retry: 'Retry',
            },
            empty: {
                title: 'Nothing pending',
                copy: 'Save a thought to start building your vault.',
            },
            error: {
                title: "Couldn't load pending items.",
                action: 'Retry',
            },
        },
    },

    // Insight Modal
    modal: {
        insight: {
            badge: 'AI INSIGHT',
            title: 'Insight Summary',
            suggested_tags: {
                title: 'Suggested by AI',
                empty: 'No suggestions available',
            },
            your_tags: {
                title: 'Your tags',
                add: '+ Add from library',
            },
            tags: {
                add: 'Add Tag',
            },
            action: {
                discard: 'Discard',
                confirm: 'Confirm & Save',
                confirmLoading: 'Saving…',
            },
            error: {
                saveFailed: "Couldn't save. Please try again.",
                discardFailed: "Couldn't discard. Please try again.",
                tagFailed: "Couldn't update tags. Please try again.",
            },
        },
        // Item Detail Modal (Library/Search)
        detail: {
            original_text: {
                title: 'Original Text',
                edit: 'Edit',
                save: 'Save changes',
                cancel: 'Cancel',
            },
            action: {
                edit: 'Edit',
                save: 'Save',
                cancel: 'Cancel',
                saving: 'Saving…',
            },
            edit: {
                titleLabel: 'Title',
                summaryLabel: 'Summary',
                tagsLabel: 'Tags',
            },
            error: {
                saveFailed: "Couldn't save changes. Please try again.",
            },
        },
    },

    // TagPicker
    tagPicker: {
        placeholder: 'Search tags…',
        noResults: 'No tags found',
        createNew: 'Create "{tag}"',
    },

    // Discard Dialog
    dialog: {
        discard: {
            title: 'Discard this item?',
            copy: "You can't undo this action.",
            cancel: 'Cancel',
            confirm: 'Discard',
        },
    },

    // Search (V1 - Lexical Search)
    search: {
        title: 'Search',
        empty: {
            greeting: 'Good Morning, {name}.',
            subtitle: 'What are you looking for today?',
            placeholder: 'Search your vault...',
            action: 'Search',
        },
        query: {
            placeholder: 'Search your vault...',
            hint: 'Use #tag to search tags only',
            tagChip: '# Tag',
        },
        action: {
            search: 'Search',
        },
        mode: {
            tagOnly: 'Showing tag matches',
            combined: 'Showing all matches',
        },
        loading: 'Searching...',
        emptyResults: {
            title: 'No matches found',
            copyTag: 'No items have matching tags.',
            copyCombined: 'Try a different search or save more notes to your vault.',
            actionClear: 'Clear search',
            actionHome: 'Go to Home',
        },
        error: {
            title: 'Search failed.',
            copy: 'Please try again.',
            action: 'Retry',
        },
        // V2 Deferred - Semantic Search keys (kept for existing V2 components)
        section: { answer: '✨ Synthesized Answer', evidence: 'Evidence' },
        badge: { sources: '{n} sources' },
        feedback: { helpful: 'Helpful', notHelpful: 'Not helpful' },
    },

    // Evidence
    evidence: {
        type: {
            note: 'NOTE',
            article: 'ARTICLE',
        },
    },

    // Library
    library: {
        title: 'Library',
        search: {
            placeholder: 'Search your vault...',
        },
        group: {
            today: 'TODAY',
            yesterday: 'YESTERDAY',
            last7days: 'LAST 7 DAYS',
        },
        empty: {
            title: 'Your library is empty',
            copy: 'Save a thought on Home, then confirm it to see it here.',
            action: 'Go to Home',
        },
        error: {
            title: "Couldn't load your library.",
            action: 'Retry',
        },
    },

    // Settings
    settings: {
        title: 'Settings',
        subtitle: 'Manage your account, preferences, and data.',
        section: {
            account: 'Account',
            preferences: 'Preferences',
            tags: 'Tags',
        },
        account: {
            editProfile: 'Edit Profile',
            logout: 'Log out',
            memberSince: 'Member since {year}',
            deleteAccount: 'Delete account',
        },
        preferences: {
            defaultLanguage: 'Default Language',
            timezone: 'Timezone',
            aiToggle: {
                title: 'AI suggested tags and summary',
                help: 'Automatically generate tags and summaries for new items.',
            },
        },
        tags: {
            title: 'Tag Management',
            summary: 'You currently have {n} active tags in your library.',
            manage: 'Manage tags',
        },
    },

    // Tag Management
    tags: {
        breadcrumb: 'Settings / Tag Management',
        title: 'Tag Management',
        subtitle: 'Organize your knowledge base by renaming, merging, or cleaning up unused tags.',
        action: {
            analytics: 'Tag Analytics',
            create: 'Create New Tag',
        },
        search: {
            placeholder: 'Search tags...',
        },
        sort: {
            label: 'Sort by Name',
        },
        toggle: {
            unused: 'Show Unused',
        },
        table: {
            col: {
                name: 'TAG NAME',
                usage: 'USAGE COUNT',
                lastUsed: 'LAST USED',
                actions: 'ACTIONS',
            },
            usageNotes: '{n} notes',
            unusedBadge: 'UNUSED',
        },
        empty: {
            title: 'No tags yet',
            copy: 'Confirm an item with tags to see them here.',
            action: 'Go to Home',
        },
        emptyFiltered: {
            title: 'No tags match your filters',
            action: 'Clear filters',
        },
        error: {
            title: "Couldn't load tags.",
            action: 'Retry',
        },
        createModal: {
            title: 'Create a new tag',
            fieldLabel: 'Tag name',
            placeholder: 'e.g. Design',
            cancel: 'Cancel',
            confirm: 'Create',
        },
        renameModal: {
            title: 'Rename tag',
            fieldLabel: 'New name',
            cancel: 'Cancel',
            confirm: 'Save',
        },
        deleteDialog: {
            title: 'Delete this tag?',
            copy: 'This will remove the tag from all items.',
            cancel: 'Cancel',
            confirm: 'Delete',
        },
    },

    // Auth
    auth: {
        signup: {
            title: 'Start your collection',
            subtitle: 'Your personal space for calm knowledge.',
            action: 'Create free account',
        },
        login: {
            title: 'Welcome back',
            subtitle: 'Capture your thoughts, organized and safe.',
            action: 'Sign In',
        },
        continueGoogle: 'Continue with Google',
        continueGithub: 'Continue with GitHub',
        orEmail: 'Or sign up with email',
        orEmailLogin: 'OR WITH EMAIL',
        email: {
            label: 'Email address',
            placeholder: 'name@example.com',
        },
        password: {
            label: 'Password',
            placeholder: 'At least 8 characters',
        },
        forgotPassword: 'Forgot password?',
        terms: 'Terms of Service',
        privacy: 'Privacy Policy',
        loginLink: 'Already a member? Log in',
        signupLink: "Don't have an account? Create an account",
        contactSupport: 'Contact Support',
        error: {
            invalidCredentials: 'Invalid email or password.',
            oauthFailed: 'Authentication failed. Please try again.',
            generic: "Couldn't sign you in. Please try again.",
        },
    },
} as const;

/**
 * Get a microcopy string with interpolation support
 * @param key - Dot notation key path (e.g., 'home.greeting')
 * @param params - Optional parameters for interpolation
 */
export function t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split('.');
    let value: unknown = microcopy;

    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = (value as Record<string, unknown>)[k];
        } else {
            console.warn(`Microcopy key not found: ${key}`);
            return key;
        }
    }

    if (typeof value !== 'string') {
        console.warn(`Microcopy key is not a string: ${key}`);
        return key;
    }

    if (params) {
        return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
            return String(params[paramKey] ?? `{${paramKey}}`);
        });
    }

    return value;
}

/**
 * Get time-based greeting
 */
export function getGreeting(name: string): string {
    const hour = new Date().getHours();
    let timeOfDay = 'Morning';
    if (hour >= 12 && hour < 17) timeOfDay = 'Afternoon';
    else if (hour >= 17) timeOfDay = 'Evening';

    return `Good ${timeOfDay}, ${name}.`;
}
