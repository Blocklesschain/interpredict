// Canonical MarketDto shared by server mappers and client components.

export interface MarketResolutionDto {
  quorum: number
  totalVotes: number
  decSuggestedOutcome: number | null
  tied: boolean
  quorumReached: boolean | null
  outcomeAvailable: boolean
}

export interface MarketDto {
  id: number
  question: string
  description: string
  category: number
  customCategory: string
  thumbnailUri: string
  origin: number
  creator: string
  marketEndTime: number
  resolutionCriteria: string
  state: number
  outcomeLabels: string[]
  outcomePools: string[]
  outcomePrices: string[]
  totalVolume: string
  participantCount: number
  confirmedOutcome: number | null
  finalized: boolean
  cancelled: boolean
  cancelReason: string
  resolution?: MarketResolutionDto
}
