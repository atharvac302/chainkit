import * as React from 'react';
import { CheckCircle2, Clock, XCircle, CircleDot, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, getStatusColor } from '@/lib/utils';

export interface StatusBadgeProps {
  status: string | null | undefined;
  className?: string;
  showIcon?: boolean;
}

/**
 * StatusBadge displays an entity's lifecycle state with standardized color coding and icon.
 */
export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const normalized = (status || 'unknown').toLowerCase();
  const colorClass = getStatusColor(normalized);

  const renderIcon = () => {
    if (!showIcon) return null;
    const iconClass = 'mr-1 h-3 w-3 shrink-0';

    switch (normalized) {
      case 'confirmed':
      case 'active':
      case 'success':
        return <CheckCircle2 className={iconClass} />;
      case 'pending':
      case 'submitting':
        return <Clock className={cn(iconClass, 'animate-pulse')} />;
      case 'failed':
      case 'revoked':
      case 'error':
        return <XCircle className={iconClass} />;
      case 'created':
      case 'draft':
        return <CircleDot className={iconClass} />;
      default:
        return <AlertTriangle className={iconClass} />;
    }
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium capitalize tracking-wide transition-colors',
        colorClass,
        className
      )}
    >
      {renderIcon()}
      <span>{normalized}</span>
    </Badge>
  );
}
