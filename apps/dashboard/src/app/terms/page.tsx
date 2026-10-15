import * as React from 'react';
import type { Metadata } from 'next';
import { Scale, CheckCircle2, AlertTriangle, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms of Service for ChainKit Blockchain-as-a-Service developer platform. Transparent terms with zero hidden fees, realistic blockchain boundaries, and no dark patterns.',
};

export default function TermsPage() {
  const lastUpdated = 'October 14, 2026';

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-2 border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 ring-1 ring-blue-200">
          <Scale className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Fair & Transparent Developer Agreement</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Terms of Service
        </h1>
        <p className="text-sm text-slate-500">
          Effective Date: {lastUpdated} • Version 1.2
        </p>
      </div>

      {/* Transparent Pricing Card - Zero Hidden Fees */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>Zero Hidden Fees & Transparent Pricing Policy</span>
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            ChainKit contains zero hidden subscription charges, unexpected overage multipliers, or deceptive renewal traps:
          </p>
          <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <strong className="text-slate-900 block mb-1">Developer Sandbox: Free Forever</strong>
              100% free testnet quota with platform-sponsored gas on the Sepolia EVM testnet.
            </li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <strong className="text-slate-900 block mb-1">Upfront Production Terms</strong>
              When production tiers launch, pricing will be based on flat-rate predictable quotas. No surprise gas spikes passed to customers.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Realistic Blockchain Boundaries - No Unsupported Claims */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">1. Realistic Blockchain Boundaries & No Unsupported Claims</h2>
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 text-sm text-slate-700 space-y-2">
          <p className="font-semibold text-blue-950 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
            <span>What ChainKit Guarantees:</span>
          </p>
          <p className="text-xs leading-relaxed">
            ChainKit guarantees that an anchored hash matches the exact cryptographic digest submitted at a specific timestamp on the underlying EVM network. If a document or event is altered by even one bit, verification will mathematically fail.
          </p>
          <p className="font-semibold text-blue-950 pt-2 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <span>What ChainKit Does NOT Claim:</span>
          </p>
          <p className="text-xs leading-relaxed text-slate-600">
            Anchoring a record does <strong>not</strong> prove that the underlying source document is truthful, legally binding, or issued by an authenticated institution. ChainKit is an immutable cryptographic ledger, not a notary of real-world legal truth. We explicitly reject exaggerated marketing claims.
          </p>
        </div>
      </section>

      {/* Acceptable Use */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">2. Acceptable Use Policy</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          You agree to use ChainKit solely for lawful software development and data notarization. You agree NOT to:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-700">
          <li>Attempt to anchor malware, child exploitation material, or illicit payloads into hash references.</li>
          <li>Execute Denial-of-Service (DoS) attacks against our REST API endpoints or rate-limiting infrastructure.</li>
          <li>Attempt to reverse-engineer or extract relayer private keys from backend adapters.</li>
          <li>Resell sandbox testnet quota as paid production services to third parties.</li>
        </ul>
      </section>

      {/* Account Termination & Key Revocation */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">3. API Key Lifecycle & Revocation</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          You are responsible for maintaining the confidentiality of your API keys. You may revoke or rotate your keys at any time via the Developer Console. We reserve the right to revoke keys that violate our rate limits or acceptable use rules.
        </p>
      </section>

      {/* Business Details */}
      <section className="space-y-3 border-t border-slate-200 pt-6">
        <h2 className="text-xl font-bold text-slate-900">4. Corporate Information & Inquiries</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">ChainKit Technologies Inc.</p>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>100 Montgomery St, Suite 1400, San Francisco, CA 94104, United States</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-400" />
            <a href="mailto:legal@chainkit.dev" className="text-primary hover:underline">
              legal@chainkit.dev
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
