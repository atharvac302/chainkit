'use client';

import * as React from 'react';
import {
  Inbox,
  Loader2,
  AlertOctagon,
  WifiOff,
  Clock,
  SearchX,
  ShieldAlert,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// ─── 1. EMPTY STATE ───
export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = Inbox,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 mb-4 text-slate-500">
          <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1.5 max-w-sm text-sm text-slate-600 leading-relaxed">
          {description}
        </p>
        {actionLabel && onAction && (
          <div className="mt-6">
            <Button onClick={onAction} className="shadow-sm">
              {actionLabel}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 2. LOADING STATE ───
export interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading blockchain records...' }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col items-center justify-center p-12 space-y-4 text-center"
    >
      <div className="relative flex h-12 w-12 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-slate-600 animate-pulse">{message}</p>
      <span className="sr-only">Loading content, please wait...</span>
    </div>
  );
}

// ─── 3. ERROR STATE ───
export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Unable to Load Data',
  message = 'An unexpected error occurred while communicating with the ChainKit service.',
  onRetry,
}: ErrorStateProps) {
  return (
    <Card className="border-red-200 bg-red-50/40">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 mb-3">
          <AlertOctagon className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-red-950">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-red-800 leading-relaxed">{message}</p>
        {onRetry && (
          <div className="mt-5">
            <Button
              variant="outline"
              onClick={onRetry}
              className="border-red-300 text-red-900 hover:bg-red-100/60"
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 4. NO INTERNET STATE ───
export function NoInternetState({ onRetry }: { onRetry?: () => void }) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardContent className="flex flex-col items-center justify-center p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4 ring-1 ring-amber-200">
          <WifiOff className="h-7 w-7" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">No Internet Connection</h3>
        <p className="mt-1.5 max-w-sm text-sm text-slate-600">
          Please check your network cables or Wi-Fi settings. ChainKit will automatically resume once reconnected.
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="mt-5">
            Check Connection
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 5. SLOW NETWORK STATE ───
export function SlowNetworkNotice() {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900"
    >
      <Clock className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
      <span>
        Your network appears slow. Smart contract interactions may take up to 30 seconds to broadcast.
      </span>
    </div>
  );
}

// ─── 6. NO SEARCH RESULT STATE ───
export interface NoSearchResultStateProps {
  query: string;
  onClear: () => void;
}

export function NoSearchResultState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardContent className="flex flex-col items-center justify-center p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 mb-3">
          <SearchX className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">No Results Found</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-600">
          No records or transactions match your search for &quot;<span className="font-semibold text-slate-800">{query}</span>&quot;.
        </p>
        <Button onClick={onClear} variant="outline" size="sm" className="mt-4">
          Clear Search Query
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── 7. PERMISSION DENIED (403) STATE ───
export function PermissionDeniedState({ message }: { message?: string }) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardContent className="flex flex-col items-center justify-center p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 mb-3">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">Access Denied (Scope Required)</h3>
        <p className="mt-1 max-w-md text-sm text-slate-600">
          {message || 'Your API key does not have the required permissions to access this tenant project resource.'}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── 8. SESSION EXPIRED STATE ───
export function SessionExpiredModal({
  isOpen,
  onRefresh,
}: {
  isOpen: boolean;
  onRefresh: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
          <KeyRound className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 id="session-title" className="text-lg font-bold text-slate-900">
          Session Expired
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Your developer console session has timed out. Please refresh or reconnect your API key to continue.
        </p>
        <div className="mt-6 flex justify-end">
          <Button onClick={onRefresh} className="shadow-sm">
            Reload Session
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── 9. FORM VALIDATION STATE HELPER ───
export function FormValidationError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

// ─── 10. SUCCESS CONFIRMATION STATE ───
export function SuccessBanner({
  title,
  message,
  onDismiss,
}: {
  title: string;
  message?: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" aria-hidden="true" />
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          {message && <p className="mt-0.5 text-xs text-emerald-800">{message}</p>}
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          type="button"
          aria-label="Dismiss success message"
          className="text-emerald-700 hover:text-emerald-950 text-xs font-medium"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
