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
// Each market requires 5 sequential eth_call requests (mb, ms, gL, gP, gPr2)
// with 200ms gaps between them to avoid rate-limiting the gated RPC gateway.
//
// Estimated timing:
//   - 1 market: ~1.5s (5 calls × ~200ms + 200ms gaps + network latency)
//   - 34 markets: ~51s — EXCEEDS the 10s limit
//
// This means the on-demand refresh via the serverless function WILL timeout
// for more than ~6 markets.  The solution is the Netlify Scheduled Function
// (netlify/functions/markets-refresh-cron.mjs) which has a 30s limit on the
// free tier.  For 34 markets you'll need either:
//   1. Netlify Pro (longer timeouts for scheduled functions)
//   2. An external cron service (GitHub Actions, cron-job.org) calling the
//      refresh endpoint — these have no timeout
//   3. Reduce scope: only scan markets that changed since lastIndexedBlock
//      (incremental refresh — not yet implemented)
// ---------------------------------------------------------------------------

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ||
  '0x3E5936F13e1194380A66c3c1d75D4D7342299CfF'

const RPC_URL = 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'

// ---------------------------------------------------------------------------
// Retry configuration
// ---------------------------------------------------------------------------
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000

// Gap between each of the 5 calls for a single market (ms).
// 200ms is enough to avoid rate-limiting on the gated RPC.
const CALL_GAP_MS = 200

// Per-call timeout (ms).
const RPC_CALL_TIMEOUT_MS = 10_000

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

  // 2. Process markets ONE AT A TIME with gaps between each call.
  //    This is slow but avoids rate-limiting the gated RPC gateway.
  for (let marketId = 0; marketId < totalCount; marketId++) {
    console.info(`[scanMarkets] Scanning market ${marketId}/${totalCount}...`)

    try {
      // Call each function sequentially with a gap between them
      const mbRaw = await ethCallWithRetry(token, 'mb', [marketId], `mb(${marketId})`)
      await sleep(CALL_GAP_MS)

      const msRaw = await ethCallWithRetry(token, 'ms', [marketId], `ms(${marketId})`)
      await sleep(CALL_GAP_MS)

      const gLRaw = await ethCallWithRetry(token, 'gL', [marketId], `gL(${marketId})`)
      await sleep(CALL_GAP_MS)

      const gPRaw = await ethCallWithRetry(token, 'gP', [marketId], `gP(${marketId})`)
      await sleep(CALL_GAP_MS)

      const gPr2Raw = await ethCallWithRetry(token, 'gPr2', [marketId], `gPr2(${marketId})`)

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

      allMarkets.push(market)
    } catch (error) {
      console.error(`[scanMarkets] Failed to scan market ${marketId}:`, error)
      // Skip this market rather than failing the whole scan
    }
  }

  console.info(`[scanMarkets] Scan complete: ${allMarkets.length}/${totalCount} markets loaded`)
  return { markets: allMarkets, lastIndexedBlock }
}