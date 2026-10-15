'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CookieBanner() {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    // Only show if user has not already consented
    const consent = localStorage.getItem('chainkit_cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('chainkit_cookie_consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('chainkit_cookie_consent', 'declined_non_essential');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Cookie and Privacy Consent"
      role="region"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-4xl rounded-xl border border-border bg-white p-5 shadow-2xl transition-all duration-200 sm:bottom-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              Privacy & Cookie Notice (Zero Ad Trackers)
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ChainKit uses only strictly necessary technical cookies to remember your session and developer preferences. We do not use third-party advertising or telemetry trackers. Read our{' '}
              <Link
                href="/cookies"
                className="font-medium text-primary underline underline-offset-2 hover:text-primary/80 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                Cookie Policy
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy"
                className="font-medium text-primary underline underline-offset-2 hover:text-primary/80 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
            className="text-xs text-foreground"
          >
            Essential Only
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            className="text-xs font-semibold shadow-sm"
          >
            Accept All
          </Button>
          <button
            type="button"
            onClick={handleDecline}
            aria-label="Close cookie consent banner"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
