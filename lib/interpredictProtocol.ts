import { ethers } from 'ethers'
import generatedAbi from './interpredictAbi.json'

export const MARKET_CATEGORIES = [
  'Sports', 'Politics', 'Crypto', 'Blockchain', 'Technology',
  'Artificial Intelligence', 'Economics', 'Finance', 'Business', 'Science',
  'Climate', 'Entertainment', 'Culture', 'Health', 'Real Estate', 'Gaming',
  'Web3', 'Other',
] as const

export const MARKET_STATES = [
  'Proposed', 'DEC Proposal Voting', 'Rejected', 'Cancelled', 'Approved',
  'Active', 'Trading Closed', 'Unresolved', 'Resolution Requested',
  'DEC Resolution Voting', 'Admin Verification', 'Outcome Confirmed',
  'Finalized', 'Resolved',
] as const

export const DECISION_REASONS = [
  'None', 'Approved by DEC', 'Rejected by DEC', 'Tied DEC proposal vote',
  'No DEC votes', 'Trading end passed',
] as const

export const INTERPREDICT_ABI = generatedAbi

export const MARKET_PARAM_TYPE = [
  'tuple(',
  'uint256 id,address creator,uint8 origin,uint8 category,uint8 state,',
  'string question,string description,string customCategory,string thumbnailURI,',
  'string resolutionCriteria,string primaryEvidenceURI,string backupEvidenceURI,',
  'uint64 tradingEndTime,uint64 proposalVotingStartedAt,uint64 proposalVotingDeadline,',
  'uint64 proposalFinalizedAt,uint64 activatedAt,uint64 resolutionRequestedAt,',
  'uint64 resolutionVotingDeadline,uint64 resolutionFinalizedAt,uint64 outcomeConfirmedAt,',
  'uint64 finalizedAt,uint32 approvalVotes,uint32 rejectionVotes,uint32 resolutionSnapshot,',
  'uint32 resolutionVoterCount,uint8 leadingOutcome,uint8 winningOutcome,',
  'uint8 proposalDecision,uint8 decisionReason,uint8 resolutionFailure,',
  'bool proposalFinalized,bool refundCompleted,bool resolutionVoteFinalized,',
  'bool adminConfirmed,bool seedReturned,bool activeMarketCancelled,',
  'uint256 originalSeed,uint256 tradingCollateral,uint256 marketVolume,',
  'uint256 creatorFeesEarned,uint256 creatorFeesClaimed,uint256 decRewardFunds,',
  'uint256 decRewardPerEligibleVoter,uint256 payoutRemaining,uint256 winningSharesRemaining,',
  'string adminVerificationReason,string adminEvidenceURI,string cancellationReason,',
  'string cancellationEvidenceURI,uint64 resolutionMembershipEpoch,',
  'uint64 adminVerificationDeadline,uint32 resolutionQuorum,',
  'address resolutionRequester',
  ')',
].join('')

const abiCoder = ethers.AbiCoder.defaultAbiCoder()

export type ProtocolMarket = {
  id: number
  creator: string
  origin: number
  category: number
  state: number
  question: string
  description: string
  customCategory: string
  thumbnailURI: string
  resolutionCriteria: string
  primaryEvidenceURI: string
  backupEvidenceURI: string
  tradingEndTime: number
  proposalVotingStartedAt: number
  proposalVotingDeadline: number
  proposalFinalizedAt: number
  activatedAt: number
  resolutionRequestedAt: number
  resolutionVotingDeadline: number
  resolutionMembershipEpoch: number
  adminVerificationDeadline: number
  resolutionRequester: string
  resolutionFinalizedAt: number
  outcomeConfirmedAt: number
  finalizedAt: number
  approvalVotes: number
  rejectionVotes: number
  resolutionSnapshot: number
  resolutionQuorum: number
  resolutionVoterCount: number
  leadingOutcome: number
  winningOutcome: number
  proposalDecision: number
  decisionReason: number
  resolutionFailure: number
  proposalFinalized: boolean
  refundCompleted: boolean
  resolutionVoteFinalized: boolean
  adminConfirmed: boolean
  seedReturned: boolean
  activeMarketCancelled: boolean
  adminVerificationReason: string
  adminEvidenceURI: string
  cancellationReason: string
  cancellationEvidenceURI: string
  originalSeed: string
  tradingCollateral: string
  marketVolume: string
  creatorFeesEarned: string
  creatorFeesClaimed: string
  creatorFeesClaimable: string
  decRewardFunds: string
  decRewardPerEligibleVoter: string
  payoutRemaining: string
  winningSharesRemaining: string
  outcomes: string[]
  balances: string[]
  shares: string[]
  prices: string[]
  participantCount?: number
  tradeCount?: number
  marketPaused?: boolean
}

export type MarketCore = Omit<
  ProtocolMarket,
  | 'outcomes'
  | 'balances'
  | 'shares'
  | 'prices'
  | 'creatorFeesClaimable'
  | 'participantCount'
  | 'tradeCount'
  | 'marketPaused'
>

function numeric(value: unknown) {
  return Number(BigInt(String(value)))
}

