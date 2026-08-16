import { NextRequest, NextResponse } from 'next/server'
import { listMarkets, getSyncFreshness } from '@/repositories/markets'

// ---------------------------------------------------------------------------
// GET /api/markets
//
// Reads the PostgreSQL read model (no RPC, no full-chain scans).
// Standard envelope: { data, meta, error }.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic'

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const stateParam = url.searchParams.get('state')
    const categoryParam = url.searchParams.get('category')
    const creator = url.searchParams.get('creator')
    const page = parsePositiveInt(url.searchParams.get('page'), 1)
    const pageSize = parsePositiveInt(url.searchParams.get('pageSize'), 20)

    const state = stateParam !== null ? Number.parseInt(stateParam, 10) : undefined
    const category = categoryParam !== null ? Number.parseInt(categoryParam, 10) : undefined

    const result = await listMarkets({
      state: Number.isFinite(state) ? state : undefined,
      category: Number.isFinite(category) ? category : undefined,
      creator: creator ?? undefined,
      page,
      pageSize,
    })

    const freshness = await getSyncFreshness()

    return NextResponse.json({
      data: { markets: result.markets },
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        freshness,
      },
      error: null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read markets'
    console.error('[markets] Error:', error)
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