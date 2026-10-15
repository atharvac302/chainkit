'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderKanban, Plus, ArrowRight, Calendar, FileText, Key, Check, Copy, AlertTriangle } from 'lucide-react';
import { apiClient, type Project } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { EmptyState, LoadingState, FormValidationError } from '@/components/ui-states';

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [projectName, setProjectName] = React.useState('');
  const [projectError, setProjectError] = React.useState<string | null>(null);
  const [newKeyGenerated, setNewKeyGenerated] = React.useState<string | null>(null);
  const [copiedKey, setCopiedKey] = React.useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.getProjects(),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => apiClient.createProject({ name }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (res.apiKey?.key) {
        setNewKeyGenerated(res.apiKey.key);
      } else {
        handleCloseDialog();
      }
    },
    onError: (err: unknown) => {
      setProjectError(err instanceof Error ? err.message : 'Failed to create project');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setProjectError('Please enter a project name.');
      return;
    }
    setProjectError(null);
    createMutation.mutate(projectName.trim());
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setProjectName('');
    setProjectError(null);
    setNewKeyGenerated(null);
  };

  const handleCopyKey = () => {
    if (newKeyGenerated) {
      navigator.clipboard.writeText(newKeyGenerated);
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
            Projects & Workspaces
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage your application workspaces, access tokens, and record partitions.
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="shadow-sm self-start sm:self-auto">
          <Plus className="mr-2 h-4 w-4" />
          Create Project
        </Button>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <LoadingState message="Loading tenant workspaces..." />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects configured"
          description="Create your first project to provision API keys and start anchoring records to the Sepolia testnet."
          actionLabel="Create First Project"
          onAction={() => setIsDialogOpen(true)}
          icon={FolderKanban}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: Project) => (
            <Card
              key={project.id}
              className="flex flex-col justify-between border-slate-200 bg-white shadow-sm hover:border-primary/50 transition-all hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FolderKanban className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="font-mono text-xs text-slate-500">
                    {project.id}
                  </span>
                </div>
                <CardTitle className="mt-4 text-lg font-bold text-slate-900">
                  {project.name}
                </CardTitle>
                <CardDescription className="flex items-center space-x-1.5 pt-1 text-xs text-slate-500">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Created {formatDate(project.createdAt)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-2 gap-2 border-y border-slate-100 py-3">
                  <div className="flex items-center space-x-2 text-xs text-slate-600">
                    <FileText className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span>
                      <strong className="text-slate-900">{project._count?.records ?? 0}</strong> Records
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-600">
                    <Key className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    <span>
                      <strong className="text-slate-900">{project._count?.apiKeys ?? 1}</strong> Keys
                    </span>
                  </div>
                </div>

                <Button asChild variant="outline" className="w-full justify-between text-xs border-slate-200 hover:bg-slate-50">
                  <Link href={`/projects/${project.id}`}>
                    <span>Manage Workspace</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent onClose={handleCloseDialog} className="bg-white border-slate-200 sm:max-w-md">
          {newKeyGenerated ? (
            <div className="space-y-4 py-2">
              <DialogHeader>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                  <Check className="h-6 w-6" />
                </div>
                <DialogTitle className="text-center text-slate-900">
                  Project & Sandbox Key Created!
                </DialogTitle>
                <DialogDescription className="text-center text-xs text-slate-600">
                  Your initial sandbox API key is displayed below. This secret is shown <strong>only once</strong>.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs">
                  <span className="select-all text-slate-900 break-all">{newKeyGenerated}</span>
                  <Button size="sm" variant="outline" onClick={handleCopyKey} className="ml-3 shrink-0 h-8">
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
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Save this key to your server .env file before closing this window.</span>
                </div>
              </div>

              <DialogFooter>
                <Button className="w-full" onClick={handleCloseDialog}>
                  I Have Saved My Sandbox Key
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle className="text-slate-900">Create New Project</DialogTitle>
                <DialogDescription className="text-xs text-slate-600">
                  Enter a recognizable workspace name for your application.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <label htmlFor="project-name" className="block text-xs font-semibold text-slate-900 mb-1.5">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="project-name"
                    placeholder="e.g. My Document Verification App"
                    value={projectName}
                    onChange={(e) => {
                      setProjectName(e.target.value);
                      if (projectError) setProjectError(null);
                    }}
                    autoFocus
                    className="border-slate-300"
                  />
                  <FormValidationError message={projectError ?? undefined} />
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  By creating a project, you agree to ChainKit&apos;s{' '}
                  <Link href="/terms" target="_blank" className="text-primary underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" className="text-primary underline">
                    Privacy Policy
                  </Link>
                  . Free sandbox tier with zero hidden charges.
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Workspace'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
