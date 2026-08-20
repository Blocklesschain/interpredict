// Reconciles one market from the V2 contract into Supabase.

import { NextRequest, NextResponse } from 'next/server'
import { syncMarketById } from '@/services/indexer/syncMarket'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized.' },
      },
      { status: 401 },
    )
  }

  try {
    const body = (await request.json()) as { marketId?: number }
    const marketId = body.marketId
    if (typeof marketId !== 'number' || !Number.isFinite(marketId) || marketId < 0) {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: { code: 'INVALID_MARKET_ID', message: 'marketId is required.' },
        },
        { status: 400 },
      )
    }

    await syncMarketById(marketId)

    return NextResponse.json({
      data: { marketId, reconciled: true },
      meta: {},
      error: null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reconcile market'
    console.error('[markets/reconcile] Error:', error)
    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: { code: 'UNKNOWN', message },
      },
      { status: 500 },
    )
  }
}
