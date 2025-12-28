'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { setTokenGetter } from '@/lib/api/client';

/**
 * Hook to initialize Clerk token getter for API client.
 * Should be called once in a top-level component (e.g., AppShell).
 */
export function useClerkTokenSetup(): void {
    const { getToken, isSignedIn } = useAuth();

    useEffect(() => {
        if (isSignedIn) {
            // Set up the token getter for API client
            setTokenGetter(async () => {
                const token = await getToken();
                return token;
            });
        } else {
            // Clear token getter when signed out
            setTokenGetter(async () => null);
        }
    }, [isSignedIn, getToken]);
}
