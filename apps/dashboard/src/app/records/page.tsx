'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  FileCheck2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Copy,
  Check,
  Search,
} from 'lucide-react';
import { apiClient, type RecordItem } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { formatDate, truncateHash, truncateId } from '@/lib/utils';
import { EmptyState, LoadingState, NoSearchResultState } from '@/components/ui-states';

export default function RecordsPage() {
  const [page, setPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [typeSearch, setTypeSearch] = React.useState('');
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['records', { page, limit: 10, status: statusFilter, type: typeSearch }],
    queryFn: () =>
      apiClient.getRecords({
        page,
        limit: 10,
        status: statusFilter,
        type: typeSearch,
      }),
  });

  const records = data?.records ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 1 };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearFilters = () => {
    setTypeSearch('');
    setStatusFilter('all');
    setPage(1);
  };

  const isFiltering = typeSearch.trim().length > 0 || statusFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Anchored Records
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Browse cryptographic attestations, verify SHA-256 state hashes, and monitor on-chain settlement.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <Input
                placeholder="Filter by type (e.g. invoice, certificate)..."
                value={typeSearch}
                onChange={(e) => {
                  setTypeSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-xs border-slate-300 focus:ring-primary"
              />
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                <Filter className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <span className="font-medium">Status:</span>
              </div>
              <select
                aria-label="Filter records by status"
                className="h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="created">Created</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table Card */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-base text-slate-900">Notarization Ledger</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Showing {records.length} records of {pagination.total} total recorded proofs.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {isLoading ? (
            <LoadingState message="Querying notarization ledger..." />
          ) : records.length === 0 ? (
            <div className="p-6">
              {isFiltering ? (
                <NoSearchResultState
                  query={typeSearch || statusFilter}
                  onClear={handleClearFilters}
                />
              ) : (
                <EmptyState
                  title="No records found"
                  description="Submit your first document or event hash using the ChainKit SDK or API to begin immutable notarization."
                  icon={FileCheck2}
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 bg-slate-50/60">
                      <TableHead className="text-xs font-semibold text-slate-900">Record ID</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-900">Type</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-900">Content Hash (SHA-256)</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-900">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-900">Timestamp</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record: RecordItem) => (
                      <TableRow key={record.id} className="border-slate-100 hover:bg-slate-50/60 group">
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-slate-900">{truncateId(record.id)}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(record.id, `id-${record.id}`)}
                              aria-label={`Copy Record ID ${record.id}`}
                              className="text-slate-400 hover:text-slate-900 p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              {copiedId === `id-${record.id}` ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 font-mono text-xs text-slate-800">
                            {record.type}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">
                          <div className="flex items-center space-x-1.5">
                            <span>{truncateHash(record.contentHash)}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(record.contentHash, `hash-${record.id}`)}
                              aria-label="Copy Content Hash"
                              className="text-slate-400 hover:text-slate-900 p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              {copiedId === `hash-${record.id}` ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={record.status} />
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {formatDate(record.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm" className="h-7 text-xs border-slate-200 hover:bg-slate-100">
                            <Link href={`/records/${record.id}`}>
                              Inspect
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-0 pt-2 text-xs text-slate-600">
                <div>
                  Page <span className="font-semibold text-slate-900">{pagination.page}</span> of{' '}
                  <span className="font-semibold text-slate-900">{pagination.totalPages || 1}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="h-8 text-xs"
                  >
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                    className="h-8 text-xs"
                  >
                    Next
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
