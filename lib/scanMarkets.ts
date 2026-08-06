import 'server-only'
import { ethers } from 'ethers'
import { getBackendToken } from '@/lib/interlinkAuthBackend'
import contractABI from '@/lib/interpredictAbi.json'
import type { Market } from '@/lib/marketsCache'

// ---------------------------------------------------------------------------
// Server-side market scanner that reads every market from the gated Interlink
// RPC.  This is the *only* place that talks to the live chain for market data.
//
// ⚠️ TIMEOUT WARNING
// Netlify's free-tier serverless functions have a 10-second execution limit.
// Each market requires 5 independent eth_call requests (mb, ms, gL, gP, gPr2).
// With ~20 markets that's ~100 RPC calls.  We parallelise the 5 calls *per
// market* and batch markets in groups of 3 to avoid hammering the gateway.
//
// Estimated timing (conservative):
//   - 20 markets ÷ 3 per batch ≈ 7 batches
//   - Each batch: ~1.5s (5 parallel calls + network latency + retry headroom)
//   - Total: ~10.5s — right at the limit
//
// If you have more than ~20 markets, consider:
//   1. Upgrading to Netlify Background Functions (15 min timeout)
//   2. Triggering /api/markets/refresh via a scheduled job (e.g. GitHub
//      Action, cron-job.org) instead of on-demand from the serverless function
//   3. Reducing MARKET_BATCH_SIZE further (trade speed for reliability)
// ---------------------------------------------------------------------------

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ||
  '0x3E5936F13e1194380A66c3c1d75D4D7342299CfF'

const RPC_URL = 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'

// ---------------------------------------------------------------------------
// Retry configuration
// ---------------------------------------------------------------------------
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 500

// How many markets to scan in parallel.  Each market spawns 5 parallel
// eth_call requests internally, so 3 markets = up to 15 concurrent RPC calls.
const MARKET_BATCH_SIZE = 3

// Per-call timeout (ms).  The RPC gateway should respond well under this;
// if it doesn't we fall back to empty/zero values for that field.
const RPC_CALL_TIMEOUT_MS = 8_000

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const iface = new ethers.Interface(contractABI)

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute a single eth_call with retry.
 *
 * On persistent failure returns `null` rather than throwing so the caller can
 * substitute a safe fallback (empty/zero values) for that one field without
 * losing the entire market.  The caller records the failure in
 * `incompleteFields` so the frontend knows the data may be stale.
 */
