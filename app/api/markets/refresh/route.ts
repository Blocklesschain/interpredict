import { NextRequest, NextResponse } from 'next/server'
import {
  setCachedMarkets,
  acquireRefreshLock,
  releaseRefreshLock,
} from '@/lib/marketsCache'
import { scanAllMarketsFromChain } from '@/lib/scanMarkets'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ---------------------------------------------------------------------------
// POST /api/markets/refresh
//
// Unconditionally scans the chain and overwrites the cached snapshot.
// Protected by CRON_SECRET so only authorised callers (scheduled jobs,
// Background Functions, admin tools) can trigger the expensive chain scan.
//
// Also uses a Netlify Blobs-backed refresh lock to prevent two simultaneous
// requests from starting duplicate scans.
//
// Usage:
//   curl -X POST https://<site>/api/markets/refresh \
//     -H "Authorization: Bearer <CRON_SECRET>"
//
// Response: { ok: true, count: number, updatedAt: string, lastIndexedBlock: string }
// ---------------------------------------------------------------------------

function isAuthorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    // No CRON_SECRET configured — allow the request (dev mode / opt-in).
    // In production you MUST set CRON_SECRET to prevent abuse.
    console.warn('[Markets Refresh] CRON_SECRET is not set; refresh endpoint is unprotected.')
    return true
  }

  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  return token === secret
}

export async function POST(request: NextRequest) {
  // 1. Authorisation check
  if (!isAuthorised(request)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorised' },
      { status: 401 },
    )
  }

  // 2. Acquire refresh lock to prevent duplicate simultaneous scans
  const lockAcquired = await acquireRefreshLock()
  if (!lockAcquired) {
    return NextResponse.json(
      { ok: false, error: 'Refresh already in progress' },
      { status: 409 },
    )
  }

  try {
    console.info('[Markets Refresh] Starting unconditional chain scan...')
    const { markets, lastIndexedBlock } = await scanAllMarketsFromChain()
    await setCachedMarkets(markets, lastIndexedBlock)

    const snapshot = {
      ok: true,
      count: markets.length,
      updatedAt: new Date().toISOString(),
      lastIndexedBlock,
    }

    console.info(
      `[Markets Refresh] Done: ${markets.length} markets cached at ${snapshot.updatedAt} (block ${lastIndexedBlock})`,
    )
    return NextResponse.json(snapshot, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Refresh failed'
    console.error('[Markets Refresh] Failed:', error)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  } finally {
    // Always release the lock, even on failure, so the next refresh can proceed
    await releaseRefreshLock()
  }
}