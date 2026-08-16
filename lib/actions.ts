// ---------------------------------------------------------------------------
// Dynamic action engine (V2 §29).
//
// Centralizes action availability so state logic is NOT duplicated across
// React components. Returns { visible, enabled, label, reasonDisabled }.
// ---------------------------------------------------------------------------

export const MarketState = {
  Proposed: 0,
  DECReview: 1,
  Rejected: 2,
  Cancelled: 3,
  Approved: 4,
  Active: 5,
  Closed: 6,
  Unresolved: 7,
  ResolutionRequested: 8,
  DECResolutionVoting: 9,
  AdminVerification: 10,
  Confirmed: 11,
  Finalized: 12,
  Resolved: 13,
} as const

export type MarketStateValue = (typeof MarketState)[keyof typeof MarketState]

export interface UserContext {
  walletAddress: string | null
  isCreator: boolean
  isTrader: boolean
  isActiveDec: boolean
  isAdmin: boolean
  hasVotedOnProposal: boolean
  hasVotedOnResolution: boolean
  hasParticipated: boolean
  hasClaimedWinnings: boolean
  resolutionAlreadyRequested: boolean
}

export interface ActionAvailability {
  visible: boolean
  enabled: boolean
  label: string
  reasonDisabled: string | null
}

export type ActionKey =
  | 'enterProposalReview'
  | 'voteOnProposal'
  | 'finalizeProposalVoting'
  | 'participate'
  | 'requestResolution'
  | 'voteOnResolution'
  | 'finalizeResolutionVoting'
  | 'confirmOutcome'
  | 'finalizeMarket'
  | 'claimWinnings'
  | 'claimCreatorFee'
  | 'claimDecRewards'
  | 'cancelMarket'

export function getAvailableActions(
  state: MarketStateValue,
  user: UserContext,
): Record<ActionKey, ActionAvailability> {
  const connected = user.walletAddress !== null

  const hidden: ActionAvailability = {
    visible: false,
    enabled: false,
    label: '',
    reasonDisabled: null,
  }

  const disabled = (label: string, reason: string): ActionAvailability => ({
    visible: true,
    enabled: false,
    label,
    reasonDisabled: reason,
  })

  const enabled = (label: string): ActionAvailability => ({
    visible: true,
    enabled: true,
    label,
    reasonDisabled: null,
  })

  const actions: Record<ActionKey, ActionAvailability> = {
    // Proposal review
    enterProposalReview: hidden,
    voteOnProposal: hidden,
    finalizeProposalVoting: hidden,
    // Participation
    participate: hidden,
    // Resolution
    requestResolution: hidden,
    voteOnResolution: hidden,
    finalizeResolutionVoting: hidden,
    confirmOutcome: hidden,
    finalizeMarket: hidden,
    // Claims
    claimWinnings: hidden,
    claimCreatorFee: hidden,
    claimDecRewards: hidden,
    // Admin
    cancelMarket: hidden,
  }

  if (!connected) {
    return actions
  }

  // ---- Proposal review ----
  if (state === MarketState.Proposed) {
    actions.enterProposalReview = enabled('Start DEC review')
  }
  if (state === MarketState.DECReview) {
    if (user.isActiveDec) {
      actions.voteOnProposal = user.hasVotedOnProposal
        ? disabled('Vote on proposal', 'You have already voted.')
        : enabled('Vote on proposal')
    }
    actions.finalizeProposalVoting = enabled('Finalize proposal voting')
  }

  // ---- Participation ----
  if (state === MarketState.Active) {
    actions.participate = user.hasParticipated
      ? disabled('Participate', 'You have already participated in this market.')
      : enabled('Participate')
  }

  // ---- Resolution ----
  if (
    state === MarketState.Active ||
    state === MarketState.Closed ||
    state === MarketState.Unresolved
  ) {
    if (user.resolutionAlreadyRequested) {
      actions.requestResolution = disabled('Request resolution', 'Resolution has already been requested.')
    } else if (user.isCreator || user.isTrader || user.isActiveDec) {
      actions.requestResolution = enabled('Request resolution')
    }
  }

  if (state === MarketState.ResolutionRequested || state === MarketState.DECResolutionVoting) {
    if (user.isActiveDec) {
      actions.voteOnResolution = user.hasVotedOnResolution
        ? disabled('Vote on resolution', 'You have already voted.')
        : enabled('Vote on resolution')
    }
    actions.finalizeResolutionVoting = enabled('Finalize resolution voting')
  }

  if (state === MarketState.AdminVerification) {
    if (user.isAdmin) {
      actions.confirmOutcome = enabled('Confirm outcome')
    }
  }

  if (state === MarketState.Confirmed) {
    actions.finalizeMarket = enabled('Finalize market')
  }

  // ---- Claims ----
  if (state === MarketState.Finalized) {
    if (user.hasParticipated) {
      actions.claimWinnings = user.hasClaimedWinnings
        ? disabled('Claim winnings', 'Winnings already claimed.')
        : enabled('Claim winnings')
    }
    if (user.isCreator) {
      actions.claimCreatorFee = enabled('Claim creator fee')
    }
    if (user.isActiveDec) {
      actions.claimDecRewards = enabled('Claim DEC rewards')
    }
  }

  // ---- Admin cancel ----
  if (
    user.isAdmin &&
    state !== MarketState.Finalized &&
    state !== MarketState.Resolved &&
    state !== MarketState.Cancelled &&
    state !== MarketState.Rejected
  ) {
    actions.cancelMarket = enabled('Cancel market')
  }

  return actions
}