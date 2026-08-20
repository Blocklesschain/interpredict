// Fetches a single market by ID from Supabase.

import { NextRequest, NextResponse } from 'next/server'
import { getMarketById } from '@/repositories/markets'
import { mapMarketRowToDto } from '@/lib/market-dto'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params
    const id = Number.parseInt(idParam, 10)
    if (!Number.isFinite(id) || id < 0) {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: { code: 'INVALID_ID', message: 'Invalid market id.' },
        },
        { status: 400 },
      )
    }

    const row = await getMarketById(id)
    if (!row) {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: { code: 'NOT_FOUND', message: 'Market not found.' },
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      data: { market: mapMarketRowToDto(row) },
      meta: {},
      error: null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read market'
    console.error('[markets/[id]] Error:', error)
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
