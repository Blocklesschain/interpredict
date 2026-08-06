import { NextResponse } from 'next/server'
import { getCachedMarkets } from '@/lib/marketsCache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ---------------------------------------------------------------------------
// GET /api/markets
//
// Returns `{ allMarkets: Market[] }` — the exact shape the frontend already
// expects.  This endpoint ONLY reads the Netlify Blobs cache; it NEVER hits
// the live RPC.  That makes responses fast (< 100ms) and reliable regardless
// of RPC gateway health.
//
// Refresh is handled separately by POST /api/markets/refresh, which should be
// called by a scheduled job (GitHub Action, cron-job.org) or a Background
// Function.  This decoupling means no user request ever waits for a chain scan.
//
// If the cache is empty (first deploy / cold start before the first refresh),
// we return an empty array with a 503 status so the frontend can show a
// "loading" state rather than an error.
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const cached = await getCachedMarkets()

    if (cached) {
      return NextResponse.json(
        { allMarkets: cached.markets },
        {
          headers: {
            'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=300',
            'X-Markets-Source': 'cache',
            'X-Markets-Updated-At': cached.updatedAt,
            ...(cached.lastIndexedBlock ? { 'X-Markets-Last-Block': cached.lastIndexedBlock } : {}),
          },
        },
      )
    }

    // No cache exists yet — the refresh endpoint hasn't run (or hasn't
    // completed) since deploy.  Return empty so the frontend can show a
    // graceful loading state rather than a hard error.
    console.warn('[Markets API] No cached snapshot available yet. Run POST /api/markets/refresh to seed the cache.')
    return NextResponse.json(
      { allMarkets: [], cacheStatus: 'empty' },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': '10',
          'X-Markets-Source': 'empty',
        },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read markets cache'
    console.error('[Markets API] Error reading cache:', error)
    return NextResponse.json({ error: message, allMarkets: [] }, { status: 502 })
  }
}