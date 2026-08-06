import 'server-only'
import { ethers } from 'ethers'
import { getBackendToken } from '@/lib/interlinkAuthBackend'
import contractABI from '@/lib/interpredictAbi.json'
import type { Market } from '@/lib/marketsCache'

// ---------------------------------------------------------------------------
// Server-side market scanner that reads markets from the gated Interlink RPC.
//
// Supports incremental scanning: pass `startId` and `count` to scan a subset
// of markets.  This keeps each call under Netlify's 10s serverless limit.
//
// Timing (sequential, 200ms gaps):
//   - 1 market: ~1.5s
//   - 5 markets: ~7.5s (safe under 10s limit)
//   - 34 markets total: 7 calls of 5 markets each
//
// The GitHub Actions workflow calls /api/markets/refresh repeatedly with
// different startId values to cover all markets.
// ---------------------------------------------------------------------------

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ||
  '0x3E5936F13e1194380A66c3c1d75D4D7342299CfF'

const RPC_URL = 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'

const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000
const CALL_GAP_MS = 200
const RPC_CALL_TIMEOUT_MS = 10_000

const iface = new ethers.Interface(contractABI)

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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
        if (attempt < MAX_RETRY_ATTEMPTS) { await sleep(RETRY_DELAY_MS); continue }
        return null
      }

      if (!json.result || json.result === '0x') {
        console.warn(`[scanMarkets] ${callLabel} returned empty data`)
        if (attempt < MAX_RETRY_ATTEMPTS) { await sleep(RETRY_DELAY_MS); continue }
        return null
      }

      return json.result as string
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[scanMarkets] ${callLabel} attempt ${attempt}: ${message}`)
      if (attempt < MAX_RETRY_ATTEMPTS) { await sleep(RETRY_DELAY_MS); continue }
      return null
    }
  }

  return null
}

function decodeResult(functionName: string, raw: string | null): ethers.Result {
  if (!raw) return new ethers.Result([])
  try { return iface.decodeFunctionResult(functionName, raw) } catch { return new ethers.Result([]) }
}

async function scanSingleMarket(token: string, marketId: number): Promise<Market | null> {
  try {
    const mbRaw = await ethCallWithRetry(token, 'mb', [marketId], `mb(${marketId})`)
    await sleep(CALL_GAP_MS)

    const msRaw = await ethCallWithRetry(token, 'ms', [marketId], `ms(${marketId})`)
    await sleep(CALL_GAP_MS)

    const gLRaw = await ethCallWithRetry(token, 'gL', [marketId], `gL(${marketId})`)
    await sleep(CALL_GAP_MS)

    const gPRaw = await ethCallWithRetry(token, 'gP', [marketId], `gP(${marketId})`)
    await sleep(CALL_GAP_MS)

    const gPr2Raw = await ethCallWithRetry(token, 'gPr2', [marketId], `gPr2(${marketId})`)

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

    const market: Market = {
      id: marketId,
      question: String(mb[0] ?? ''),
      description: String(mb[1] ?? ''),
      category: Number(mb[2] ?? 0),
      customCategory: String(mb[3] ?? ''),
      thumbnailUri: String(mb[4] ?? ''),
      origin: Number(mb[5] ?? 0),
      creator: String(mb[6] ?? ethers.ZeroAddress),
      marketEndTime: Number(mb[7] ?? 0),
      resolutionCriteria: String(mb[8] ?? ''),
      state: Number(ms[0] ?? 0),
      outcomeLabels: Array.isArray(gL[0]) ? (gL[0] as readonly string[]).map(String) : [],
      outcomePools: Array.isArray(gP[0]) ? (gP[0] as readonly bigint[]).map(v => v.toString()) : [],
      outcomePrices: Array.isArray(gPr2[0]) ? (gPr2[0] as readonly bigint[]).map(v => v.toString()) : [],
    }

    if (incompleteFields.length > 0) {
      market.incompleteFields = incompleteFields
      console.warn(`[scanMarkets] Market ${marketId} incomplete: ${incompleteFields.join(', ')}`)
    }

    return market
  } catch (error) {
    console.error(`[scanMarkets] Failed to scan market ${marketId}:`, error)
    return null
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan a range of markets from the chain.
 *
 * @param startId - First market ID to scan (0-based)
 * @param count - How many markets to scan (default 5, safe under 10s limit)
 */
export async function scanAllMarketsFromChain(
  startId = 0,
  count = 5,
): Promise<{
  markets: Market[]
  lastIndexedBlock: string
  totalCount: number
}> {
  const token = await getBackendToken()

  // Fetch latest block
  let lastIndexedBlock = '0x0'
  try {
    const blockResponse = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
      signal: AbortSignal.timeout(RPC_CALL_TIMEOUT_MS),
    })
    const blockJson = await blockResponse.json()
    if (blockJson.result) lastIndexedBlock = blockJson.result as string
  } catch (error) {
    console.warn('[scanMarkets] Failed to fetch block number:', error)
  }

  // Get total count
  const totalRaw = await ethCallWithRetry(token, 'tm', [], 'tm()')
  if (!totalRaw) throw new Error('[scanMarkets] Failed to read total market count')
  const totalCount = Number(iface.decodeFunctionResult('tm', totalRaw)[0])

  if (totalCount === 0) {
    return { markets: [], lastIndexedBlock, totalCount: 0 }
  }

  const endId = Math.min(startId + count, totalCount)
  console.info(`[scanMarkets] Scanning markets ${startId}-${endId - 1} of ${totalCount} (block ${lastIndexedBlock})...`)

  const markets: Market[] = []
  for (let marketId = startId; marketId < endId; marketId++) {
    const market = await scanSingleMarket(token, marketId)
    if (market) markets.push(market)
  }

  console.info(`[scanMarkets] Batch complete: ${markets.length} markets loaded`)
  return { markets, lastIndexedBlock, totalCount }
}