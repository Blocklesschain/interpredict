// Obsolete Blob full-scan refresh endpoint retained for emergency tooling.

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

      const existing = await getCachedMarkets()
      const existingMarkets = existing?.markets || []

      const marketMap = new Map<number, Market>()
      for (const m of existingMarkets) {
        marketMap.set(m.id, m)
      }

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
