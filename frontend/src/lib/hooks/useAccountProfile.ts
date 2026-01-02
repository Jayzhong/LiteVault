'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser, useAuth } from '@clerk/nextjs';
import { useCallback } from 'react';

// Types
export interface UserPreferences {
    defaultLanguage: string;
    timezone: string;
    aiSuggestionsEnabled: boolean;
}

export interface BackendUser {
    id: string;
    clerkUserId: string | null;
    email: string | null;
    displayName: string | null;
    nickname: string | null;
    avatarUrl: string | null;
    bio: string | null;
    preferences: UserPreferences;
    plan: string;
    createdAt: string;
    updatedAt: string;
}

export interface AccountProfile {
    // Merged display values
    displayName: string;
    email: string | null;
    avatarUrl: string | null;
    memberSinceYear: number;

    // App-owned profile fields
    nickname: string | null;
    bio: string | null;
    customAvatarUrl: string | null;

    // Preferences
    preferences: UserPreferences;

    // Clerk info
    clerkUserId: string | null;

    // Raw data
    backendUser: BackendUser | null;
}

export interface UpdateProfileInput {
    nickname?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
}

export interface UpdatePreferencesInput {
    defaultLanguage?: string;
    timezone?: string;
    aiSuggestionsEnabled?: boolean;
}

// API configuration
const USE_REAL_PROFILE = process.env.NEXT_PUBLIC_USE_REAL_PROFILE === 'true';
// Empty string = same-origin (production via reverse proxy)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

/**
 * useAccountProfile - Single source of truth for Settings UI
 * 
 * Merges Clerk identity + backend profile/preferences.
 */
export function useAccountProfile() {
    const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
    const { getToken, isSignedIn } = useAuth();
    const queryClient = useQueryClient();

    // Fetch backend /me data
    const {
        data: backendUser,
        isLoading: isBackendLoading,
        error: backendError,
        refetch: refetchBackend,
    } = useQuery<BackendUser>({
        queryKey: ['me'],
        queryFn: async () => {
            const token = await getToken();
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch profile');
            }
            return response.json();
        },
        enabled: USE_REAL_PROFILE && isSignedIn && isClerkLoaded,
        staleTime: 60 * 1000, // 1 minute
    });

    // Update profile mutation
    const updateProfileMutation = useMutation({
        mutationFn: async (input: UpdateProfileInput) => {
            const token = await getToken();
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/me/profile`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(input),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error?.error?.message || 'Failed to update profile');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] });
        },
    });

    // Update preferences mutation
    const updatePreferencesMutation = useMutation({
        mutationFn: async (input: UpdatePreferencesInput) => {
            const token = await getToken();
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/me/preferences`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(input),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error?.error?.message || 'Failed to update preferences');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] });
        },
    });

    // Merge Clerk + backend data
    const profile: AccountProfile | null = isClerkLoaded && clerkUser ? {
        // Display name: nickname > clerk fullName > email prefix > 'Member'
        displayName: backendUser?.nickname
            || clerkUser.fullName
            || clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0]
            || 'Member',

        // Email from Clerk
        email: clerkUser.emailAddresses[0]?.emailAddress || backendUser?.email || null,

        // Avatar: custom > Clerk image
        avatarUrl: backendUser?.avatarUrl || clerkUser.imageUrl || null,

        // Member since from Clerk createdAt
        memberSinceYear: clerkUser.createdAt
            ? new Date(clerkUser.createdAt).getFullYear()
            : new Date().getFullYear(),

        // App-owned fields
        nickname: backendUser?.nickname || null,
        bio: backendUser?.bio || null,
        customAvatarUrl: backendUser?.avatarUrl || null,

        // Preferences (defaults if no backend data)
        preferences: backendUser?.preferences || {
            defaultLanguage: 'en',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            aiSuggestionsEnabled: true,
        },

        // IDs
        clerkUserId: clerkUser.id,

        // Raw backend data
        backendUser: backendUser || null,
    } : null;

    // Wrapper functions for mutations
    const updateProfile = useCallback(
        async (input: UpdateProfileInput) => {
            return updateProfileMutation.mutateAsync(input);
        },
        [updateProfileMutation]
    );

    const updatePreferences = useCallback(
        async (input: UpdatePreferencesInput) => {
            return updatePreferencesMutation.mutateAsync(input);
        },
        [updatePreferencesMutation]
    );

    return {
        // Profile data
        profile,

        // Loading states
        isLoading: !isClerkLoaded || (USE_REAL_PROFILE && isBackendLoading),
        isClerkLoaded,
        isSignedIn,

        // Error
        error: backendError,

        // Actions
        updateProfile,
        updatePreferences,
        refetch: refetchBackend,

        // Mutation states
        isUpdatingProfile: updateProfileMutation.isPending,
        isUpdatingPreferences: updatePreferencesMutation.isPending,
        updateProfileError: updateProfileMutation.error,
        updatePreferencesError: updatePreferencesMutation.error,
    };
}
