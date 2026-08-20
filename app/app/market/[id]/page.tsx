// Market detail page using the single-market API and Realtime.

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
import { useMarketRealtime } from '@/hooks/useMarketsRealtime'
import type { MarketDto } from '@/types/market'
import { getResolutionStatus } from '@/lib/resolution-status'

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
  const id = Number(params.id as string)
  const [market, setMarket] = useState<MarketDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMarket = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/markets/${id}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      setMarket(json.data?.market ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchMarket()
  }, [fetchMarket])

  useMarketRealtime(id, (updated) => {
    setMarket(updated)
  })

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

  const resolution = market.resolution
    ? getResolutionStatus({
      quorumReached: market.resolution.quorumReached,
      tied: market.resolution.tied,
      outcomeAvailable: market.resolution.outcomeAvailable,
      suggestedOutcome: market.resolution.decSuggestedOutcome,
      confirmedOutcome: market.confirmedOutcome,
      finalized: market.finalized,
    })
    : null

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
          { }
          {market.description && (
            <div>
              <h4 className="text-sm font-semibold">{t('market.description')}</h4>
              <p className="text-sm text-muted-foreground">{market.description}</p>
            </div>
          )}

          { }
          <div>
            <h4 className="text-sm font-semibold">{t('market.resolutionCriteria')}</h4>
            <p className="text-sm text-muted-foreground">{market.resolutionCriteria}</p>
          </div>

          { }
          {resolution && (
            <div className="rounded-lg border border-border p-3">
              <h4 className="text-sm font-semibold mb-1">{t('resolution.status.title')}</h4>
              <p className="text-sm font-medium">{t(resolution.labelKey)}</p>
              <p className="text-sm text-muted-foreground">{t(resolution.explanationKey)}</p>
              {resolution.hasDecRecommendation && resolution.suggestedOutcome !== null && (
                <p className="text-sm mt-1">
                  {t('resolution.decSuggestedOutcome')}:{' '}
                  <span className="font-medium">{market.outcomeLabels[resolution.suggestedOutcome]}</span>
                </p>
              )}
            </div>
          )}

          { }
          <div>
            <h4 className="text-sm font-semibold mb-2">{t('market.outcomes')}</h4>
            <div className="space-y-2">
              {market.outcomeLabels.map((label, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-sm text-muted-foreground">{formatPrice(market.outcomePrices[i] ?? '0')}</span>
                </div>
              ))}
            </div>
          </div>

          { }
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
              {formatDate(market.marketEndTime)}
            </div>
            <div>
              <span className="text-muted-foreground">{t('market.totalVolume')}:</span>{' '}
              {formatVolume(market.totalVolume)}
            </div>
            <div>
              <span className="text-muted-foreground">{t('market.participants')}:</span>{' '}
              {market.participantCount}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
