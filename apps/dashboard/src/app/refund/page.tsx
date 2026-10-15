import * as React from 'react';
import type { Metadata } from 'next';
import { RefreshCw, CheckCircle2, Mail, Phone, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy',
  description:
    'ChainKit transparent Refund and Cancellation Policy. 100% free sandbox, 14-day hassle-free money-back guarantee, and no deceptive cancellation hurdles.',
};

export default function RefundPage() {
  const lastUpdated = 'October 14, 2026';

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-2 border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Hassle-Free & Transparent Returns</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Refund & Cancellation Policy
        </h1>
        <p className="text-sm text-slate-500">
          Effective Date: {lastUpdated} • Version 1.0
        </p>
      </div>

      {/* Overview Card */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-6 space-y-3">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>Developer-First Guarantee</span>
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            At ChainKit, our business model is built on developer trust. We do not engage in deceptive billing, cancellation friction, or refusal of reasonable refunds:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs text-slate-700">
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <strong className="text-slate-900 block mb-1">Developer Sandbox: $0 Cost</strong>
              You will never be billed for sandbox testnet usage, API key generation, or local testing.
            </li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <strong className="text-slate-900 block mb-1">14-Day Full Refund Guarantee</strong>
              For any future paid tier or enterprise quota, we offer an unconditional 14-day full refund upon request.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Cancellation Terms */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">1. Instant 1-Click Cancellation</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          You can revoke your API keys and close your project at any time directly through the Developer Console with zero phone calls, exit surveys, or retention traps. No future charges will ever occur after account closure.
        </p>
      </section>

      {/* How to request refund */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">2. Requesting a Refund</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          To request a refund for any commercial transaction or enterprise tier, email our support team at{' '}
          <a href="mailto:billing@chainkit.dev" className="text-primary underline">
            billing@chainkit.dev
          </a>{' '}
          with your project ID. Refunds are processed back to the original payment method within 3 to 5 business days.
        </p>
      </section>

      {/* Contact Section */}
      <section className="space-y-3 border-t border-slate-200 pt-6">
        <h2 className="text-xl font-bold text-slate-900">3. Billing & Support Inquiries</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">ChainKit Technologies Inc.</p>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>100 Montgomery St, Suite 1400, San Francisco, CA 94104, United States</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-400" />
            <a href="mailto:billing@chainkit.dev" className="text-primary hover:underline">
              billing@chainkit.dev
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
