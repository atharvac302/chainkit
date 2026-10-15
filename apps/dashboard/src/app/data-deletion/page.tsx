'use client';

import * as React from 'react';
import Link from 'next/link';
import { Trash2, AlertTriangle, CheckCircle2, ArrowLeft, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormValidationError, SuccessBanner } from '@/components/ui-states';

export default function DataDeletionPage() {
  const [email, setEmail] = React.useState('');
  const [projectId, setProjectId] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [agreed, setAgreed] = React.useState(false);
  const [errors, setErrors] = React.useState<{ email?: string; agreed?: string }>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [ticketId, setTicketId] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { email?: string; agreed?: string } = {};

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please provide a valid developer email address.';
    }
    if (!agreed) {
      newErrors.agreed = 'You must confirm that you understand off-chain records will be permanently deleted.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    // TODO: Replace with actual API call to POST /v1/data-deletion when backend endpoint is implemented
    // Simulate verified deletion ticket creation
    setTimeout(() => {
      setIsSubmitting(false);
      setTicketId(`DEL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    }, 800);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      <div>
        <Link
          href="/privacy"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-900 mb-4 focus:outline-none focus:ring-1 focus:ring-primary rounded"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Privacy Policy
        </Link>
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <Trash2 className="h-5 w-5" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            GDPR Article 17 & CCPA Right to Erasure
          </span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Request Data Deletion
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Submit a request to permanently purge all off-chain developer data, API keys, and metadata associated with your project.
        </p>
      </div>

      {ticketId ? (
        <Card className="border-emerald-200 bg-white shadow-sm">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Data Deletion Request Received
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Your deletion ticket has been registered. An automated verification link has been sent to{' '}
              <strong className="text-slate-900">{email}</strong>. Once confirmed, all off-chain records will be purged within 48 hours.
            </p>
            <div className="inline-block rounded-lg bg-slate-100 px-4 py-2 text-xs font-mono font-semibold text-slate-800">
              Ticket Reference: {ticketId}
            </div>
            <div className="pt-4">
              <Button asChild variant="outline">
                <Link href="/">Return to Console</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">
              Data Deletion Form
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Please enter the account or project information you wish to delete.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Blockchain Notice Warning */}
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <strong className="font-semibold block">Important Note Regarding On-Chain Hashes:</strong>
                <p className="leading-relaxed text-amber-900">
                  Data deletion covers all off-chain PostgreSQL database records, cached metadata, and active API keys. Because public EVM blockchains are mathematically immutable, 32-byte cryptographic hashes previously broadcast to testnet blocks cannot be deleted from historical blocks.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="del-email" className="block text-xs font-semibold text-slate-900 mb-1.5">
                  Developer Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  id="del-email"
                  type="email"
                  placeholder="developer@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!errors.email}
                  className={errors.email ? 'border-red-500 focus:ring-red-500' : ''}
                />
                <FormValidationError message={errors.email} />
              </div>

              <div>
                <label htmlFor="del-project" className="block text-xs font-semibold text-slate-900 mb-1.5">
                  Project ID (Optional)
                </label>
                <Input
                  id="del-project"
                  type="text"
                  placeholder="e.g. clx10493849..."
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="del-reason" className="block text-xs font-semibold text-slate-900 mb-1.5">
                  Reason for Deletion (Optional)
                </label>
                <textarea
                  id="del-reason"
                  rows={3}
                  placeholder="Let us know why you are deleting this project..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Explicit Consent Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span>
                    I confirm that I am the authorized owner of this project and understand that all off-chain API keys, tenant records, and configuration will be permanently purged.
                  </span>
                </label>
                <FormValidationError message={errors.agreed} />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button asChild variant="outline" size="sm">
                  <Link href="/">Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Deletion Request'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
