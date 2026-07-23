import assert from 'node:assert/strict'
import test from 'node:test'
import { deterministicCursor, selectKeeperAction, type KeeperMarket } from './keeperPolicy'

const base: KeeperMarket = {
  state: 0,
  proposalVotingDeadline: 0,
  tradingEndTime: 0,
  resolutionVotingDeadline: 0,
  adminVerificationDeadline: 0,
}

test('selects every deterministic terminal transition at its block deadline', () => {
  const context = { blockTimestamp: 100, protocolPaused: false, marketPaused: false }
  assert.equal(selectKeeperAction({ ...base, state: 1, proposalVotingDeadline: 100 }, context), 'finalizeProposalVoting')
  assert.equal(selectKeeperAction({ ...base, state: 5, tradingEndTime: 100 }, context), 'syncTradingClosed')
  assert.equal(
    selectKeeperAction({ ...base, state: 9, resolutionVotingDeadline: 100 }, context),
    'finalizeResolutionVoting',
  )
  assert.equal(
    selectKeeperAction({ ...base, state: 10, adminVerificationDeadline: 100 }, context),
    'executeAdminVerificationTimeout',
  )
  assert.equal(selectKeeperAction({ ...base, state: 11 }, context), 'finalizeMarket')
})

test('never acts before a deadline or on unrelated lifecycle states', () => {
  const context = { blockTimestamp: 99, protocolPaused: false, marketPaused: false }
  for (const market of [
    { ...base, state: 1, proposalVotingDeadline: 100 },
    { ...base, state: 5, tradingEndTime: 100 },
    { ...base, state: 9, resolutionVotingDeadline: 100 },
    { ...base, state: 10, adminVerificationDeadline: 100 },
    { ...base, state: 13 },
  ]) {
    assert.equal(selectKeeperAction(market, context), undefined)
  }
})

test('continues non-trading lifecycle recovery while globally and locally paused', () => {
  const context = { blockTimestamp: 100, protocolPaused: true, marketPaused: true }
  assert.equal(
    selectKeeperAction({ ...base, state: 9, resolutionVotingDeadline: 100 }, context),
    'finalizeResolutionVoting',
  )
  assert.equal(
    selectKeeperAction({ ...base, state: 10, adminVerificationDeadline: 100 }, context),
    'executeAdminVerificationTimeout',
  )
})

test('cycles a bounded cursor deterministically across all pages', () => {
  assert.equal(deterministicCursor(0, 25, 0), 0)
  assert.equal(deterministicCursor(100, 25, 0), 0)
  assert.equal(deterministicCursor(100, 25, 300), 25)
  assert.equal(deterministicCursor(100, 25, 600), 50)
  assert.equal(deterministicCursor(100, 25, 900), 75)
  assert.equal(deterministicCursor(100, 25, 1200), 0)
})
