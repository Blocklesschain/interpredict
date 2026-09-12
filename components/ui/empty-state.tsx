import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Distinct empty/error states (V2 §48). These are NOT the same state:
//   - "no records" vs "failed to load" vs "indexer behind" vs "no activity"
// ---------------------------------------------------------------------------

export type EmptyStateVariant = 'empty' | 'error' | 'indexer' | 'no-activity'

const VARIANT_COPY: Record<EmptyStateVariant, { title: string; description: string }> = {
  empty: {
    title: 'No records found',
    description: 'There is nothing to display here yet.',
  },
  error: {
    title: 'Failed to load data',
    description: 'Something went wrong while loading. Please try again.',
  },
  indexer: {
    title: 'Indexer is catching up',
    description: 'The latest on-chain data is still being synchronized.',
  },
  'no-activity': {
    title: 'No activity yet',
    description: 'This wallet has not participated in any markets.',
  },
}

export function EmptyState({
  variant = 'empty',
  title,
  description,
  className,
  action,
}: {
  variant?: EmptyStateVariant
  title?: string
  description?: string
  className?: string
  action?: React.ReactNode
}) {
  const copy = VARIANT_COPY[variant]
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-8 text-center',
        className,
      )}
    >
      <h3 className="text-sm font-semibold">{title ?? copy.title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description ?? copy.description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}