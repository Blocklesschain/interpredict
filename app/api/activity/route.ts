// Returns wallet-specific activity from indexed Supabase tables.

import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function normalizeAddress(addr: string): string {
  return addr.toLowerCase()
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const walletParam = url.searchParams.get('wallet')
    if (!walletParam) {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: { code: 'MISSING_WALLET', message: 'wallet query parameter is required.' },
        },
        { status: 400 },
      )
    }

    const wallet = normalizeAddress(walletParam)
    const supabase = getSupabase()

    const { data: participations, error: participationError } = await supabase
      .from('participations')
      .select('*')
      .eq('participant', wallet)
      .order('created_at', { ascending: false })
    if (participationError) throw participationError

    const { data: proposalVotes, error: proposalVoteError } = await supabase
      .from('proposal_votes')
      .select('*')
      .eq('voter', wallet)
      .order('created_at', { ascending: false })
    if (proposalVoteError) throw proposalVoteError

    const { data: resolutionVotes, error: resolutionVoteError } = await supabase
      .from('resolution_votes')
      .select('*')
      .eq('voter', wallet)
      .order('created_at', { ascending: false })
    if (resolutionVoteError) throw resolutionVoteError

    const { data: createdMarkets, error: createdMarketsError } = await supabase
      .from('markets')
      .select('id, question, state, created_at')
      .eq('creator', wallet)
      .order('created_at', { ascending: false })
    if (createdMarketsError) throw createdMarketsError

    return NextResponse.json({
      data: {
        wallet,
        participations: participations ?? [],
        proposalVotes: proposalVotes ?? [],
        resolutionVotes: resolutionVotes ?? [],
        createdMarkets: createdMarkets ?? [],
      },
      meta: {},
      error: null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read activity'
    console.error('[activity] Error:', error)
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
