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
// Market Proposals page — shows Proposed and DECReview markets.
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
}

const CATEGORY_NAMES = [
  'Sports', 'Politics', 'Crypto', 'Blockchain', 'Technology', 'AI',
  'Economics', 'Finance', 'Business', 'Science', 'Climate', 'Entertainment',
  'Culture', 'Health', 'Real Estate', 'Gaming', 'Web3', 'Other',
]

export default function ProposalsPage() {
  const { t } = useLocale()
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProposals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '50', state: MarketState.Proposed.toString() })
      const res = await fetch(`/api/markets?${params}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      setMarkets(json.data?.markets ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t('nav.proposals')}</h1>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader>
              <CardContent><Skeleton className="h-4 w-1/2" /></CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState variant="error" description={error} action={<Button onClick={fetchProposals}>{t('common.retry')}</Button>} />
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
                    <Badge variant="warning">{STATE_LABELS[market.state] ?? 'Unknown'}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{CATEGORY_NAMES[market.category] ?? 'Other'}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}