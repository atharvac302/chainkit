'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Lock, RotateCw } from 'lucide-react';
import { useAuth } from '@/components/auth-context';

const PUBLIC_ROUTES = [
  '/login',
  '/privacy',
  '/terms',
  '/refund',
  '/cookies',
  '/data-deletion',
];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicRoute) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, isPublicRoute, router]);

  // Public routes always render without auth barrier
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Initial loading state checking session
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <RotateCw className="h-6 w-6 animate-spin text-primary" />
        </div>
        <p className="text-sm font-semibold text-slate-800">Verifying Developer Session...</p>
        <p className="text-xs text-slate-500">Checking credentials with the ChainKit gateway.</p>
      </div>
    );
  }

  // Not authenticated: show redirect notice
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 space-y-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
          <Lock className="h-7 w-7" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h2 className="text-base font-bold text-slate-900">Authentication Required</h2>
          <p className="text-xs text-slate-600">
            You must be signed in to access the Developer Console and manage cryptographic API keys.
          </p>
        </div>
        <button
          onClick={() => router.replace('/login')}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors"
        >
          Sign In with Email OTP &rarr;
        </button>
      </div>
    );
  }

  // Authenticated: render protected page
  return <>{children}</>;
}
