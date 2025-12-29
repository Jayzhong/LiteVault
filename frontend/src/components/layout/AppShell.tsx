'use client';

import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { Toaster } from '@/components/ui/sonner';
import { AppProvider } from '@/lib/store/AppContext';

interface AppShellProps {
    children: React.ReactNode;
}

function AppShellInner({ children }: AppShellProps) {

    return (
        <div className="flex h-screen flex-col md:flex-row bg-background">
            {/* Mobile: Top header with hamburger */}
            <MobileHeader />

            {/* Desktop: Left sidebar */}
            <Sidebar />

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <div className="mx-auto max-w-5xl px-4 py-6 md:p-8">{children}</div>
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
