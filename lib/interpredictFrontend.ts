import type { ProtocolMarket } from './interpredictProtocol'

export type AccountMarketState = {
  shares: bigint[]
  netContribution: bigint
  hasTraded: boolean
  payoutClaimed: boolean
  proposalVote: number
  resolutionVote: number
  resolutionCounts: bigint[]
  reputationSettled: boolean
  rewardVested: boolean
  resolutionEligible: boolean
}

export type MarketRuntime = {
  paused: boolean
  marketPaused: boolean
  participantCount: number
  tradeCount: number
  resolutionMembershipEpoch: number
  adminVerificationDeadline: number
  resolutionQuorum: number
}

export type DECAccount = {
  exists: boolean
  active: boolean
  removed: boolean
  joinedAt: number
  proposalVotes: bigint
  resolutionVotes: bigint
  honestResolutionVotes: bigint
  incorrectResolutionVotes: bigint
  reputation: bigint
  totalRewardsEarned: bigint
  totalRewardsClaimed: bigint
  storedRewards: bigint
  claimableRewards: bigint
}

export type DECMemberRow = DECAccount & { address: string }

export type ChainActivity = {
  id: string
  event: string
  detail: string
  blockNumber: number
  txHash: string
}

export type WorkspaceAction = (
  method: string,
  args: unknown[],
  label: string,
) => Promise<void>

export type OpenMarket = (market: ProtocolMarket) => void
