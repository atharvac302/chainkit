'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  FileCheck2,
  ArrowLeft,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { apiClient, type VerificationResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/utils';
import { LoadingState } from '@/components/ui-states';

export default function RecordDetailPage() {
  const params = useParams();
  const recordId = (params?.recordId as string) || '';

  const [verifyInput, setVerifyInput] = React.useState('');
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const { data: record, isLoading } = useQuery({
    queryKey: ['record', recordId],
    queryFn: () => apiClient.getRecord(recordId),
    enabled: Boolean(recordId),
  });

  const verifyMutation = useMutation({
    mutationFn: (data: { contentHash?: string; content?: unknown }) =>
      apiClient.verifyRecord(recordId, data),
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyInput.trim()) return;

    const cleaned = verifyInput.trim();
    if (cleaned.startsWith('0x') || cleaned.length === 64) {
      verifyMutation.mutate({ contentHash: cleaned });
    } else {
      try {
        const parsed = JSON.parse(cleaned);
        verifyMutation.mutate({ content: parsed });
      } catch {
        verifyMutation.mutate({ content: cleaned });
      }
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading record details & on-chain state..." />;
  }

  const transaction = record?.transactions?.[0];
  const isConfirmed = record?.status === 'confirmed';
  const isPending = record?.status === 'pending' || record?.status === 'submitting';

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-xs text-slate-500">
        <Link href="/records" className="flex items-center hover:text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary rounded">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          Records
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-mono font-semibold">{recordId}</span>
      </div>

      {/* Title & Status */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileCheck2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900">
                {recordId}
              </h1>
              <StatusBadge status={record?.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Domain Type: <span className="font-semibold text-slate-800">{record?.type}</span>
              {record?.externalReference && (
                <> &bull; External Reference: <span className="font-semibold text-slate-800">{record.externalReference}</span></>
              )}
            </p>
          </div>
        </div>

        {transaction?.transactionHash && (
          <Button asChild variant="outline" size="sm" className="space-x-1.5 self-start sm:self-auto border-slate-300">
            <a
              href={`https://sepolia.etherscan.io/tx/${transaction.transactionHash}`}
              target="_blank"
              rel="noreferrer"
            >
              <span>View On Etherscan</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
            </a>
          </Button>
        )}
      </div>

      {/* Status Lifecycle Timeline */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base text-slate-900">Anchoring Lifecycle Timeline</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Cryptographic verification and blockchain settlement progression.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="relative flex flex-col p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
              <div className="flex items-center space-x-2 mb-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                  ✓
                </span>
                <span className="font-semibold text-sm text-slate-900">1. SHA-256 Notarized</span>
              </div>
              <p className="text-xs text-slate-600">
                Digest generated and stored off-chain immutably.
              </p>
              <span className="text-[11px] text-slate-500 mt-2 font-mono">
                {formatDate(record?.createdAt)}
              </span>
            </div>

            {/* Step 2 */}
            <div
              className={`relative flex flex-col p-4 rounded-xl border ${
                isConfirmed || isPending
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : 'border-slate-200 bg-slate-50/50 opacity-70'
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isConfirmed
                      ? 'bg-emerald-600 text-white'
                      : isPending
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isConfirmed ? '✓' : '2'}
                </span>
                <span className="font-semibold text-sm text-slate-900">2. Relayed to L1</span>
              </div>
              <p className="text-xs text-slate-600">
                Transaction broadcast to Sepolia testnet relayer pool.
              </p>
              <span className="text-[11px] text-slate-500 mt-2 font-mono">
                {transaction?.submittedAt ? formatDate(transaction.submittedAt) : 'Pending Relayer Worker'}
              </span>
            </div>

            {/* Step 3 */}
            <div
              className={`relative flex flex-col p-4 rounded-xl border ${
                isConfirmed
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : 'border-slate-200 bg-slate-50/50 opacity-70'
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isConfirmed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isConfirmed ? '✓' : '3'}
                </span>
                <span className="font-semibold text-sm text-slate-900">3. Block Confirmation</span>
              </div>
              <p className="text-xs text-slate-600">
                State root confirmed in EVM block header.
              </p>
              <span className="text-[11px] text-slate-500 mt-2 font-mono">
                {transaction?.confirmedAt ? formatDate(transaction.confirmedAt) : 'Awaiting Finality'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Metadata & Verification */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Record Metadata Details */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-base text-slate-900">Record Hashes & Attributes</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Cryptographic hash fingerprints and tenant attributes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-slate-500">
                Canonical SHA-256 Digest
              </label>
              <div className="flex items-center justify-between rounded-lg bg-slate-900 p-3 font-mono text-xs">
                <span className="break-all text-slate-100 pr-2">{record?.contentHash}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 shrink-0 text-slate-400 hover:text-white hover:bg-slate-800"
                  onClick={() => handleCopy(record?.contentHash || '', 'hash')}
                >
                  {copiedKey === 'hash' ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div>
                <span className="text-xs text-slate-500 block">Project Scope</span>
                <p className="font-mono text-xs font-semibold text-slate-900 mt-0.5">{record?.projectId}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Record Classification</span>
                <p className="font-mono text-xs font-semibold text-slate-900 mt-0.5">{record?.type}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div>
                <span className="text-xs text-slate-500 block">Created Timestamp</span>
                <p className="text-xs font-medium text-slate-800 mt-0.5">{formatDate(record?.createdAt)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Last Updated</span>
                <p className="text-xs font-medium text-slate-800 mt-0.5">{formatDate(record?.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Verifier */}
        <Card className="border-slate-200 bg-white shadow-sm flex flex-col justify-between">
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              <CardTitle className="text-base text-slate-900">Cryptographic Integrity Verifier</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Test original or altered content to verify against the on-chain hash.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <form onSubmit={handleVerify} className="space-y-3">
              <div>
                <label htmlFor="verify-payload" className="block text-xs font-semibold text-slate-900 mb-1">
                  Document Payload or Precomputed Hash
                </label>
                <textarea
                  id="verify-payload"
                  rows={4}
                  className="w-full rounded-md border border-slate-300 bg-white p-2.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-xs"
                  placeholder='Paste original JSON object (e.g. {"course": "Blockchain 101"}) or 64-char hex hash...'
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                size="sm"
                className="w-full shadow-sm"
                disabled={verifyMutation.isPending || !verifyInput.trim()}
              >
                {verifyMutation.isPending ? 'Verifying Integrity...' : 'Verify Content Integrity'}
              </Button>
            </form>

            {/* Verification Result State */}
            {verifyMutation.data && (
              <div
                role="status"
                aria-live="polite"
                className={`rounded-xl border p-4 transition-all ${
                  verifyMutation.data.verified
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                    : 'border-red-200 bg-red-50/70 text-red-950'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {verifyMutation.data.verified ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5 shrink-0" aria-hidden="true" />
                  )}
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold">
                      {verifyMutation.data.verified ? 'Cryptographic Match Verified' : 'Integrity Verification Failed'}
                    </h4>
                    <p className="text-xs leading-relaxed">
                      {verifyMutation.data.verified
                        ? 'The supplied content perfectly matches the on-chain notarized state hash.'
                        : 'The payload has been altered or differs from the original anchored fingerprint.'}
                    </p>
                    <div className="pt-1 text-[11px] font-mono opacity-80">
                      Reason: {verifyMutation.data.reason}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
