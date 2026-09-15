import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getSyncFreshness } from '@/repositories/markets'

// ---------------------------------------------------------------------------
// GET /api/health
//
// Safe health endpoint. Returns status without exposing credentials or
// sensitive infrastructure details.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic'

export async function GET() {
  let database = 'unreachable'
  try {
    const supabase = getSupabase()
    const { error } = await supabase.from('sync_checkpoints').select('chain_id').limit(1)
    database = error ? 'unreachable' : 'reachable'
  } catch {
    database = 'unreachable'
  }

  let freshness: { lastSuccessfulSync: string | null; lagSeconds: number | null }
  try {
    freshness = await getSyncFreshness()
  } catch {
    freshness = { lastSuccessfulSync: null, lagSeconds: null }
  }

  const indexerHealthy =
    freshness.lastSuccessfulSync !== null && (freshness.lagSeconds ?? Infinity) < 300

  return NextResponse.json({
    data: {
      status: database === 'reachable' && indexerHealthy ? 'ok' : 'degraded',
      database,
      indexer: {
        status: indexerHealthy ? 'healthy' : 'behind',
        lastSuccessfulSync: freshness.lastSuccessfulSync,
        lag: freshness.lagSeconds !== null ? `${freshness.lagSeconds}s` : null,
      },
    },
    meta: {},
    error: null,
  })
}