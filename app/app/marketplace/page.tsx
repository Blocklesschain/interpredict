'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/useLocale'
import { MarketState } from '@/lib/actions'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Marketplace page — reads from PostgreSQL via /api/markets.
// Zero RPC calls, zero full-chain scans.
// ---------------------------------------------------------------------------

interface Market {
  id: number
  question: string
  category: number
  state: number
  creator: string
  end_time: number
  total_volume: string
  participant_count: number
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

const STATE_VARIANTS: Record<number, 'success' | 'warning' | 'danger' | 'muted' | 'default'> = {
  [MarketState.Active]: 'success',
  [MarketState.Proposed]: 'warning',
  [MarketState.DECReview]: 'warning',
  [MarketState.ResolutionRequested]: 'warning',
  [MarketState.DECResolutionVoting]: 'warning',
  [MarketState.AdminVerification]: 'warning',
  [MarketState.Finalized]: 'default',
  [MarketState.Confirmed]: 'default',
  [MarketState.Resolved]: 'default',
  [MarketState.Rejected]: 'danger',
  [MarketState.Cancelled]: 'danger',
  [MarketState.Approved]: 'success',
  [MarketState.Closed]: 'muted',
  [MarketState.Unresolved]: 'muted',
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

function formatEndTime(unix: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = unix - now
  if (diff <= 0) return 'Ended'
  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  if (days > 0) return `${days}d ${hours}h`
  return `${hours}h`
}

export default function MarketplacePage() {
  const { t } = useLocale()
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stateFilter, setStateFilter] = useState<number | undefined>(undefined)

  const fetchMarkets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '50' })
      if (stateFilter !== undefined) params.set('state', stateFilter.toString())
      const res = await fetch(`/api/markets?${params}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      setMarkets(json.data?.markets ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load markets')
    } finally {
      setLoading(false)
    }
  }, [stateFilter])

  useEffect(() => {
    fetchMarkets()
  }, [fetchMarkets])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('nav.marketplace')}</h1>
        <div className="flex gap-2">
          {[undefined, MarketState.Active, MarketState.Proposed, MarketState.Finalized].map((s) => (
            <Button
              key={s ?? 'all'}
              variant={stateFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStateFilter(s)}
            >
              {s === undefined ? 'All' : STATE_LABELS[s]}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="mb-2 h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState variant="error" description={error} action={<Button onClick={fetchMarkets}>{t('common.retry')}</Button>} />
      ) : markets.length === 0 ? (
        <EmptyState variant="empty" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => (
            <Link key={market.id} href={`/app/market/${market.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2 text-base">{market.question}</CardTitle>
                    <Badge variant={STATE_VARIANTS[market.state] ?? 'muted'}>
                      {STATE_LABELS[market.state] ?? 'Unknown'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{CATEGORY_NAMES[market.category] ?? 'Other'}</p>
                    <p>{formatVolume(market.total_volume)} • {market.participant_count} participants</p>
                    <p>{formatEndTime(market.end_time)}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}