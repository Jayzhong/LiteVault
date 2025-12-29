'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, Settings, Menu, X } from 'lucide-react';
import { microcopy } from '@/lib/microcopy';
import { UserCard } from './UserCard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

const navItems = [
    { href: '/', label: microcopy.nav.home, icon: Home },
    { href: '/search', label: microcopy.nav.search, icon: Search },
    { href: '/library', label: microcopy.nav.library, icon: Library },
    { href: '/settings', label: microcopy.nav.settings, icon: Settings },
];

export function MobileHeader() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    // Check if current route is an auth page
    const isAuthPage = pathname.startsWith('/auth');
    if (isAuthPage) return null;

    // Get current page title
    const currentPage = navItems.find((item) =>
        item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
    );
    const pageTitle = currentPage?.label || microcopy.app.name;

    return (
        <header className="flex md:hidden items-center justify-between border-b border-border bg-card px-4 py-3 sticky top-0 z-40">
            {/* Logo */}
            <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
                    <span className="text-sm font-bold text-white">L</span>
                </div>
                <span className="text-lg font-semibold text-foreground">{pageTitle}</span>
            </div>

            {/* Hamburger Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={microcopy.nav.menu}>
                        <Menu className="h-5 w-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 flex flex-col p-0">
                    <SheetHeader className="border-b border-border p-4">
                        <SheetTitle className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
                                <span className="text-sm font-bold text-white">L</span>
                            </div>
                            {microcopy.app.name}
                        </SheetTitle>
                    </SheetHeader>

                    {/* Navigation */}
                    <nav className="flex-1 p-3">
                        <ul className="space-y-1">
                            {navItems.map((item) => {
                                const isActive =
                                    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                                const Icon = item.icon;

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            onClick={() => setIsOpen(false)}
                                            className={cn(
                                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                                isActive
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
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

                    {/* User Card at bottom */}
                    <UserCard />
                </SheetContent>
            </Sheet>
        </header>
    );
}
