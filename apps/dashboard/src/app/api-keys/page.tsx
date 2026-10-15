'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  RotateCw,
  Ban,
  ShieldAlert,
} from 'lucide-react';
import { apiClient, type ApiKey, type Project } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/utils';
import { EmptyState, LoadingState, SuccessBanner } from '@/components/ui-states';

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newKey, setNewKey] = React.useState<string | null>(null);
  const [selectedEnv, setSelectedEnv] = React.useState<'sandbox' | 'production'>('sandbox');
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('');
  const [revokingKeyId, setRevokingKeyId] = React.useState<string | null>(null);
  const [rotatingKeyId, setRotatingKeyId] = React.useState<string | null>(null);
  const [copiedKey, setCopiedKey] = React.useState(false);
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.getProjects(),
  });

  // Default project selection once projects load
  React.useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ['api-keys', selectedProjectId],
    queryFn: () => apiClient.getApiKeys(selectedProjectId),
    enabled: !!selectedProjectId,
  });

  // Create key mutation
  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.createApiKey(selectedProjectId, {
        environment: selectedEnv,
      }),
    onSuccess: (data) => {
      setNewKey(data.apiKey.key || data.apiKey.prefix);
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['api-keys', selectedProjectId] });
    },
  });

  // Revoke key mutation
  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => apiClient.revokeApiKey(selectedProjectId, keyId),
    onSuccess: () => {
      setRevokingKeyId(null);
      setSuccessBanner('API key was revoked immediately. All subsequent requests using this key will be rejected with 401 Unauthorized.');
      queryClient.invalidateQueries({ queryKey: ['api-keys', selectedProjectId] });
    },
  });

  // Rotate key mutation
  const rotateMutation = useMutation({
    mutationFn: (keyId: string) => apiClient.rotateApiKey(selectedProjectId, keyId),
    onSuccess: (data) => {
      setRotatingKeyId(null);
      setNewKey(data.apiKey.key || data.apiKey.prefix);
      queryClient.invalidateQueries({ queryKey: ['api-keys', selectedProjectId] });
    },
  });

  const handleCopyNewKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            API Keys & Authentication
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Provision and manage tenant credentials. Secrets are shown once and stored using HMAC-SHA256 verifiers.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          disabled={!selectedProjectId}
          className="shadow-sm self-start sm:self-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {successBanner && (
        <SuccessBanner
          title="Security Action Confirmed"
          message={successBanner}
          onDismiss={() => setSuccessBanner(null)}
        />
      )}

      {/* Main Keys Card */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <CardTitle className="text-base text-slate-900">Active Credentials</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Each key has granular environment restrictions and rate limits.
            </CardDescription>
          </div>
          {projects.length > 0 && (
            <div className="flex items-center space-x-2">
              <label htmlFor="workspace-select" className="text-xs font-medium text-slate-600">
                Workspace:
              </label>
              <select
                id="workspace-select"
                className="h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                {projects.map((p: Project) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {isLoading ? (
            <LoadingState message="Loading API key credentials..." />
          ) : apiKeys.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No API keys for this project"
                description="Generate a sandbox key to start integrating the ChainKit SDK into your local or backend application."
                actionLabel="Generate First Key"
                onAction={() => setIsCreateOpen(true)}
                icon={KeyRound}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50/60">
                    <TableHead className="text-xs font-semibold text-slate-900">Key Prefix</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-900">Environment</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-900">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-900">Created</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-900">Last Used</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-900">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key: ApiKey) => (
                    <TableRow key={key.id} className="border-slate-100 hover:bg-slate-50/60">
                      <TableCell className="font-mono text-xs font-semibold text-slate-900">
                        <div className="flex items-center space-x-2">
                          <KeyRound className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                          <span>{key.prefix}••••••••</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${
                            key.environment === 'production'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {key.environment}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={key.status} />
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {formatDate(key.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {formatDate(key.lastUsedAt)}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {key.status === 'active' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs border-slate-300 hover:bg-amber-50 hover:text-amber-800"
                              onClick={() => setRotatingKeyId(key.id)}
                              disabled={rotateMutation.isPending}
                            >
                              <RotateCw className="mr-1 h-3.5 w-3.5" />
                              Rotate
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => setRevokingKeyId(key.id)}
                              disabled={revokeMutation.isPending}
                            >
                              <Ban className="mr-1 h-3.5 w-3.5" />
                              Revoke
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Create Key */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-white border-slate-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Create New API Key</DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Provision a new Bearer secret key for project &ldquo;{projects.find((p: Project) => p.id === selectedProjectId)?.name}&rdquo;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div>
              <label htmlFor="create-env-select" className="block text-xs font-semibold text-slate-900 mb-1.5">
                Target Environment
              </label>
              <select
                id="create-env-select"
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                value={selectedEnv}
                onChange={(e) => setSelectedEnv(e.target.value as 'sandbox' | 'production')}
              >
                <option value="sandbox">Sandbox (Testnet only, Free Quota)</option>
                <option value="production">Production (Mainnet L1/L2)</option>
              </select>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600 space-y-1">
              <span className="font-semibold text-slate-900 block">Security Guarantee:</span>
              <p>
                API keys are never stored in plaintext. If lost or compromised, keys can be rotated or revoked with immediate effect.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Generating...' : 'Create Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Disclose New Key (ONE-TIME ONLY) */}
      <Dialog open={!!newKey} onOpenChange={() => setNewKey(null)}>
        <DialogContent className="bg-white border-slate-200 sm:max-w-lg">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
              <Check className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-slate-900">Save Your Secret API Key</DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-600">
              This secret will <strong>only be shown once</strong>. Store it securely in your environment variables.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs">
              <span className="select-all text-slate-900 break-all">{newKey}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyNewKey}
                className="ml-3 shrink-0 h-8"
              >
                {copiedKey ? (
                  <>
                    <Check className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Never commit this key to version control or expose it in client-side browser JavaScript.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button className="w-full" onClick={() => setNewKey(null)}>
              I Have Securely Saved This Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirm Revoke */}
      <Dialog open={!!revokingKeyId} onOpenChange={() => setRevokingKeyId(null)}>
        <DialogContent className="bg-white border-slate-200 sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center space-x-2 text-red-600 mb-1">
              <ShieldAlert className="h-5 w-5" />
              <DialogTitle className="text-slate-900">Revoke API Key?</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-600">
              This action takes effect immediately. Any applications or microservices actively using this credential will receive 401 Unauthorized errors.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setRevokingKeyId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => revokingKeyId && revokeMutation.mutate(revokingKeyId)}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? 'Revoking...' : 'Yes, Revoke Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirm Rotate */}
      <Dialog open={!!rotatingKeyId} onOpenChange={() => setRotatingKeyId(null)}>
        <DialogContent className="bg-white border-slate-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Rotate API Key</DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Rotating this key will revoke the existing credential immediately and generate a fresh replacement secret.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setRotatingKeyId(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => rotatingKeyId && rotateMutation.mutate(rotatingKeyId)}
              disabled={rotateMutation.isPending}
            >
              {rotateMutation.isPending ? 'Rotating...' : 'Rotate and Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
