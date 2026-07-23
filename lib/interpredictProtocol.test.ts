import assert from 'node:assert/strict'
import test from 'node:test'
import { ethers } from 'ethers'
import {
  decodeMarket,
  decodeMarketOutcomes,
  decodeMarketPricing,
  MARKET_PARAM_TYPE,
} from './interpredictProtocol'

const coder = ethers.AbiCoder.defaultAbiCoder()

test('decodeMarket preserves the canonical Market field order', () => {
  const values = [
    901n,
    '0x1111111111111111111111111111111111111111',
    1,
    17,
    10,
    'Will the protocol remain solvent?',
    'A deliberately distinct description.',
    'Protocol',
    'ipfs://thumbnail',
    'Resolve from the published reserve proof.',
    'ar://primary',
    'https://example.com/backup',
    1_001n,
    1_002n,
    1_003n,
    1_004n,
    1_005n,
    1_006n,
    1_007n,
    1_008n,
    1_009n,
    1_010n,
    101,
    102,
    103,
    104,
    2,
    3,
    1,
    4,
    2,
    true,
    false,
    true,
    false,
    true,
    false,
    2_001n,
    2_002n,
    2_003n,
    2_004n,
    2_005n,
    2_006n,
    2_007n,
    2_008n,
    2_009n,
    'admin reason',
    'ipfs://admin-evidence',
    'cancellation reason',
    'ar://cancellation-evidence',
    3_001n,
    3_002n,
    303,
    '0x2222222222222222222222222222222222222222',
  ]

  const decoded = decodeMarket(coder.encode([MARKET_PARAM_TYPE], [values]))

  assert.deepEqual(
    {
      id: decoded.id,
      creator: decoded.creator,
      origin: decoded.origin,
      category: decoded.category,
      state: decoded.state,
      question: decoded.question,
      tradingEndTime: decoded.tradingEndTime,
      resolutionVotingDeadline: decoded.resolutionVotingDeadline,
      resolutionFinalizedAt: decoded.resolutionFinalizedAt,
      approvalVotes: decoded.approvalVotes,
      resolutionVoterCount: decoded.resolutionVoterCount,
      leadingOutcome: decoded.leadingOutcome,
      resolutionFailure: decoded.resolutionFailure,
      activeMarketCancelled: decoded.activeMarketCancelled,
      originalSeed: decoded.originalSeed,
      winningSharesRemaining: decoded.winningSharesRemaining,
      adminVerificationReason: decoded.adminVerificationReason,
      cancellationEvidenceURI: decoded.cancellationEvidenceURI,
      resolutionMembershipEpoch: decoded.resolutionMembershipEpoch,
      adminVerificationDeadline: decoded.adminVerificationDeadline,
      resolutionQuorum: decoded.resolutionQuorum,
    },
    {
      id: 901,
      creator: '0x1111111111111111111111111111111111111111',
      origin: 1,
      category: 17,
      state: 10,
      question: 'Will the protocol remain solvent?',
      tradingEndTime: 1_001,
      resolutionVotingDeadline: 1_007,
      resolutionFinalizedAt: 1_008,
      approvalVotes: 101,
      resolutionVoterCount: 104,
      leadingOutcome: 2,
      resolutionFailure: 2,
      activeMarketCancelled: false,
      originalSeed: '2001',
      winningSharesRemaining: '2009',
      adminVerificationReason: 'admin reason',
      cancellationEvidenceURI: 'ar://cancellation-evidence',
      resolutionMembershipEpoch: 3_001,
      adminVerificationDeadline: 3_002,
      resolutionQuorum: 303,
      resolutionRequester: '0x2222222222222222222222222222222222222222',
    },
  )
})

test('decodeMarketOutcomes accepts canonical encoded bytes and named results', () => {
  const outcomes = ['Yes', 'No', 'Invalid']
  const encoded = coder.encode(['string[]'], [outcomes])

  assert.deepEqual(decodeMarketOutcomes(encoded), outcomes)
  assert.deepEqual(decodeMarketOutcomes(outcomes), outcomes)
  assert.deepEqual(decodeMarketOutcomes({ outcomes }), outcomes)
})

test('decodeMarketPricing round-trips canonical encoded bytes and named results', () => {
  const balances = [11n, 22n, 33n]
  const shares = [44n, 55n, 66n]
  const prices = [77n, 88n, 99n]
  const expected = {
    balances: ['11', '22', '33'],
    shares: ['44', '55', '66'],
    prices: ['77', '88', '99'],
  }
  const encoded = coder.encode(
    ['uint256[]', 'uint256[]', 'uint256[]'],
    [balances, shares, prices],
  )

  assert.deepEqual(decodeMarketPricing(encoded), expected)
  assert.deepEqual(
    decodeMarketPricing({ balances, shares, prices }),
    expected,
  )
})
