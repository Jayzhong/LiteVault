'use client';

import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/sonner';
import { AppProvider } from '@/lib/store/AppContext';
import { useClerkTokenSetup } from '@/lib/hooks/useClerkTokenSetup';

interface AppShellProps {
    children: React.ReactNode;
}

function AppShellInner({ children }: AppShellProps) {
    // Set up Clerk token for API client
    useClerkTokenSetup();

    return (
        <div className="flex h-screen bg-background">
            <Sidebar />
            <main className="flex-1 overflow-auto">
                <div className="mx-auto max-w-5xl p-8">{children}</div>
            </main>
            <Toaster position="bottom-right" />
        </div>
    );
}

export function AppShell({ children }: AppShellProps) {
    return (
        <AppProvider>
            <AppShellInner>{children}</AppShellInner>
        </AppProvider>
    );
}
