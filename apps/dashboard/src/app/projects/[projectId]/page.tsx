'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  FolderKanban,
  KeyRound,
  FileCheck2,
  Copy,
  Check,
  Terminal,
  Code2,
  ExternalLink,
  Calendar,
  Globe,
  ArrowLeft,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { formatDate, truncateHash, truncateId } from '@/lib/utils';
import { EmptyState, LoadingState } from '@/components/ui-states';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = (params?.projectId as string) || '';
  const [activeTab, setActiveTab] = React.useState<'overview' | 'api-keys' | 'records'>('overview');
  const [copiedSnippet, setCopiedSnippet] = React.useState<string | null>(null);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiClient.getProject(projectId),
    enabled: Boolean(projectId),
  });

  const { data: apiKeys = [], isLoading: keysLoading } = useQuery({
    queryKey: ['api-keys', projectId],
    queryFn: () => apiClient.getApiKeys(projectId),
    enabled: Boolean(projectId),
  });

  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ['records', { projectId, limit: 10 }],
    queryFn: () => apiClient.getRecords({ limit: 10 }),
    enabled: Boolean(projectId),
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  if (projectLoading) {
    return <LoadingState message="Loading project workspace..." />;
  }

  const projectRecords = recordsData?.records ?? [];
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const apiEndpointUrl = rawApiUrl.endsWith('/v1') ? rawApiUrl : `${rawApiUrl}/v1`;
  const apiDocsUrl = rawApiUrl.endsWith('/v1') ? `${rawApiUrl.slice(0, -3)}/docs` : `${rawApiUrl}/docs`;
  const sdkInstallCode = `npm install @chainkit/sdk`;
  const quickstartSnippet = `import { ChainKit } from '@chainkit/sdk';

const chainkit = new ChainKit({
  apiKey: process.env.CHAINKIT_API_KEY,
  baseUrl: '${rawApiUrl}'
});

// Anchor record content
const record = await chainkit.records.create({
  type: 'invoice',
  externalId: 'INV-10029',
  content: {
    amount: 4500.00,
    currency: 'USD',
    recipient: 'Acme Corp'
  }
});

console.log('Anchored Record ID:', record.recordId);`;

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-slate-500">
        <Link href="/projects" className="flex items-center hover:text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary rounded">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          Projects
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">{project?.name || projectId}</span>
      </div>

      {/* Project Header Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="flex items-start space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <FolderKanban className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{project?.name || 'Workspace Details'}</h1>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
              <span className="font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                {projectId}
              </span>
              <span className="flex items-center">
                <Calendar className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Created {formatDate(project?.createdAt)}
              </span>
              <span className="flex items-center">
                <Globe className="mr-1 h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Sepolia EVM Testnet
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <Button asChild variant="outline" size="sm" className="border-slate-300">
            <Link href="/api-keys">
              <KeyRound className="mr-1.5 h-3.5 w-3.5" />
              Manage Keys
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/records">
              <FileCheck2 className="mr-1.5 h-3.5 w-3.5" />
              View Records
            </Link>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Overview & Quickstart
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('api-keys')}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === 'api-keys'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          API Keys ({apiKeys.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('records')}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === 'records'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Records ({projectRecords.length})
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Quickstart Config */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="h-5 w-5 text-primary" aria-hidden="true" />
                <CardTitle className="text-base text-slate-900">SDK Installation & Setup</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Install the ChainKit client library into your Node or Next.js app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Package Manager Install
                </label>
                <div className="flex items-center justify-between rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
                  <span>{sdkInstallCode}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                    onClick={() => handleCopy(sdkInstallCode, 'sdk-install')}
                  >
                    {copiedSnippet === 'sdk-install' ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  API Endpoint Base URL
                </label>
                <div className="flex items-center justify-between rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
                  <span>{apiEndpointUrl}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                    onClick={() => handleCopy(apiEndpointUrl, 'api-url')}
                  >
                    {copiedSnippet === 'api-url' ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={apiDocsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
                >
                  <span>Explore OpenAPI Swagger Specification</span>
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Quickstart Code Example */}
          <Card className="border-slate-200 bg-white shadow-sm flex flex-col justify-between">
            <CardHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Code2 className="h-5 w-5 text-primary" aria-hidden="true" />
                  <CardTitle className="text-base text-slate-900">TypeScript Usage Example</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-slate-300"
                  onClick={() => handleCopy(quickstartSnippet, 'code')}
                >
                  {copiedSnippet === 'code' ? (
                    <>
                      <Check className="mr-1 h-3 w-3 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3 w-3" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Simple anchor operation with zero wallet or gas management required.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <pre className="rounded-xl bg-slate-900 p-4 font-mono text-[11px] leading-relaxed text-slate-100 overflow-x-auto">
                {quickstartSnippet}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: API Keys */}
      {activeTab === 'api-keys' && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-base text-slate-900">Workspace API Keys</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Active credentials associated with this project.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {keysLoading ? (
              <LoadingState message="Loading API keys..." />
            ) : apiKeys.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No API keys provisioned"
                  description="Generate a key to access the ChainKit REST API and SDK."
                  actionLabel="Go to API Keys"
                  onAction={() => window.location.assign('/api-keys')}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 bg-slate-50/60">
                      <TableHead className="text-xs font-semibold text-slate-900">Prefix</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-900">Environment</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-900">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-900">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((k) => (
                      <TableRow key={k.id} className="border-slate-100 hover:bg-slate-50/60">
                        <TableCell className="font-mono text-xs font-semibold text-slate-900">
                          {k.prefix}••••••••
                        </TableCell>
                        <TableCell className="text-xs uppercase font-medium text-slate-700">
                          {k.environment}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={k.status} />
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {formatDate(k.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Records */}
      {activeTab === 'records' && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-base text-slate-900">Workspace Records</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Notarized documents and content hashes anchored under this project.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {recordsLoading ? (
              <LoadingState message="Loading records..." />
            ) : projectRecords.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No records notarized yet"
                  description="Use the code snippet in the Overview tab to anchor your first document."
                  actionLabel="Go to Record Explorer"
                  onAction={() => window.location.assign('/records')}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 bg-slate-50/60">
                      <TableHead className="text-xs font-semibold text-slate-900">Record ID</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-900">Type</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-900">Content Hash</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-900">Status</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-900">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectRecords.map((r) => (
                      <TableRow key={r.id} className="border-slate-100 hover:bg-slate-50/60">
                        <TableCell className="font-mono text-xs font-semibold text-slate-900">
                          {truncateId(r.id)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-700">
                          {r.type}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">
                          {truncateHash(r.contentHash)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={r.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm" className="h-7 text-xs border-slate-200">
                            <Link href={`/records/${r.id}`}>Details</Link>
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
      )}
    </div>
  );
}
