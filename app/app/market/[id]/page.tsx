'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/useLocale'
import { MarketState } from '@/lib/actions'

// ---------------------------------------------------------------------------
// Market detail page (V2 §40). Reads from PostgreSQL via /api/markets/:id.
// Resolution criteria visible BEFORE participation.
// ---------------------------------------------------------------------------

interface Market {
  id: number
  question: string
  description: string
  category: number
  custom_category: string | null
  origin: number
  creator: string
  state: number
  end_time: number
  resolution_criteria: string
  thumbnail_url: string | null
  total_volume: string
  participant_count: number
  confirmed_outcome: number | null
  finalized: boolean
  cancelled: boolean
  cancel_reason: string | null
  outcomes: Array<{ label: string; pool: string; price: string }>
}

const STATE_LABELS: Record<number, string> = {
  [MarketState.Proposed]: 'Pending',
  [MarketState.DECReview]: 'Under Review',
  [MarketState.Rejected]: 'Rejected',
  [MarketState.Cancelled]: 'Cancelled',
  [MarketState.Approved]: 'Approved',
  [MarketState.Active]: 'Active',
  [MarketState.Closed]: 'Closed',
  [MarketState.Unresolved]: 'Unresolved',
  [MarketState.ResolutionRequested]: 'Under Resolution',
  [MarketState.DECResolutionVoting]: 'Under Resolution',
  [MarketState.AdminVerification]: 'Under Resolution',
  [MarketState.Confirmed]: 'Resolved',
  [MarketState.Finalized]: 'Resolved',
  [MarketState.Resolved]: 'Resolved',
}

const CATEGORY_NAMES = [
  'Sports', 'Politics', 'Crypto', 'Blockchain', 'Technology', 'AI',
  'Economics', 'Finance', 'Business', 'Science', 'Climate', 'Entertainment',
  'Culture', 'Health', 'Real Estate', 'Gaming', 'Web3', 'Other',
]

function formatVolume(wei: string): string {
  const eth = Number(wei) / 1e18
  if (eth >= 1000) return `${(eth / 1000).toFixed(1)}K ITL`
  if (eth >= 1) return `${eth.toFixed(1)} ITL`
  return `${(eth * 1000).toFixed(0)} mITL`
}

function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleString()
}

function formatPrice(price: string): string {
  const pct = Number(price) / 1e16
  return `${pct.toFixed(1)}%`
}

export default function MarketDetailPage() {
  const { t } = useLocale()
  const params = useParams()
  const id = params.id as string
  const [market, setMarket] = useState<Market | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMarket = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/markets?page=1&pageSize=1`)
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      const markets = json.data?.markets ?? []
      const found = markets.find((m: Market) => m.id === Number(id))
      if (!found) throw new Error('Market not found')
      setMarket(found)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchMarket()
  }, [fetchMarket])

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Skeleton className="mb-4 h-8 w-3/4" />
        <Skeleton className="mb-2 h-4 w-1/2" />
        <Skeleton className="mb-6 h-4 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error || !market) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <EmptyState variant="error" description={error ?? 'Market not found'} action={<Button onClick={fetchMarket}>{t('common.retry')}</Button>} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl">{market.question}</CardTitle>
            <Badge>{STATE_LABELS[market.state] ?? 'Unknown'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Description */}
          {market.description && (
            <div>
              <h4 className="text-sm font-semibold">{t('market.description')}</h4>
              <p className="text-sm text-muted-foreground">{market.description}</p>
            </div>
          )}

          {/* Resolution criteria — visible BEFORE participation (V2 §40) */}
          <div>
            <h4 className="text-sm font-semibold">{t('market.resolutionCriteria')}</h4>
            <p className="text-sm text-muted-foreground">{market.resolution_criteria}</p>
          </div>

          {/* Outcomes */}
          <div>
            <h4 className="text-sm font-semibold mb-2">{t('market.outcomes')}</h4>
            <div className="space-y-2">
              {market.outcomes.map((outcome, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium">{outcome.label}</span>
                  <span className="text-sm text-muted-foreground">{formatPrice(outcome.price)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">{t('market.category')}:</span>{' '}
              {CATEGORY_NAMES[market.category] ?? 'Other'}
            </div>
            <div>
              <span className="text-muted-foreground">{t('market.creator')}:</span>{' '}
              <span className="font-mono text-xs">{market.creator.slice(0, 6)}...{market.creator.slice(-4)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('market.endTime')}:</span>{' '}
              {formatDate(market.end_time)}
            </div>
            <div>
              <span className="text-muted-foreground">{t('market.totalVolume')}:</span>{' '}
              {formatVolume(market.total_volume)}
            </div>
            <div>
              <span className="text-muted-foreground">{t('market.participants')}:</span>{' '}
              {market.participant_count}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}