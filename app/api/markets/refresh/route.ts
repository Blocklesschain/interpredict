import { NextRequest, NextResponse } from 'next/server'
import {
  getCachedMarkets,
  setCachedMarkets,
  acquireRefreshLock,
  releaseRefreshLock,
} from '@/lib/marketsCache'
import { scanAllMarketsFromChain } from '@/lib/scanMarkets'
import type { Market } from '@/lib/marketsCache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ---------------------------------------------------------------------------
// POST /api/markets/refresh
//
// Supports two modes:
//
// 1. Full refresh (no query params):
//    Scans ALL markets.  Only works if total markets fit in 10s (~5-6 markets).
//    For larger sets, use incremental mode.
//
// 2. Incremental refresh (?startId=0&count=5):
//    Scans a subset of markets and merges them into the existing cache.
//    Call repeatedly with different startId values to cover all markets.
//    The GitHub Actions workflow uses this mode.
//
// Protected by CRON_SECRET.  Uses a Blobs-backed refresh lock to prevent
// duplicate simultaneous scans.
//
// Response: { ok: true, count, updatedAt, lastIndexedBlock, totalCount, startId, endId }
// ---------------------------------------------------------------------------

function isAuthorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    console.warn('[Markets Refresh] CRON_SECRET is not set; refresh endpoint is unprotected.')
    return true
  }

  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  return token === secret
}

export async function POST(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorised' }, { status: 401 })
  }

  const lockAcquired = await acquireRefreshLock()
  if (!lockAcquired) {
    return NextResponse.json({ ok: false, error: 'Refresh already in progress' }, { status: 409 })
  }

  try {
    // Parse incremental params
    const url = new URL(request.url)
    const startIdParam = url.searchParams.get('startId')
    const countParam = url.searchParams.get('count')

    const isIncremental = startIdParam !== null
    const startId = isIncremental ? Math.max(0, parseInt(startIdParam || '0', 10) || 0) : 0
    const count = isIncremental ? Math.max(1, Math.min(5, parseInt(countParam || '5', 10) || 5)) : 999

    console.info(
      `[Markets Refresh] ${isIncremental ? `Incremental scan (startId=${startId}, count=${count})` : 'Full scan'} starting...`,
    )

    const { markets: freshMarkets, lastIndexedBlock, totalCount } =
      await scanAllMarketsFromChain(startId, isIncremental ? count : 999)

    if (isIncremental) {
      // Merge fresh markets into existing cache
      const existing = await getCachedMarkets()
      const existingMarkets = existing?.markets || []

      // Build a map for O(1) lookup
      const marketMap = new Map<number, Market>()
      for (const m of existingMarkets) {
        marketMap.set(m.id, m)
      }
      // Overwrite with fresh data
      for (const m of freshMarkets) {
        marketMap.set(m.id, m)
      }

      const merged = Array.from(marketMap.values()).sort((a, b) => a.id - b.id)
      await setCachedMarkets(merged, lastIndexedBlock)

      const endId = Math.min(startId + count, totalCount)
      console.info(
        `[Markets Refresh] Incremental batch ${startId}-${endId - 1} merged: ${merged.length} total markets in cache`,
      )

      return NextResponse.json({
        ok: true,
        count: merged.length,
        batchCount: freshMarkets.length,
        totalCount,
        startId,
        endId,
        updatedAt: new Date().toISOString(),
        lastIndexedBlock,
      })
    }

    // Full refresh — overwrite entire cache
    await setCachedMarkets(freshMarkets, lastIndexedBlock)

    console.info(`[Markets Refresh] Full refresh complete: ${freshMarkets.length} markets`)
    return NextResponse.json({
      ok: true,
      count: freshMarkets.length,
      totalCount,
      updatedAt: new Date().toISOString(),
      lastIndexedBlock,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Refresh failed'
    console.error('[Markets Refresh] Failed:', error)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  } finally {
    await releaseRefreshLock()
  }
}