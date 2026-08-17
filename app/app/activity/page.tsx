'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/useLocale'
import { getWalletState } from '@/services/wallet/wallet'

// ---------------------------------------------------------------------------
// Personal activity page (V2 §25, §26). Reads from PostgreSQL participations
// table via the API. No per-market RPC fan-out.
// ---------------------------------------------------------------------------

interface Participation {
  market_id: number
  participant: string
  outcome_index: number
  gross: string
  net: string
  shares: string
  fee: string
  claimed: boolean
  indexed_at: string
}

export default function ActivityPage() {
  const { t } = useLocale()
  const [activity, setActivity] = useState<Participation[]>([])
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
      const res = await fetch(`/api/markets?creator=${walletAddress}&page=1&pageSize=50`)
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      // For now, show markets created by the user as activity.
      // Full activity endpoint will be added in a future iteration.
      setActivity([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity')
    } finally {
      setLoading(false)
    }
  }, [walletAddress])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t('nav.activity')}</h1>
      {activity.length === 0 ? (
        <EmptyState variant="no-activity" />
      ) : (
        <div className="space-y-4">
          {activity.map((item, i) => (
            <Card key={i}>
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
        </div>
      )}
    </div>
  )
}