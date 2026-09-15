// Seed the markets cache by calling the refresh endpoint for each market.
// Run with: node seed_markets.mjs
//
// This bypasses GitHub Actions (which has a billing issue) and directly
// populates the Netlify Blobs cache with complete market data.

const BASE_URL = 'https://interpredict.netlify.app'
const CRON_SECRET = process.env.CRON_SECRET
if (!CRON_SECRET) {
  console.error('CRON_SECRET environment variable is required')
  process.exit(1)
}
const BATCH_SIZE = 1 // 1 market per call (13 contract calls, safe under 10s)

async function main() {
  console.log('=== Seeding Markets Cache ===\n')

  // Step 1: Get total market count
  console.log('Fetching total market count...')
  const countRes = await fetch(`${BASE_URL}/api/markets/refresh?startId=0&count=1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CRON_SECRET}`,
    },
  })
  const countData = await countRes.json()
  const totalCount = countData.totalCount || 0
  console.log(`Total markets on-chain: ${totalCount}\n`)

  if (totalCount === 0) {
    console.log('No markets found on-chain. Nothing to seed.')
    return
  }

  // Step 2: Scan each market one at a time
  let successCount = 0
  let failCount = 0

  for (let startId = 0; startId < totalCount; startId += BATCH_SIZE) {
    const batchNum = Math.floor(startId / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(totalCount / BATCH_SIZE)
    process.stdout.write(`\rBatch ${batchNum}/${totalBatches}: market ${startId}... `)

    try {
      const res = await fetch(
        `${BASE_URL}/api/markets/refresh?startId=${startId}&count=${BATCH_SIZE}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${CRON_SECRET}`,
          },
        }
      )
      const data = await res.json()

      if (data.ok) {
        successCount++
      } else {
        failCount++
        console.log(`\n  FAILED: ${data.error || 'unknown error'}`)
      }
    } catch (err) {
      failCount++
      console.log(`\n  ERROR: ${err.message}`)
    }

    // Small delay between calls to avoid rate limiting
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n\n=== Done ===`)
  console.log(`Successful batches: ${successCount}`)
  console.log(`Failed batches: ${failCount}`)
  console.log(`Total markets in cache: ${successCount * BATCH_SIZE}`)

  // Step 3: Verify
  console.log('\nVerifying cache...')
  const verifyRes = await fetch(`${BASE_URL}/api/markets`)
  const verifyData = await verifyRes.json()
  const markets = verifyData.allMarkets || []
  console.log(`Markets in cache: ${markets.length}`)

  // Check governance fields
  const withDeadline = markets.filter(m => m.proposalVotingDeadline > 0)
  const withVotes = markets.filter(m => m.approvalVotes > 0 || m.rejectionVotes > 0)
  console.log(`Markets with proposal deadline: ${withDeadline.length}`)
  console.log(`Markets with vote counts: ${withVotes.length}`)

  if (markets.length > 0) {
    const sample = markets[0]
    console.log('\nSample market:')
    console.log(`  ID: ${sample.id}`)
    console.log(`  State: ${sample.state}`)
    console.log(`  Question: ${sample.question?.substring(0, 60)}...`)
    console.log(`  Proposal deadline: ${sample.proposalVotingDeadline}`)
    console.log(`  Approval votes: ${sample.approvalVotes}`)
    console.log(`  Rejection votes: ${sample.rejectionVotes}`)
    console.log(`  Finalized: ${sample.finalized}`)
    console.log(`  Total volume: ${sample.totalVolume}`)
  }
}

main().catch(console.error)