async function ethCallWithRetry(
  token: string,
  functionName: string,
  args: readonly unknown[],
  callLabel: string,
): Promise<string | null> {
  const data = iface.encodeFunctionData(functionName, args)

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to: CONTRACT_ADDRESS, data }, 'latest'],
        }),
        signal: AbortSignal.timeout(RPC_CALL_TIMEOUT_MS),
      })

      const json = await response.json()

      if (json.error) {
        const errMsg = json.error.message || JSON.stringify(json.error)
        console.warn(`[scanMarkets] ${callLabel} attempt ${attempt}: ${errMsg}`)
        if (attempt < MAX_RETRY_ATTEMPTS) {
          await sleep(RETRY_DELAY_MS)
          continue
        }
        return null
      }

      if (!json.result || json.result === '0x') {
        console.warn(`[scanMarkets] ${callLabel} returned empty data`)
        if (attempt < MAX_RETRY_ATTEMPTS) {
          await sleep(RETRY_DELAY_MS)
          continue
        }
        return null
      }

      return json.result as string
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[scanMarkets] ${callLabel} attempt ${attempt}: ${message}`)
      if (attempt < MAX_RETRY_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS)
        continue
      }
      return null
    }
  }

  return null
}

/**
 * Decode an eth_call result, returning a safe fallback on failure.
 */
function decodeResult(functionName: string, raw: string | null): ethers.Result {
  if (!raw) {
    return new ethers.Result([])
  }
  try {
    return iface.decodeFunctionResult(functionName, raw)
  } catch (error) {
    console.warn(`[scanMarkets] Failed to decode ${functionName}:`, error)
    return new ethers.Result([])
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan every market from the Interlink chain and return a fully assembled
 * Market[] array suitable for caching.
 *
 * This is the expensive operation — call it sparingly (only from the refresh
 * endpoint or a background function, never from the public GET handler).
 *
 * Returns both the markets array and the latest block number so the cache
 * layer can store it for future incremental/delta refresh support.
 */
export async function scanAllMarketsFromChain(): Promise<{
  markets: Market[]
  lastIndexedBlock: string
}> {
  const token = await getBackendToken()

  // 0. Fetch the latest block number for tracking
  let lastIndexedBlock = '0x0'
  try {
    const blockResponse = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: [],
      }),
      signal: AbortSignal.timeout(RPC_CALL_TIMEOUT_MS),
    })
    const blockJson = await blockResponse.json()
    if (blockJson.result) {
      lastIndexedBlock = blockJson.result as string
    }
  } catch (error) {
    console.warn('[scanMarkets] Failed to fetch latest block number:', error)
  }

  // 1. Get total market count
  const totalRaw = await ethCallWithRetry(token, 'tm', [], 'tm()')
  if (!totalRaw) {
    throw new Error('[scanMarkets] Failed to read total market count (tm) from chain')
  }
  const totalCount = Number(iface.decodeFunctionResult('tm', totalRaw)[0])

  if (totalCount === 0) {
    console.info('[scanMarkets] No markets on chain; returning empty array.')
    return { markets: [], lastIndexedBlock }
  }

  console.info(`[scanMarkets] Scanning ${totalCount} market(s) from chain (block ${lastIndexedBlock})...`)

  const allMarkets: Market[] = []

  // 2. Process markets in small batches to avoid overwhelming the RPC gateway
  for (let batchStart = 0; batchStart < totalCount; batchStart += MARKET_BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + MARKET_BATCH_SIZE, totalCount)
    const batchIds: number[] = []
    for (let id = batchStart; id < batchEnd; id++) {
      batchIds.push(id)
    }

    console.info(`[scanMarkets] Processing batch: markets ${batchStart}-${batchEnd - 1}`)

    // For each market in the batch, fire all 5 independent calls in parallel
    const batchResults = await Promise.all(
      batchIds.map(async (marketId): Promise<Market | null> => {
        try {
          const [mbRaw, msRaw, gLRaw, gPRaw, gPr2Raw] = await Promise.all([
            ethCallWithRetry(token, 'mb', [marketId], `mb(${marketId})`),
            ethCallWithRetry(token, 'ms', [marketId], `ms(${marketId})`),
            ethCallWithRetry(token, 'gL', [marketId], `gL(${marketId})`),
            ethCallWithRetry(token, 'gP', [marketId], `gP(${marketId})`),
            ethCallWithRetry(token, 'gPr2', [marketId], `gPr2(${marketId})`),
          ])

          // Track which fields failed so the frontend can distinguish
          // "genuinely empty" from "RPC was temporarily unavailable".
          const incompleteFields: string[] = []
          if (mbRaw === null) incompleteFields.push('mb')
          if (msRaw === null) incompleteFields.push('ms')
          if (gLRaw === null) incompleteFields.push('gL')
          if (gPRaw === null) incompleteFields.push('gP')
          if (gPr2Raw === null) incompleteFields.push('gPr2')

          const mb = decodeResult('mb', mbRaw)
          const ms = decodeResult('ms', msRaw)
          const gL = decodeResult('gL', gLRaw)
          const gP = decodeResult('gP', gPRaw)
          const gPr2 = decodeResult('gPr2', gPr2Raw)

          // mb returns: (q, d, cat, cc, tu, o, cr, et, rc, pe, be)
          const question = String(mb[0] ?? '')
          const description = String(mb[1] ?? '')
          const category = Number(mb[2] ?? 0)
          const customCategory = String(mb[3] ?? '')
          const thumbnailUri = String(mb[4] ?? '')
          const origin = Number(mb[5] ?? 0)
          const creator = String(mb[6] ?? ethers.ZeroAddress)
          const marketEndTime = Number(mb[7] ?? 0)
          const resolutionCriteria = String(mb[8] ?? '')

          // ms returns: (uint8 state)
          const state = Number(ms[0] ?? 0)

          // gL returns: (string[] labels)
          const outcomeLabels: string[] = Array.isArray(gL[0])
            ? (gL[0] as readonly string[]).map(String)
            : []

          // gP returns: (uint256[] pools)
          const outcomePools: string[] = Array.isArray(gP[0])
            ? (gP[0] as readonly bigint[]).map(v => v.toString())
            : []

          // gPr2 returns: (uint256[] prices) — 1e18-scaled
          const outcomePrices: string[] = Array.isArray(gPr2[0])
            ? (gPr2[0] as readonly bigint[]).map(v => v.toString())
            : []

          const market: Market = {
            id: marketId,
            question,
            description,
            category,
            customCategory,
            thumbnailUri,
            origin,
            creator,
            marketEndTime,
            resolutionCriteria,
            state,
            outcomeLabels,
            outcomePools,
            outcomePrices,
          }

          // Only attach incompleteFields if something actually failed
          if (incompleteFields.length > 0) {
            market.incompleteFields = incompleteFields
            console.warn(
              `[scanMarkets] Market ${marketId} has incomplete fields: ${incompleteFields.join(', ')}`,
            )
          }

          return market
        } catch (error) {
          console.error(`[scanMarkets] Failed to scan market ${marketId}:`, error)
          return null // skip this market rather than failing the whole batch
        }
      }),
    )

    // Filter out any markets that failed entirely
    for (const market of batchResults) {
      if (market) {
        allMarkets.push(market)
      }
    }
  }

  console.info(`[scanMarkets] Scan complete: ${allMarkets.length}/${totalCount} markets loaded`)
  return { markets: allMarkets, lastIndexedBlock }
}