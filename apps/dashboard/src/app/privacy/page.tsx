import * as React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ShieldCheck, Lock, Trash2, Mail, Phone, MapPin, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'ChainKit Privacy Policy explaining our data minimization principle, off-chain hash storage, zero-tracking commitments, and GDPR/CCPA user rights.',
};

export default function PrivacyPage() {
  const lastUpdated = 'October 14, 2026';

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-2 border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Strict Data Minimization & Zero Trackers</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-500">
          Effective Date: {lastUpdated} • Version 1.2
        </p>
      </div>

      {/* Summary Card */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-3">
            Core Privacy Commitments
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Off-Chain Hashing:</strong> Only cryptographic hashes are anchored on-chain. Your source documents remain strictly private.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>No Ad Trackers:</strong> Zero advertising SDKs, cross-site telemetry, or behavioral profiling tools.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Right to Erasure:</strong> Complete off-chain data deletion upon request under GDPR and CCPA.</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 1 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">1. Data Minimization & Information We Collect</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          ChainKit operates strictly under a <strong>Data Minimization</strong> standard. We collect only the minimum information technically necessary to provision your sandbox and deliver API services:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-700">
          <li><strong>Developer Credentials:</strong> Project names and one-way cryptographic verifiers (HMAC-SHA256) of your API keys. We never store raw API keys in our databases.</li>
          <li><strong>Cryptographic Hashes:</strong> 32-byte SHA-256 hashes submitted through the API. We do not store or transmit raw unhashed documents to public blockchains.</li>
          <li><strong>Operational Telemetry:</strong> Anonymized HTTP response status codes and request latency to ensure platform stability. IP addresses and authorization tokens are redacted from all permanent logs.</li>
        </ul>
      </section>

      {/* Section 2 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">2. Audit of Third-Party SDKs & Zero Tracking</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          Our codebase and customer-facing dashboard have been strictly audited. ChainKit:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-700">
          <li>Does <strong>not</strong> load Google Analytics, Meta Pixel, Hotjar, or commercial tracking scripts.</li>
          <li>Does <strong>not</strong> sell, rent, or trade developer data to data brokers or advertising exchanges.</li>
          <li>Uses only audited, open-source dependencies (e.g., React, Next.js, Fastify, Viem, Prisma) verified via lockfiles and continuous dependency vulnerability scanning.</li>
        </ul>
      </section>

      {/* Section 3 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">3. Age Restriction & Children&apos;s Privacy</h2>
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-950">
          <p className="font-semibold">Age Requirement: 18 Years or Older</p>
          <p className="mt-1 text-xs text-amber-900 leading-relaxed">
            ChainKit is an enterprise developer platform intended solely for individuals aged 18 and older. We do not knowingly collect, process, or store personal information from children or minors under the age of 18. If we learn that personal data of a minor has been collected, we will take immediate steps to permanently delete the account and associated records.
          </p>
        </div>
      </section>

      {/* Section 4 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">4. Your Rights & Data Deletion (GDPR & CCPA)</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          Regardless of your location, you hold the following rights regarding your off-chain data:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-700">
          <li><strong>Right to Access:</strong> Request a complete export of your project records and transaction logs.</li>
          <li><strong>Right to Rectification:</strong> Update or rotate API keys and project settings at any time.</li>
          <li><strong>Right to Erasure (Data Deletion):</strong> Request the permanent deletion of your off-chain project database entries, API keys, and logs.</li>
        </ul>
        <div className="pt-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/data-deletion" className="inline-flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-600" />
              <span>Submit a Data Deletion Request</span>
            </Link>
          </Button>
        </div>
      </section>

      {/* Section 5 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">5. Email Communications & Unsubscribe Link</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          We only send operational notifications (e.g., key revocation alerts, security notices). All communications strictly respect CAN-SPAM and GDPR guidelines and include an immediate, one-click <strong>Unsubscribe</strong> link at the bottom of every message.
        </p>
      </section>

      {/* Section 6 - Business Details */}
      <section className="space-y-3 border-t border-slate-200 pt-6">
        <h2 className="text-xl font-bold text-slate-900">6. Business Contact Details</h2>
        <p className="text-sm text-slate-700">
          For privacy inquiries, Data Protection Officer (DPO) communications, or regulatory notices:
        </p>
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
