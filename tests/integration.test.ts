import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Phase 27: Integration Tests
//
// Tests cross-layer integration: error normalization, action engine,
// i18n fallback, theme persistence, and wallet state management.
// ---------------------------------------------------------------------------

describe('Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Error normalization', () => {
    it('detects wallet cancellation', async () => {
      const { normalizeError } = await import('@/lib/errors')

      const result = normalizeError({ code: 4001, message: 'User rejected the request' })
      expect(result.code).toBe('USER_CANCELLED')
      expect(result.message).toContain('cancelled')
    })

    it('detects rate limiting', async () => {
      const { normalizeError } = await import('@/lib/errors')

      const result = normalizeError({ message: '429 Too Many Requests' })
      expect(result.code).toBe('RPC_RATE_LIMITED')
    })

    it('detects network unavailable', async () => {
      const { normalizeError } = await import('@/lib/errors')

      const result = normalizeError({ message: 'fetch failed' })
      expect(result.code).toBe('NETWORK_UNAVAILABLE')
    })

    it('detects contract custom errors', async () => {
      const { normalizeError } = await import('@/lib/errors')

      const result = normalizeError({
        revert: { name: 'InvalidMarketState' },
        message: 'execution reverted',
      })
      expect(result.code).toBe('INVALID_STATE')
    })

    it('detects AlreadyParticipated', async () => {
      const { normalizeError } = await import('@/lib/errors')

      const result = normalizeError({
        revert: { name: 'AlreadyParticipated' },
      })
      expect(result.code).toBe('ACTION_ALREADY_COMPLETED')
    })

    it('detects Unauthorized', async () => {
      const { normalizeError } = await import('@/lib/errors')

      const result = normalizeError({
        revert: { name: 'Unauthorized' },
      })
      expect(result.code).toBe('UNAUTHORIZED')
    })

    it('falls back to UNKNOWN for unrecognized errors', async () => {
      const { normalizeError } = await import('@/lib/errors')

      const result = normalizeError(new Error('Something weird happened'))
      expect(result.code).toBe('UNKNOWN')
    })

    it('handles null/undefined gracefully', async () => {
      const { normalizeError } = await import('@/lib/errors')

      expect(normalizeError(null).code).toBe('UNKNOWN')
      expect(normalizeError(undefined).code).toBe('UNKNOWN')
    })
  })

  describe('Action engine', () => {
    it('returns all hidden when wallet not connected', async () => {
      const { getAvailableActions, MarketState } = await import('@/lib/actions')

      const actions = getAvailableActions(MarketState.Active, {
        walletAddress: null,
        isCreator: false,
        isTrader: false,
        isActiveDec: false,
        isAdmin: false,
        hasVotedOnProposal: false,
        hasVotedOnResolution: false,
        hasParticipated: false,
        hasClaimedWinnings: false,
        resolutionAlreadyRequested: false,
      })

      // All actions should be hidden
      for (const action of Object.values(actions)) {
        expect(action.visible).toBe(false)
      }
    })

    it('shows participate for Active market', async () => {
      const { getAvailableActions, MarketState } = await import('@/lib/actions')

      const actions = getAvailableActions(MarketState.Active, {
        walletAddress: '0xabc',
        isCreator: false,
        isTrader: false,
        isActiveDec: false,
        isAdmin: false,
        hasVotedOnProposal: false,
        hasVotedOnResolution: false,
        hasParticipated: false,
        hasClaimedWinnings: false,
        resolutionAlreadyRequested: false,
      })

      expect(actions.participate.visible).toBe(true)
      expect(actions.participate.enabled).toBe(true)
    })

    it('disables participate when already participated', async () => {
      const { getAvailableActions, MarketState } = await import('@/lib/actions')

      const actions = getAvailableActions(MarketState.Active, {
        walletAddress: '0xabc',
        isCreator: false,
        isTrader: false,
        isActiveDec: false,
        isAdmin: false,
        hasVotedOnProposal: false,
        hasVotedOnResolution: false,
        hasParticipated: true,
        hasClaimedWinnings: false,
        resolutionAlreadyRequested: false,
      })

      expect(actions.participate.visible).toBe(true)
      expect(actions.participate.enabled).toBe(false)
      expect(actions.participate.reasonDisabled).toContain('already participated')
    })

    it('shows resolution request for trader', async () => {
      const { getAvailableActions, MarketState } = await import('@/lib/actions')

      const actions = getAvailableActions(MarketState.Closed, {
        walletAddress: '0xabc',
        isCreator: false,
        isTrader: true,
        isActiveDec: false,
        isAdmin: false,
        hasVotedOnProposal: false,
        hasVotedOnResolution: false,
        hasParticipated: true,
        hasClaimedWinnings: false,
        resolutionAlreadyRequested: false,
      })

      expect(actions.requestResolution.visible).toBe(true)
      expect(actions.requestResolution.enabled).toBe(true)
    })

    it('shows claim winnings for Finalized market', async () => {
      const { getAvailableActions, MarketState } = await import('@/lib/actions')

      const actions = getAvailableActions(MarketState.Finalized, {
        walletAddress: '0xabc',
        isCreator: false,
        isTrader: true,
        isActiveDec: false,
        isAdmin: false,
        hasVotedOnProposal: false,
        hasVotedOnResolution: false,
        hasParticipated: true,
        hasClaimedWinnings: false,
        resolutionAlreadyRequested: true,
      })

      expect(actions.claimWinnings.visible).toBe(true)
      expect(actions.claimWinnings.enabled).toBe(true)
    })

    it('shows admin actions for admin user', async () => {
      const { getAvailableActions, MarketState } = await import('@/lib/actions')

      const actions = getAvailableActions(MarketState.AdminVerification, {
        walletAddress: '0xadmin',
        isCreator: false,
        isTrader: false,
        isActiveDec: false,
        isAdmin: true,
        hasVotedOnProposal: false,
        hasVotedOnResolution: false,
        hasParticipated: false,
        hasClaimedWinnings: false,
        resolutionAlreadyRequested: true,
      })

      expect(actions.confirmOutcome.visible).toBe(true)
      expect(actions.confirmOutcome.enabled).toBe(true)
      expect(actions.cancelMarket.visible).toBe(true)
    })
  })

  describe('i18n fallback', () => {
    it('returns en value for known key', async () => {
      const { translate } = await import('@/i18n/index')

      const result = translate('en', 'app.title')
      expect(result).toBe('InterPredict')
    })

    it('falls back to en for missing locale', async () => {
      const { translate } = await import('@/i18n/index')

      // zh currently maps to en, so this tests the fallback chain
      const result = translate('zh', 'app.title')
      expect(result).toBe('InterPredict')
    })

    it('returns key itself when completely missing', async () => {
      const { translate } = await import('@/i18n/index')

      const result = translate('en', 'nonexistent.key' as any)
      expect(result).toBe('nonexistent.key')
    })
  })

  describe('Wallet state management', () => {
    it('starts disconnected', async () => {
      const { getWalletState } = await import('@/services/wallet/wallet')

      const state = getWalletState()
      expect(state.isConnected).toBe(false)
      expect(state.address).toBeNull()
    })

    it('disconnects correctly', async () => {
      const { disconnectWallet, getWalletState } = await import('@/services/wallet/wallet')

      disconnectWallet()
      const state = getWalletState()
      expect(state.isConnected).toBe(false)
      expect(state.address).toBeNull()
    })

    it('subscribes to state changes', async () => {
      const { subscribe, disconnectWallet } = await import('@/services/wallet/wallet')

      let called = false
      const unsubscribe = subscribe(() => {
        called = true
      })

      disconnectWallet()
      expect(called).toBe(true)

      unsubscribe()
    })
  })
})