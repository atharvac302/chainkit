'use client';

import * as React from 'react';
import Link from 'next/link';
import { Cookie, ShieldCheck, Check, Mail, Phone, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CookiesPage() {
  const lastUpdated = 'October 14, 2026';
  const [resetMessage, setResetMessage] = React.useState(false);

  const handleResetPreferences = () => {
    localStorage.removeItem('chainkit_cookie_consent');
    setResetMessage(true);
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-2 border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800 ring-1 ring-slate-200">
          <Cookie className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Transparent Technical Storage</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Cookie Policy
        </h1>
        <p className="text-sm text-slate-500">
          Effective Date: {lastUpdated} • Version 1.1
        </p>
      </div>

      {/* Summary Card */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-6 space-y-3">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span>Strict Zero-Tracking Policy</span>
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            ChainKit uses only strictly necessary technical cookies and browser local storage to maintain your active developer session and remember your console preferences. We do not use third-party behavioral cookies, tracking pixels, or cross-site advertising scripts.
          </p>
        </CardContent>
      </Card>

      {/* Table of Cookies */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">1. Cookies & Storage Used by ChainKit</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-900">
              <tr>
                <th className="p-3">Identifier</th>
                <th className="p-3">Type</th>
                <th className="p-3">Purpose</th>
                <th className="p-3">Lifespan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-3 font-mono font-medium text-slate-900">chainkit_cookie_consent</td>
                <td className="p-3">Local Storage</td>
                <td className="p-3">Records your cookie banner acknowledgement.</td>
                <td className="p-3">Persistent (1 year)</td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-medium text-slate-900">chainkit_session</td>
                <td className="p-3">Strictly Necessary</td>
                <td className="p-3">Keeps your developer console session authenticated.</td>
                <td className="p-3">Session only</td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-medium text-slate-900">chainkit_project_cache</td>
                <td className="p-3">Local Storage</td>
                <td className="p-3">Caches current project ID to prevent unnecessary network roundtrips.</td>
                <td className="p-3">Session</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Reset Preferences */}
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">2. Manage Cookie Preferences</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          You can clear your cookie consent choice at any time. Clicking the button below will reset your stored consent and re-trigger the consent banner.
        </p>
        <div className="pt-2">
          <Button onClick={handleResetPreferences} variant="outline" size="sm">
            Reset Consent Preferences
          </Button>
          {resetMessage && (
            <p className="mt-2 text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <Check className="h-3.5 w-3.5" />
              <span>Preferences reset! Reloading...</span>
            </p>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section className="space-y-3 border-t border-slate-200 pt-6">
        <h2 className="text-xl font-bold text-slate-900">3. Contact Us</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">ChainKit Technologies Inc.</p>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>100 Montgomery St, Suite 1400, San Francisco, CA 94104, United States</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-400" />
            <a href="mailto:privacy@chainkit.dev" className="text-primary hover:underline">
              privacy@chainkit.dev
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-slate-400" />
            <a href="tel:+18005550199" className="text-primary hover:underline">
              +1 (800) 555-0199
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
