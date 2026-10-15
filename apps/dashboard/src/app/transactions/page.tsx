'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  ExternalLink,
  Filter,
  Copy,
  Check,
  Globe,
} from 'lucide-react';
import { apiClient, type TransactionItem } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { formatDate, truncateHash, truncateId } from '@/lib/utils';
import { EmptyState, LoadingState, NoSearchResultState } from '@/components/ui-states';

export default function TransactionsPage() {
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', statusFilter],
    queryFn: () => apiClient.getTransactions({ status: statusFilter }),
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getChainName = (chainId: number) => {
    switch (chainId) {
      case 11155111:
        return 'Sepolia Testnet';
      case 1:
        return 'Ethereum Mainnet';
      case 137:
        return 'Polygon PoS';
      default:
        return `EVM Chain ${chainId}`;
    }
  };

  const getExplorerUrl = (txHash: string | null, chainId: number) => {
    if (!txHash) return '#';
    if (chainId === 11155111) {
      return `https://sepolia.etherscan.io/tx/${txHash}`;
    }
    return `https://etherscan.io/tx/${txHash}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Relayer Transactions
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Real-time status of blockchain relayer broadcasts, gas settlements, and block confirmations.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-600">
            <Globe className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Target Network: <strong className="text-slate-900 font-semibold">Sepolia EVM Testnet (11155111)</strong></span>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <label htmlFor="tx-status-filter" className="text-xs text-slate-600 font-medium">
              Status:
            </label>
            <select
              id="tx-status-filter"
              aria-label="Filter transactions by status"
              className="h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="submitting">Submitting</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-base text-slate-900">Relayer Broadcast Ledger</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Showing {transactions.length} transactions handled by automated platform workers.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {isLoading ? (
            <LoadingState message="Fetching blockchain relayer transactions..." />
          ) : transactions.length === 0 ? (
            <div className="p-6">
              {statusFilter !== 'all' ? (
                <NoSearchResultState
                  query={statusFilter}
                  onClear={() => setStatusFilter('all')}
                />
              ) : (
                <EmptyState
                  title="No transactions recorded"
                  description="Transactions will appear here automatically when you anchor records via the API or SDK."
                  icon={ArrowLeftRight}
                />
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50/60">
                    <TableHead className="text-xs font-semibold text-slate-900">Transaction ID</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-900">Record ID</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-900">Chain</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-900">TX Hash (Explorer)</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-900">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-900">Submitted</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-900">Confirmed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx: TransactionItem) => (
                    <TableRow key={tx.id} className="border-slate-100 hover:bg-slate-50/60 group">
                      <TableCell className="font-mono text-xs font-semibold text-slate-900">
                        {truncateId(tx.id)}
                      </TableCell>

                      <TableCell className="font-mono text-xs">
                        <Link
                          href={`/records/${tx.recordId}`}
                          className="text-primary hover:underline font-semibold"
                        >
                          {truncateId(tx.recordId)}
                        </Link>
                      </TableCell>

                      <TableCell className="text-xs text-slate-700">
                        <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 font-medium">
                          {getChainName(tx.chainId)}
                        </span>
                      </TableCell>

                      <TableCell className="font-mono text-xs">
                        {tx.transactionHash ? (
                          <div className="flex items-center space-x-2">
                            <a
                              href={getExplorerUrl(tx.transactionHash, tx.chainId)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 font-semibold"
                            >
                              <span>{truncateHash(tx.transactionHash)}</span>
                              <ExternalLink className="h-3 w-3 opacity-70" aria-hidden="true" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopy(tx.transactionHash!, `hash-${tx.id}`)}
                              aria-label="Copy Transaction Hash"
                              className="text-slate-400 hover:text-slate-900 p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              {copiedKey === `hash-${tx.id}` ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Pending Broadcast</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={tx.status} />
                      </TableCell>

                      <TableCell className="text-xs text-slate-600">
                        {formatDate(tx.submittedAt)}
                      </TableCell>

                      <TableCell className="text-right text-xs text-slate-600">
                        {formatDate(tx.confirmedAt)}
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
