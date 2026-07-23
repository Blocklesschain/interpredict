export type KeeperMethod =
  | 'finalizeProposalVoting'
  | 'syncTradingClosed'
  | 'finalizeResolutionVoting'
  | 'executeAdminVerificationTimeout'
  | 'finalizeMarket'

export type KeeperMarket = {
  state: number
  proposalVotingDeadline: number
  tradingEndTime: number
  resolutionVotingDeadline: number
  adminVerificationDeadline: number
}

export type KeeperContext = {
  blockTimestamp: number
  protocolPaused: boolean
  marketPaused: boolean
}

/**
 * Keeper actions only advance expired or already-confirmed lifecycle states.
 * They remain safe during protocol/market pauses because they do not create
 * markets or accept trades and are necessary to avoid trapped collateral.
 */
export function selectKeeperAction(
  market: KeeperMarket,
  context: KeeperContext,
): KeeperMethod | undefined {
  const now = context.blockTimestamp
  if (market.state === 1 && market.proposalVotingDeadline > 0 && now >= market.proposalVotingDeadline) {
    return 'finalizeProposalVoting'
  }
  if (market.state === 5 && market.tradingEndTime > 0 && now >= market.tradingEndTime) {
    return 'syncTradingClosed'
  }
  if (market.state === 9 && market.resolutionVotingDeadline > 0 && now >= market.resolutionVotingDeadline) {
    return 'finalizeResolutionVoting'
  }
  if (market.state === 10 && market.adminVerificationDeadline > 0 && now >= market.adminVerificationDeadline) {
    return 'executeAdminVerificationTimeout'
  }
  if (market.state === 11) return 'finalizeMarket'
  return undefined
}

export function deterministicCursor(total: number, limit: number, blockTimestamp: number) {
  if (!Number.isSafeInteger(total) || total <= 0) return 0
  if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error('limit must be positive')
  const windows = Math.ceil(total / limit)
  const fiveMinuteWindow = Math.floor(blockTimestamp / 300)
  return (fiveMinuteWindow % windows) * limit
}
