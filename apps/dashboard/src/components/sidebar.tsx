'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  KeyRound,
  FileCheck2,
  ArrowLeftRight,
  BookOpen,
  Boxes,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Projects',
    href: '/projects',
    icon: FolderKanban,
  },
  {
    title: 'API Keys',
    href: '/api-keys',
    icon: KeyRound,
  },
  {
    title: 'Records',
    href: '/records',
    icon: FileCheck2,
  },
  {
    title: 'Transactions',
    href: '/transactions',
    icon: ArrowLeftRight,
  },
  {
    title: 'Docs',
    href: 'http://localhost:3001/docs',
    icon: BookOpen,
    external: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex sticky top-0 h-screen w-64 flex-col border-r border-slate-200 bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
        <Link
          href="/"
          aria-label="ChainKit Home"
          className="flex items-center space-x-2.5 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
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
          className="text-[10px] uppercase font-mono tracking-wider text-slate-600 bg-slate-50 border-slate-300"
        >
          v0.1.0
        </Badge>
      </div>

      {/* Navigation */}
      <nav aria-label="Main Navigation" className="flex-1 space-y-1 px-3 py-4">
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
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                  <span>{item.title}</span>
                </div>
                <ExternalLink className="h-3 w-3 opacity-60 text-slate-400" />
              </a>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-slate-500')} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Network / Status Indicator */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200/80 p-2.5 text-xs">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-medium text-slate-800">Sepolia Testnet</span>
          </div>
          <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        </div>
      </div>
    </aside>
  );
}
