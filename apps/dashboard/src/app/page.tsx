'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  FolderKanban,
  KeyRound,
  FileCheck2,
  ArrowLeftRight,
  Plus,
  BookOpen,
  ArrowRight,
  Terminal,
  ShieldCheck,
  Check,
  Copy,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, truncateHash, truncateId } from '@/lib/utils';
import { EmptyState, LoadingState, ErrorState } from '@/components/ui-states';

export default function DashboardHomePage() {
  const [copiedSnippet, setCopiedSnippet] = React.useState<string | null>(null);

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.getProjects(),
  });

  const {
    data: recordsData,
    isLoading: isLoadingRecords,
    isError: isRecordsError,
    refetch: refetchRecords,
  } = useQuery({
    queryKey: ['records', { page: 1, limit: 5 }],
    queryFn: () => apiClient.getRecords({ page: 1, limit: 5 }),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => apiClient.getTransactions(),
  });

  const { data: apiKeys = [] } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiClient.getApiKeys(''),
  });

  const confirmedTxCount = transactions.filter((t) => t.status === 'confirmed').length;
  const activeKeysCount = apiKeys.filter((k) => k.status === 'active').length;
  const totalRecords = recordsData?.pagination?.total ?? recordsData?.records?.length ?? 0;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner & Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Developer Console
          </h1>
          <p className="text-slate-600 mt-1 text-sm leading-relaxed">
            Notarize records, manage cryptographic API keys, and track on-chain settlement status in real time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild className="shadow-sm">
            <Link href="/projects">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href="http://localhost:3001/docs" target="_blank" rel="noreferrer">
              <BookOpen className="mr-2 h-4 w-4 text-slate-500" />
              API Docs
            </a>
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-sm hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Total Projects
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{projects.length}</div>
            <p className="text-xs text-slate-500 mt-1">Tenant workspaces</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Active API Keys
            </CardTitle>
            <KeyRound className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{activeKeysCount}</div>
            <p className="text-xs text-slate-500 mt-1">Sandbox & live keys</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Anchored Records
            </CardTitle>
            <FileCheck2 className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalRecords}</div>
            <p className="text-xs text-slate-500 mt-1">Cryptographic proofs</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Confirmed On-Chain
            </CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-sky-600" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{confirmedTxCount}</div>
            <p className="text-xs text-slate-500 mt-1">Settled on Sepolia L1</p>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started Guide */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <CardTitle className="text-base text-slate-900">
              Integration Quickstart
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-600">
            Anchor tamper-evident records to the blockchain in four simple steps.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-xs">
                1
              </span>
              <Link href="/projects" className="text-xs font-semibold text-primary hover:underline">
                Create &rarr;
              </Link>
            </div>
            <h2 className="font-semibold text-sm text-slate-900">Create a Project</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Define a project workspace to manage sandbox quotas and API credentials.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-xs">
                2
              </span>
              <Link href="/api-keys" className="text-xs font-semibold text-primary hover:underline">
                Generate &rarr;
              </Link>
            </div>
            <h2 className="font-semibold text-sm text-slate-900">Generate API Key</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Create a secret key for authentication. Shown once with zero storage in plaintext.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-xs">
                3
              </span>
              <button
                type="button"
                onClick={() => handleCopy('npm install @chainkit/sdk', 'step3')}
                aria-label="Copy SDK install command"
                className="text-xs text-slate-500 hover:text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary rounded p-1"
              >
                {copiedSnippet === 'step3' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <h2 className="font-semibold text-sm text-slate-900">Install the SDK</h2>
            <div className="rounded bg-slate-200/80 px-2 py-1 font-mono text-[11px] text-slate-800">
              npm i @chainkit/sdk
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-xs">
                4
              </span>
              <Terminal className="h-4 w-4 text-slate-500" aria-hidden="true" />
            </div>
            <h2 className="font-semibold text-sm text-slate-900">Anchor & Verify</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Submit SHA-256 hashes for gas-sponsored relayer submission and immutable verification.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Records Preview */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base text-slate-900">Recent Records</CardTitle>
            <CardDescription className="text-xs text-slate-600">
              Latest cryptographic commitments notarized through the API.
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="space-x-1">
            <Link href="/records">
              <span>View all</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingRecords ? (
            <LoadingState message="Loading recent records..." />
          ) : isRecordsError ? (
            <ErrorState
              title="Unable to fetch records"
              message="Check if the ChainKit API server is running at http://localhost:3001."
              onRetry={() => refetchRecords()}
            />
          ) : !recordsData?.records || recordsData.records.length === 0 ? (
            <EmptyState
              title="No records notarized yet"
              description="Anchor your first document or event hash using the SDK, CLI, or REST API."
              actionLabel="Go to Record Explorer"
              onAction={() => window.location.assign('/records')}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200">
                    <TableHead className="text-xs font-semibold text-slate-900">Record ID</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-900">Type</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-900">Content Hash</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-900">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-900">Timestamp</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-900">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recordsData.records.slice(0, 5).map((rec) => (
                    <TableRow key={rec.id} className="border-slate-100 hover:bg-slate-50/70">
                      <TableCell className="font-mono text-xs text-slate-800">
                        {truncateId(rec.id)}
                      </TableCell>
                      <TableCell className="font-medium text-xs">
                        <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 font-mono text-slate-800">
                          {rec.type}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {truncateHash(rec.contentHash)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={rec.status} />
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {formatDate(rec.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                          <Link href={`/records/${rec.id}`}>Details</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
