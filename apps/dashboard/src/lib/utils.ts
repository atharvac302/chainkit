import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines conditional class names with Tailwind CSS class merger.
 *
 * @param inputs - List of class names, conditionals, or objects.
 * @returns Merged class string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a Date or ISO timestamp into a human-readable string.
 *
 * @param date - Date object, ISO timestamp string, or epoch milliseconds.
 * @returns Formatted date string (e.g. 'Oct 14, 2026, 12:30 PM') or 'N/A' if invalid.
 */
export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Invalid date';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return 'N/A';
  }
}

/**
 * Truncates an EVM or cryptographic hash to first 6 and last 4 characters.
 *
 * @param hash - SHA-256 or Ethereum transaction hash.
 * @returns Truncated hash string (e.g., '0x1a2b...4c5d').
 */
export function truncateHash(hash: string | null | undefined): string {
  if (!hash) return '—';
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

/**
 * Truncates an entity ID to its first 8 characters.
 *
 * @param id - Entity ID (e.g. 'rec_cm20abcd1234').
 * @returns Truncated ID string (e.g., 'rec_cm20...').
 */
export function truncateId(id: string | null | undefined): string {
  if (!id) return '—';
  if (id.length <= 10) return id;
  return `${id.slice(0, 10)}...`;
}

/**
 * Returns Tailwind badge classes corresponding to a lifecycle status.
 *
 * @param status - Record or transaction lifecycle status.
 * @returns Tailwind CSS classes for color styling.
 */
export function getStatusColor(status: string | null | undefined): string {
  const normalized = (status || '').toLowerCase();
  switch (normalized) {
    case 'confirmed':
    case 'active':
    case 'success':
      return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
    case 'pending':
    case 'submitting':
    case 'processing':
      return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
    case 'failed':
    case 'revoked':
    case 'error':
      return 'bg-rose-500/10 text-rose-700 border-rose-500/20';
    case 'created':
    case 'draft':
      return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/**
 * Returns the public block explorer URL for a given transaction hash and chain ID.
 *
 * @param chainId - EVM network chain ID.
 * @param txHash - Transaction hash string.
 * @returns Public explorer URL for the transaction.
 */
export function getExplorerUrl(chainId: number, txHash: string | null | undefined): string {
  if (!txHash) return '#';
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    11155111: 'https://sepolia.etherscan.io',
    137: 'https://polygonscan.com',
    80001: 'https://mumbai.polygonscan.com',
    8453: 'https://basescan.org',
    84532: 'https://sepolia.basescan.org',
    42161: 'https://arbiscan.io',
  };
  const base = explorers[chainId] || 'https://sepolia.etherscan.io';
  return `${base}/tx/${txHash}`;
}
