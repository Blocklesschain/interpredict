import 'server-only'
import { getSupabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Markets repository — typed read access to the PostgreSQL read model.
// No N+1: outcomes are fetched in a single joined query.
// ---------------------------------------------------------------------------

export interface MarketRow {
  id: number
  question: string
  description: string
  category: number
  custom_category: string | null
  origin: number
  creator: string
  state: number
  end_time: number
  resolution_criteria: string
  thumbnail_url: string | null
  total_volume: string
  participant_count: number
  confirmed_outcome: number | null
  finalized: boolean
  cancelled: boolean
  cancel_reason: string | null
  indexed_at: string
}

export interface MarketOutcomeRow {
  market_id: number
  outcome_index: number
  label: string
  pool: string
  price: string
}

export interface MarketListQuery {
  state?: number
  category?: number
  creator?: string
  page: number
  pageSize: number
}

export interface MarketListResult {
  markets: Array<MarketRow & { outcomes: MarketOutcomeRow[] }>
  total: number
  page: number
  pageSize: number
}

export async function listMarkets(query: MarketListQuery): Promise<MarketListResult> {
  const supabase = getSupabase()
  const page = Math.max(1, query.page)
  const pageSize = Math.min(100, Math.max(1, query.pageSize))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let builder = supabase
    .from('markets')
    .select('*', { count: 'exact' })

  if (query.state !== undefined) builder = builder.eq('state', query.state)
  if (query.category !== undefined) builder = builder.eq('category', query.category)
  if (query.creator) builder = builder.eq('creator', query.creator.toLowerCase())

  const { data, error, count } = await builder
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  const markets = (data ?? []) as MarketRow[]

  // Fetch outcomes for the page of markets in a single query (no N+1).
  const marketIds = markets.map((m) => m.id)
  let outcomes: MarketOutcomeRow[] = []
  if (marketIds.length > 0) {
    const { data: outcomeData, error: outcomeError } = await supabase
      .from('market_outcomes')
      .select('*')
      .in('market_id', marketIds)
      .order('outcome_index', { ascending: true })
    if (outcomeError) throw outcomeError
    outcomes = (outcomeData ?? []) as MarketOutcomeRow[]
  }

  const outcomesByMarket = new Map<number, MarketOutcomeRow[]>()
  for (const o of outcomes) {
    const list = outcomesByMarket.get(o.market_id) ?? []
    list.push(o)
    outcomesByMarket.set(o.market_id, list)
  }

  return {
    markets: markets.map((m) => ({ ...m, outcomes: outcomesByMarket.get(m.id) ?? [] })),
    total: count ?? 0,
    page,
    pageSize,
  }
}

export async function getMarketById(
  id: number,
): Promise<(MarketRow & { outcomes: MarketOutcomeRow[] }) | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase.from('markets').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null

  const { data: outcomeData, error: outcomeError } = await supabase
    .from('market_outcomes')
    .select('*')
    .eq('market_id', id)
    .order('outcome_index', { ascending: true })
  if (outcomeError) throw outcomeError

  return {
    ...(data as MarketRow),
    outcomes: (outcomeData ?? []) as MarketOutcomeRow[],
  }
}

export async function getSyncFreshness(): Promise<{
  lastSuccessfulSync: string | null
  lagSeconds: number | null
}> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('sync_checkpoints')
    .select('last_successful_sync_at')
    .maybeSingle()

  if (error) throw error
  if (!data?.last_successful_sync_at) {
    return { lastSuccessfulSync: null, lagSeconds: null }
  }

  const lastSync = new Date(data.last_successful_sync_at).getTime()
  const lagSeconds = Math.max(0, Math.floor((Date.now() - lastSync) / 1000))
  return { lastSuccessfulSync: data.last_successful_sync_at, lagSeconds }
}