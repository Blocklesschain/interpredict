// Wallet activity page backed by the activity API and Realtime.

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/useLocale'
import { getWalletState } from '@/services/wallet/wallet'
import { useWalletActivityRealtime } from '@/hooks/useMarketsRealtime'

interface ActivityData {
  wallet: string
  participations: Array<{
    market_id: number
    participant: string
    outcome_index: number
    gross: string
    net: string
    shares: string
    fee: string
    claimed: boolean
    indexed_at: string
  }>
  proposalVotes: Array<{
    market_id: number
    voter: string
    vote: number
    indexed_at: string
  }>
  resolutionVotes: Array<{
    market_id: number
    voter: string
    outcome_index: number
    indexed_at: string
  }>
  createdMarkets: Array<{
    id: number
    question: string
    state: number
    created_at: string
  }>
}

export default function ActivityPage() {
  const { t } = useLocale()
  const [activity, setActivity] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const walletAddress = getWalletState().address

  const fetchActivity = useCallback(async () => {
    if (!walletAddress) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/activity?wallet=${encodeURIComponent(walletAddress)}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      setActivity(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity')
    } finally {
      setLoading(false)
    }
  }, [walletAddress])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  useWalletActivityRealtime(walletAddress ?? '', () => {
    fetchActivity()
  })

  if (!walletAddress) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <EmptyState variant="no-activity" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">{t('nav.activity')}</h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="mb-4">
            <CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader>
            <CardContent><Skeleton className="h-4 w-1/2" /></CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <EmptyState variant="error" description={error} action={<Button onClick={fetchActivity}>{t('common.retry')}</Button>} />
      </div>
    )
  }

  const totalItems =
    (activity?.participations.length ?? 0) +
    (activity?.proposalVotes.length ?? 0) +
    (activity?.resolutionVotes.length ?? 0) +
    (activity?.createdMarkets.length ?? 0)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t('nav.activity')}</h1>
      {totalItems === 0 ? (
        <EmptyState variant="no-activity" />
      ) : (
        <div className="space-y-4">
          {}
          {(activity?.participations ?? []).map((item, i) => (
            <Card key={`p-${i}`}>
              <CardHeader>
                <CardTitle className="text-base">Market #{item.market_id}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant={item.claimed ? 'success' : 'warning'}>
                    {item.claimed ? 'Claimed' : 'Unclaimed'}
                  </Badge>
                  <span>Outcome {item.outcome_index}</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {}
          {(activity?.proposalVotes ?? []).map((item, i) => (
            <Card key={`pv-${i}`}>
              <CardHeader>
                <CardTitle className="text-base">Proposal Vote — Market #{item.market_id}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge>{item.vote === 1 ? 'Approve' : 'Reject'}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}

          {}
          {(activity?.resolutionVotes ?? []).map((item, i) => (
            <Card key={`rv-${i}`}>
              <CardHeader>
                <CardTitle className="text-base">Resolution Vote — Market #{item.market_id}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge>Outcome {item.outcome_index}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}

          {}
          {(activity?.createdMarkets ?? []).map((item, i) => (
            <Card key={`c-${i}`}>
              <CardHeader>
                <CardTitle className="text-base">{item.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge>Market #{item.id}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
