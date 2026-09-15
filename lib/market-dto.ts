// Maps database market rows into the canonical MarketDto shape.

import 'server-only'
import type { MarketRow, MarketOutcomeRow } from '@/repositories/markets'
import type { MarketDto, MarketResolutionDto } from '@/types/market'

export type { MarketDto, MarketResolutionDto }

export function mapMarketRowToDto(
  row: MarketRow & { outcomes: MarketOutcomeRow[] },
): MarketDto {
  const outcomeLabels = row.outcomes.map((o) => o.label)
  const outcomePools = row.outcomes.map((o) => o.pool)
  const outcomePrices = row.outcomes.map((o) => o.price)

  return {
    id: row.id,
    question: row.question,
    description: row.description,
    category: row.category,
    customCategory: row.custom_category ?? '',
    thumbnailUri: row.thumbnail_url ?? '',
    origin: row.origin,
    creator: row.creator,
    marketEndTime: row.end_time,
    resolutionCriteria: row.resolution_criteria,
    state: row.state,
    outcomeLabels,
    outcomePools,
    outcomePrices,
    totalVolume: row.total_volume,
    participantCount: row.participant_count,
    confirmedOutcome: row.confirmed_outcome,
    finalized: row.finalized,
    cancelled: row.cancelled,
    cancelReason: row.cancel_reason ?? '',
    resolution: row.resolution
      ? {
          quorum: row.resolution.quorum,
          totalVotes: row.resolution.total_votes,
          decSuggestedOutcome: row.resolution.dec_suggested_outcome,
          tied: row.resolution.tied,
          quorumReached: row.resolution.quorum_reached,
          outcomeAvailable: row.resolution.dec_outcome_available,
        }
      : undefined,
  }
}

export function mapMarketRowsToDtos(
  rows: Array<MarketRow & { outcomes: MarketOutcomeRow[] }>,
): MarketDto[] {
  return rows.map(mapMarketRowToDto)
}
