import 'server-only'
import { ethers } from 'ethers'
import { getBackendToken } from '@/lib/interlinkAuthBackend'
import contractABI from '@/lib/interpredictAbi.json'
import type { Market } from '@/lib/marketsCache'

// ---------------------------------------------------------------------------
// Server-side market scanner using batched JSON-RPC calls.
//
// 8 contract calls per market (mb, ms, gL, gP, gPr2, mv, mf, mr).
// Each batch = 1 market, well under Netlify's 10s serverless limit.
//
// For full refreshes, use the GitHub Actions workflow or `node seed_markets.mjs`
// which call /api/markets/refresh?startId=X&count=1 repeatedly.
// ---------------------------------------------------------------------------

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ||
  '0x3E5936F13e1194380A66c3c1d75D4D7342299CfF'

const RPC_URL = 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'

const BATCH_SIZE = 1        // markets per batch
const MAX_RETRY_ATTEMPTS = 2
const RETRY_DELAY_MS = 500
const RPC_CALL_TIMEOUT_MS = 8_000

const iface = new ethers.Interface(contractABI)

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Batched RPC call
// ---------------------------------------------------------------------------

interface BatchItem {
  marketId: number
  functionName: string
  callLabel: string
}

async function batchedEthCalls(
  token: string,
  items: BatchItem[],
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>()

  const requests = items.map((item, index) => ({
    jsonrpc: '2.0' as const,
    id: index + 1,
    method: 'eth_call' as const,
    params: [{
      to: CONTRACT_ADDRESS,
      data: iface.encodeFunctionData(item.functionName, [item.marketId]),
    }, 'latest'],
  }))

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requests),
        signal: AbortSignal.timeout(RPC_CALL_TIMEOUT_MS),
      })

      const json = await response.json()

      if (!Array.isArray(json)) {
        console.warn(`[scanMarkets] Batch attempt ${attempt}: non-array response`)
        if (attempt < MAX_RETRY_ATTEMPTS) { await sleep(RETRY_DELAY_MS); continue }
        for (const item of items) results.set(item.callLabel, null)
        return results
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const result = json[i]

        if (!result || result.error) {
          const errMsg = result?.error?.message || 'missing response'
          console.warn(`[scanMarkets] ${item.callLabel} attempt ${attempt}: ${errMsg}`)
          continue
        }

        if (!result.result || result.result === '0x') {
          console.warn(`[scanMarkets] ${item.callLabel} returned empty data`)
          continue
        }

        results.set(item.callLabel, result.result as string)
      }

      const missing = items.filter(item => !results.has(item.callLabel))
      if (missing.length === 0) return results

      if (attempt < MAX_RETRY_ATTEMPTS) {
        console.warn(`[scanMarkets] ${missing.length} calls failed in batch attempt ${attempt}; retrying...`)
        requests.length = 0
        for (const item of missing) {
          requests.push({
            jsonrpc: '2.0',
            id: requests.length + 1,
            method: 'eth_call',
            params: [{
              to: CONTRACT_ADDRESS,
              data: iface.encodeFunctionData(item.functionName, [item.marketId]),
            }, 'latest'],
          })
        }
        await sleep(RETRY_DELAY_MS)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[scanMarkets] Batch attempt ${attempt} failed: ${message}`)
      if (attempt < MAX_RETRY_ATTEMPTS) { await sleep(RETRY_DELAY_MS); continue }
      for (const item of items) {
        if (!results.has(item.callLabel)) results.set(item.callLabel, null)
      }
      return results
    }
  }

  for (const item of items) {
    if (!results.has(item.callLabel)) results.set(item.callLabel, null)
  }

  return results
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function scanAllMarketsFromChain(
  startId = 0,
  count = 2,
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
  const totalRaw = await (async () => {
    const data = iface.encodeFunctionData('tm', [])
    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: CONTRACT_ADDRESS, data }, 'latest'] }),
          signal: AbortSignal.timeout(RPC_CALL_TIMEOUT_MS),
        })
        const json = await res.json()
        if (json.result && json.result !== '0x') return json.result
        if (attempt < MAX_RETRY_ATTEMPTS) await sleep(RETRY_DELAY_MS)
      } catch { if (attempt < MAX_RETRY_ATTEMPTS) await sleep(RETRY_DELAY_MS) }
    }
    return null
  })()

  if (!totalRaw) throw new Error('[scanMarkets] Failed to read total market count')
  const totalCount = Number(iface.decodeFunctionResult('tm', totalRaw)[0])

  if (totalCount === 0) {
    return { markets: [], lastIndexedBlock, totalCount: 0 }
  }

  const endId = Math.min(startId + count, totalCount)
  console.info(`[scanMarkets] Scanning markets ${startId}-${endId - 1} of ${totalCount}...`)

  // 8 contract calls per market
  const functions = [
    'mb',    // market base info
    'ms',    // market state
    'gL',    // outcome labels
    'gP',    // outcome pools
    'gPr2',  // outcome prices (1e18 scaled)
    'mv',    // market voting: pvs, pvd, apv, rjv, pf, pd, pft, ra, rr, rc
    'mf',    // market finance: tv, pc, cfe, cfc, csc, can, cr, ct
    'mr',    // market resolution: snap, quorum, trv, co, oc, fin
  ] as const

  const batchItems: BatchItem[] = []
  for (let marketId = startId; marketId < endId; marketId++) {
    for (const fn of functions) {
      batchItems.push({ marketId, functionName: fn, callLabel: `${fn}(${marketId})` })
    }
  }

  const rawResults = await batchedEthCalls(token, batchItems)

  // Assemble markets
  const markets: Market[] = []
  for (let marketId = startId; marketId < endId; marketId++) {
    try {
      const mbRaw = rawResults.get(`mb(${marketId})`) ?? null
      const msRaw = rawResults.get(`ms(${marketId})`) ?? null
      const gLRaw = rawResults.get(`gL(${marketId})`) ?? null
      const gPRaw = rawResults.get(`gP(${marketId})`) ?? null
      const gPr2Raw = rawResults.get(`gPr2(${marketId})`) ?? null
      const mvRaw = rawResults.get(`mv(${marketId})`) ?? null
      const mfRaw = rawResults.get(`mf(${marketId})`) ?? null
      const mrRaw = rawResults.get(`mr(${marketId})`) ?? null

      const incompleteFields: string[] = []
      if (mbRaw === null) incompleteFields.push('mb')
      if (msRaw === null) incompleteFields.push('ms')
      if (gLRaw === null) incompleteFields.push('gL')
      if (gPRaw === null) incompleteFields.push('gP')
      if (gPr2Raw === null) incompleteFields.push('gPr2')
      if (mvRaw === null) incompleteFields.push('mv')
      if (mfRaw === null) incompleteFields.push('mf')
      if (mrRaw === null) incompleteFields.push('mr')

      const decode = (fn: string, raw: string | null) => {
        if (!raw) return []
        try { return iface.decodeFunctionResult(fn, raw) } catch { return [] }
      }

      const mb = decode('mb', mbRaw)
      const ms = decode('ms', msRaw)
      const gL = decode('gL', gLRaw)
      const gP = decode('gP', gPRaw)
      const gPr2 = decode('gPr2', gPr2Raw)
      const mv = decode('mv', mvRaw)
      const mf = decode('mf', mfRaw)
      const mr = decode('mr', mrRaw)

      // mv returns: [pvs, pvd, apv, rjv, pf, pd, pft, ra, rr, rc]
      // mf returns: [tv, pc, cfe, cfc, csc, can, cr, ct]
      // mr returns: [snap, quorum, trv, co, oc, fin]

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

        // Governance / voting fields (from mv)
        proposalVotingDeadline: Number(mv[1] ?? 0),   // pvd
        approvalVotes: Number(mv[2] ?? 0),             // apv
        rejectionVotes: Number(mv[3] ?? 0),            // rjv
        proposalFinalized: Boolean(mv[4] ?? false),    // pf
        proposalDecision: Number(mv[5] ?? 0),          // pd

        // Resolution fields (from mr)
        resolutionVotingDeadline: 0,                    // not in mr; mr[0]=snap
        activeDECSnapshot: Number(mr[0] ?? 0),          // snap
        resolutionQuorum: Number(mr[1] ?? 0),           // quorum
        totalResolutionVotes: Number(mr[2] ?? 0),       // trv
        decSelectedOutcome: 0,                           // not in mr
        confirmedOutcome: Number(mr[3] ?? 0),           // co
        outcomeConfirmed: Boolean(mr[4] ?? false),      // oc
        finalized: Boolean(mr[5] ?? false),             // fin

        // Market metadata (from mf)
        totalVolume: mf[0] ? (mf[0] as bigint).toString() : '0',  // tv
        participantCount: Number(mf[1] ?? 0),                      // pc
        creatorFeesEarned: mf[2] ? (mf[2] as bigint).toString() : '0',  // cfe
        creatorFeesClaimed: mf[3] ? (mf[3] as bigint).toString() : '0',  // cfc
        creatorSeedClaimed: mf[4] ? (mf[4] as bigint).toString() : '0',  // csc
        cancelled: Boolean(mf[5] ?? false),                         // can
        cancelReason: String(mf[7] ?? ''),                          // ct
      }

      if (incompleteFields.length > 0) {
        market.incompleteFields = incompleteFields
        console.warn(`[scanMarkets] Market ${marketId} incomplete: ${incompleteFields.join(', ')}`)
      }

      markets.push(market)
    } catch (error) {
      console.error(`[scanMarkets] Failed to assemble market ${marketId}:`, error)
    }
  }

  console.info(`[scanMarkets] Batch complete: ${markets.length} markets`)
  return { markets, lastIndexedBlock, totalCount }
}