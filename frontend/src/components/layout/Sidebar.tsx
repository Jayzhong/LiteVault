'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, Settings } from 'lucide-react';
import { microcopy } from '@/lib/microcopy';
import { UserCard } from './UserCard';
import { cn } from '@/lib/utils';
import { AppLogo } from '@/components/shared/AppLogo';

const navItems = [
    { href: '/', label: microcopy.nav.home, icon: Home },
    { href: '/search', label: microcopy.nav.search, icon: Search },
    { href: '/library', label: microcopy.nav.library, icon: Library },
    { href: '/settings', label: microcopy.nav.settings, icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    // Check if current route is an auth page
    const isAuthPage = pathname.startsWith('/auth');
    if (isAuthPage) return null;

    return (
        <aside className="hidden md:flex h-full w-64 flex-col border-r border-border bg-card">
            {/* Brand */}
            <div className="p-6">
                <AppLogo />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const isActive =
                            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                        const Icon = item.icon;

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-accent text-accent-foreground shadow-sm'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* User Card */}
            <UserCard />
        </aside>
    );
}