function marketCoreFromNamed(value: Record<string, unknown>): MarketCore {
  return {
    id: numeric(value.id),
    creator: String(value.creator),
    origin: numeric(value.origin),
    category: numeric(value.category),
    state: numeric(value.state),
    question: String(value.question),
    description: String(value.description),
    customCategory: String(value.customCategory),
    thumbnailURI: String(value.thumbnailURI),
    resolutionCriteria: String(value.resolutionCriteria),
    primaryEvidenceURI: String(value.primaryEvidenceURI),
    backupEvidenceURI: String(value.backupEvidenceURI),
    tradingEndTime: numeric(value.tradingEndTime),
    proposalVotingStartedAt: numeric(value.proposalVotingStartedAt),
    proposalVotingDeadline: numeric(value.proposalVotingDeadline),
    proposalFinalizedAt: numeric(value.proposalFinalizedAt),
    activatedAt: numeric(value.activatedAt),
    resolutionRequestedAt: numeric(value.resolutionRequestedAt),
    resolutionVotingDeadline: numeric(value.resolutionVotingDeadline),
    resolutionMembershipEpoch: numeric(value.resolutionMembershipEpoch),
    adminVerificationDeadline: numeric(value.adminVerificationDeadline),
    resolutionRequester: String(value.resolutionRequester),
    resolutionFinalizedAt: numeric(value.resolutionFinalizedAt),
    outcomeConfirmedAt: numeric(value.outcomeConfirmedAt),
    finalizedAt: numeric(value.finalizedAt),
    approvalVotes: numeric(value.approvalVotes),
    rejectionVotes: numeric(value.rejectionVotes),
    resolutionSnapshot: numeric(value.resolutionSnapshot),
    resolutionQuorum: numeric(value.resolutionQuorum),
    resolutionVoterCount: numeric(value.resolutionVoterCount),
    leadingOutcome: numeric(value.leadingOutcome),
    winningOutcome: numeric(value.winningOutcome),
    proposalDecision: numeric(value.proposalDecision),
    decisionReason: numeric(value.decisionReason),
    resolutionFailure: numeric(value.resolutionFailure),
    proposalFinalized: Boolean(value.proposalFinalized),
    refundCompleted: Boolean(value.refundCompleted),
    resolutionVoteFinalized: Boolean(value.resolutionVoteFinalized),
    adminConfirmed: Boolean(value.adminConfirmed),
    seedReturned: Boolean(value.seedReturned),
    activeMarketCancelled: Boolean(value.activeMarketCancelled),
    adminVerificationReason: String(value.adminVerificationReason),
    adminEvidenceURI: String(value.adminEvidenceURI),
    cancellationReason: String(value.cancellationReason),
    cancellationEvidenceURI: String(value.cancellationEvidenceURI),
    originalSeed: String(value.originalSeed),
    tradingCollateral: String(value.tradingCollateral),
    marketVolume: String(value.marketVolume),
    creatorFeesEarned: String(value.creatorFeesEarned),
    creatorFeesClaimed: String(value.creatorFeesClaimed),
    decRewardFunds: String(value.decRewardFunds),
    decRewardPerEligibleVoter: String(value.decRewardPerEligibleVoter),
    payoutRemaining: String(value.payoutRemaining),
    winningSharesRemaining: String(value.winningSharesRemaining),
  }
}

export function decodeMarket(encoded: string): MarketCore {
  const [decoded] = abiCoder.decode([MARKET_PARAM_TYPE], encoded)
  return marketCoreFromNamed(decoded as unknown as Record<string, unknown>)
}

export function decodeMarketOutcomes(value: unknown): string[] {
  if (typeof value === 'string' && ethers.isHexString(value)) {
    const [outcomes] = abiCoder.decode(['string[]'], value)
    return Array.from(outcomes as string[])
  }
  if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
    return Array.from(value)
  }
  const named = value as { outcomes?: unknown }
  if (!Array.isArray(named?.outcomes)) {
    throw new Error('Market outcomes result is missing its named outcomes field')
  }
  return Array.from(named.outcomes).map(String)
}

export function decodeMarketPricing(value: unknown): {
  balances: string[]
  shares: string[]
  prices: string[]
} {
  let balances: readonly unknown[]
  let shares: readonly unknown[]
  let prices: readonly unknown[]
  if (typeof value === 'string' && ethers.isHexString(value)) {
    const [decodedBalances, decodedShares, decodedPrices] = abiCoder.decode(
      ['uint256[]', 'uint256[]', 'uint256[]'],
      value,
    )
    balances = decodedBalances
    shares = decodedShares
    prices = decodedPrices
  } else {
    const named = value as {
      balances?: readonly unknown[]
      shares?: readonly unknown[]
      prices?: readonly unknown[]
    }
    if (
      !Array.isArray(named?.balances) ||
      !Array.isArray(named?.shares) ||
      !Array.isArray(named?.prices)
    ) {
      throw new Error(
        'Market pricing result must expose named balances, shares, and prices',
      )
    }
    balances = named.balances
    shares = named.shares
    prices = named.prices
  }
  return {
    balances: Array.from(balances).map(String),
    shares: Array.from(shares).map(String),
    prices: Array.from(prices).map(String),
  }
}

export function normalizePermanentURI(uri: string) {
  if (uri.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${uri.slice(7)}`
  if (uri.startsWith('ar://')) return `https://arweave.net/${uri.slice(5)}`
  return uri
}

export function categoryLabel(market: Pick<ProtocolMarket, 'category' | 'customCategory'>) {
  return market.category === 17 ? market.customCategory : MARKET_CATEGORIES[market.category] ?? 'Other'
}

export function isActiveTradeMarket(
  market: Pick<ProtocolMarket, 'state' | 'tradingEndTime' | 'marketPaused'>,
  now = Math.floor(Date.now() / 1000),
) {
  return market.state === 5 && market.tradingEndTime > now && !market.marketPaused
}

export function isInactiveTradeMarket(
  market: Pick<
    ProtocolMarket,
    'state' | 'tradingEndTime' | 'activeMarketCancelled' | 'marketPaused'
  >,
  now = Math.floor(Date.now() / 1000),
) {
  if (market.state === 5) return market.tradingEndTime <= now || Boolean(market.marketPaused)
  if (market.state === 3) return market.activeMarketCancelled
  return market.state >= 6 && market.state <= 13
}
