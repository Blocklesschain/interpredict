// Quick verification script — run with: node verify_markets.mjs
const API = 'https://interpredict.netlify.app/api/markets'

const res = await fetch(API)
const json = await res.json()
const markets = json.allMarkets

console.log('=== Market Verification ===\n')
console.log('HTTP Status:', res.status)
console.log('Total markets in cache:', markets.length)
console.log('Response size:', JSON.stringify(json).length, 'bytes\n')

const now = Math.floor(Date.now() / 1000)
const active = markets.filter(m => m.state === 5 && m.marketEndTime > now)
const inactive = markets.filter(m => m.state !== 5 || m.marketEndTime <= now)

console.log('Active markets (state=5, not expired):', active.length)
console.log('Inactive / Closed / Resolved:', inactive.length)
console.log()

// State breakdown
const stateNames = {
  0: 'Proposed', 1: 'DEC Voting', 2: 'Rejected', 3: 'Cancelled',
  4: 'Approved', 5: 'Active', 6: 'Closed', 7: 'Unresolved',
  8: 'ResReq', 9: 'DEC Res Voting', 10: 'Admin Ver',
  11: 'Confirmed', 12: 'Finalized', 13: 'Resolved'
}

const byState = {}
for (const m of markets) {
  const name = stateNames[m.state] || `State ${m.state}`
  byState[name] = (byState[name] || 0) + 1
}

console.log('State breakdown:')
for (const [name, count] of Object.entries(byState).sort()) {
  console.log(`  ${name}: ${count} markets`)
}

// Incomplete fields check
const incomplete = markets.filter(m => m.incompleteFields && m.incompleteFields.length > 0)
console.log(`\nMarkets with incomplete fields (RPC failures): ${incomplete.length}`)
for (const m of incomplete) {
  console.log(`  Market #${m.id}: ${m.incompleteFields.join(', ')}`)
}

// Sample
if (markets.length > 0) {
  const m = markets[0]
  console.log('\nSample market (first):')
  console.log('  ID:', m.id)
  console.log('  Question:', m.question?.substring(0, 80) + '...')
  console.log('  State:', m.state, `(${stateNames[m.state] || 'Unknown'})`)
  console.log('  Outcomes:', m.outcomeLabels?.length || 0)
  console.log('  Has pools:', (m.outcomePools?.length || 0) > 0)
  console.log('  Has prices:', (m.outcomePrices?.length || 0) > 0)
  console.log('  Creator:', m.creator)
  console.log('  End time:', new Date(m.marketEndTime * 1000).toISOString())
}

console.log('\n✅ Verification complete.')