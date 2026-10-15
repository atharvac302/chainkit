'use client';

import * as React from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';

export function NetworkStatus() {
  const [isOffline, setIsOffline] = React.useState(false);
  const [isSlow, setIsSlow] = React.useState(false);

  React.useEffect(() => {
    // Initial check
    if (typeof window !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Network speed detection if available
    const nav = navigator as unknown as { connection?: { effectiveType?: string; addEventListener?: (type: string, fn: () => void) => void } };
    if (nav.connection?.effectiveType) {
      if (nav.connection.effectiveType === '2g' || nav.connection.effectiveType === 'slow-2g') {
        setIsSlow(true);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOffline) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-center text-xs font-semibold text-white shadow-sm"
      >
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>No internet connection detected. You are viewing cached data. Reconnecting...</span>
      </div>
    );
  }

  if (isSlow) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-white shadow-sm"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Slow network detected. Transactions and receipt polling may take longer than usual.</span>
      </div>
    );
  }

  return null;
}
