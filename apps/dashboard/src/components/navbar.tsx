'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Boxes,
  Menu,
  X,
  LayoutDashboard,
  FolderKanban,
  KeyRound,
  FileCheck2,
  ArrowLeftRight,
  BookOpen,
  Activity,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Projects', href: '/projects', icon: FolderKanban },
  { title: 'API Keys', href: '/api-keys', icon: KeyRound },
  { title: 'Records', href: '/records', icon: FileCheck2 },
  { title: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { title: 'Docs', href: 'http://localhost:3001/docs', icon: BookOpen, external: true },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();

  // Close mobile drawer on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-8 backdrop-blur-md">
        {/* Left: Clickable Logo & Environment */}
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            aria-label="ChainKit Dashboard Home"
            className="flex items-center space-x-2.5 rounded-lg p-1 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
              <Boxes className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-slate-900 leading-none">
                ChainKit
              </span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider pt-0.5">
                BaaS Platform
              </span>
            </div>
          </Link>
          <Badge
            variant="outline"
            className="hidden sm:inline-flex bg-slate-50 border-slate-300 text-slate-700 text-xs font-normal"
          >
            Sandbox Mode
          </Badge>
        </div>

        {/* Right Desktop: System status & Mobile Hamburger */}
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center space-x-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
            <Activity className="h-3.5 w-3.5 text-emerald-600 animate-pulse" aria-hidden="true" />
            <span className="font-medium text-slate-700">API Operational</span>
          </div>

          <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary border border-primary/20">
            CK
          </div>

          {/* Hamburger toggle button for Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
        >
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-white p-6 shadow-2xl transition-transform">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <span className="text-sm font-bold text-slate-900">Navigation</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation drawer"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav className="mt-4 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = !item.external && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));

                if (item.external) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                        <span>{item.title}</span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-8 pt-4 border-t border-slate-200 space-y-2 text-xs text-slate-600">
              <p className="font-semibold text-slate-900">Legal & Support</p>
              <ul className="space-y-1.5">
                <li>
                  <Link href="/privacy" className="hover:text-primary">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-primary">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/refund" className="hover:text-primary">
                    Refund Policy
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="hover:text-primary">
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
