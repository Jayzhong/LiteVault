'use client';

import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/sonner';
import { AppProvider } from '@/lib/store/AppContext';

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    return (
        <AppProvider>
            <div className="flex h-screen bg-background">
                <Sidebar />
                <main className="flex-1 overflow-auto">
                    <div className="mx-auto max-w-5xl p-8">{children}</div>
                </main>
                <Toaster position="bottom-right" />
            </div>
        </AppProvider>
    );
}
