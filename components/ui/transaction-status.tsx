import { cn } from '@/lib/utils'
import { Badge } from './badge'

// ---------------------------------------------------------------------------
// Transaction status indicator (V2 §44, §47). Shows pending/confirmed/reverted
// without leaving users wondering whether the app froze.
// ---------------------------------------------------------------------------

export type TxStatus = 'idle' | 'pending' | 'confirmed' | 'reverted'

const STATUS_MAP: Record<TxStatus, { label: string; variant: 'muted' | 'warning' | 'success' | 'danger' }> = {
  idle: { label: 'Idle', variant: 'muted' },
  pending: { label: 'Pending', variant: 'warning' },
  confirmed: { label: 'Confirmed', variant: 'success' },
  reverted: { label: 'Reverted', variant: 'danger' },
}

export function TransactionStatus({
  status,
  className,
}: {
  status: TxStatus
  className?: string
}) {
  const { label, variant } = STATUS_MAP[status]
  return (
    <Badge variant={variant} className={cn('gap-1.5', className)}>
      {status === 'pending' && (
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      )}
      {label}
    </Badge>
  )
}