import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getValidServiceToken } from '@/lib/interlinkServiceAuth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Testnet-safe mode: pace one market batch at a time and stop before Netlify's 30s limit.

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ||
  '0x3E5936F13e1194380A66c3c1d75D4D7342299CfF'

const RPC_URL = 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'

const MAX_RPC_ATTEMPTS = 2
const INITIAL_RETRY_DELAY_MS = 900
const RPC_BATCH_SIZE = 8
const RPC_BATCH_RETRY_ROUNDS = 2
const RPC_BATCH_GAP_MS = 900
const DEFAULT_PAGE_SIZE = 2
const MAX_PAGE_SIZE = 3
const PUBLIC_CACHE_TTL_MS = 30_000
const WALLET_CACHE_TTL_MS = 20_000
const MAX_ROUTE_TIME_MS = 20_000
const ENABLE_WALLET_ENRICHMENT =
  process.env.INTERPREDICT_ENABLE_WALLET_ENRICHMENT === 'true'
const ENABLE_EVENT_HISTORY =
  process.env.INTERPREDICT_ENABLE_EVENT_HISTORY === 'true'
const ENABLE_RESOLUTION_EVENT_SCAN =
  process.env.INTERPREDICT_ENABLE_RESOLUTION_EVENT_SCAN === 'true'

const iface = new ethers.Interface([
  'function tm() view returns (uint256)',
  'function mb(uint256) view returns (string q, string d, uint8 cat, string cc, string tu, uint8 o, address cr, uint256 et, string rc, string pe, string be)',
  'function mv(uint256) view returns (uint256 pvs, uint256 pvd, uint256 apv, uint256 rjv, bool pf, uint8 pd, uint256 pft, uint256 ra, address rr, bool rc)',
  'function mr(uint256) view returns (uint256 snap, uint256 quorum, uint256 trv, uint8 co, bool oc, bool fin)',
  'function mf(uint256) view returns (uint256 tv, uint256 pc, uint256 cfe, uint256 cfc, uint256 csc, bool can, string cr, uint256 ct)',
  'function ms(uint256) view returns (uint8)',
  'function gL(uint256) view returns (string[])',
  'function gP(uint256) view returns (uint256[])',
  'function gPr2(uint256) view returns (uint256[])',
  'function pv(uint256,address) view returns (uint8)',
  'function rv(uint256,address) view returns (uint8)',
  'function hvp(uint256,address) view returns (bool)',
  'function hcw(uint256,address) view returns (bool)',
  'function sh(uint256,uint8,address) view returns (uint256)',
  'event RR(uint256 id, address r, uint256 dl)',
  'event SP(uint256 id, address b, uint8 oi, uint256 g, uint256 n, uint256 s, uint256 f)',
  'event WC(uint256 id, address c, uint256 a)'
])

enum MarketState {
  Proposed = 0,
  DECVoting = 1,
  Rejected = 2,
  Cancelled = 3,
  Approved = 4,
  Active = 5,
  Closed = 6,
  Unresolved = 7,
  ResolutionRequested = 8,
  DECResolutionVoting = 9,
  AdminVerification = 10,
  Confirmed = 11,
  Finalized = 12,
  Resolved = 13
}

const STATE_NAMES: Record<number, string> = {
  0: 'Proposed',
  1: 'DEC Voting',
  2: 'Rejected',
  3: 'Cancelled',
  4: 'Approved',
  5: 'Active',
  6: 'Closed',
  7: 'Unresolved',
  8: 'Resolution Requested',
  9: 'DEC Resolution Voting',
  10: 'Admin Verification',
  11: 'Outcome Confirmed',
  12: 'Finalized',
  13: 'Resolved'
}

const CATEGORY_NAMES = [
  'Sports', 'Politics', 'Crypto', 'Blockchain', 'Technology', 'AI',
  'Economics', 'Finance', 'Business', 'Science', 'Climate',
  'Entertainment', 'Culture', 'Health', 'Real Estate', 'Gaming',
  'Web3', 'Other'
]

const ORIGIN_NAMES = ['Community', 'Team']
const PROPOSAL_DECISION_NAMES = ['None', 'Approve', 'Reject']

interface RpcError {
  code?: number
  message?: string
  data?: unknown
}

interface RpcResponse {
  jsonrpc?: string
  id?: number | string
  result?: string
  error?: RpcError
}

interface RpcLog {
  topics: string[]
  data: string
  blockNumber?: string
  transactionHash?: string
  logIndex?: string
}

interface BatchCall {
  key: string
  functionName: string
  args: readonly unknown[]
  callName: string
}

interface SkippedMarket {
  marketId: number
  error: string
}

interface LoadedMarket {
  id: number
  marketId: number
  state: number
  outcomeLabels: string[]
  outcomePools: string[]
  confirmedOutcome: number
  finalized: boolean
  hasCurrentWalletVoted?: boolean
  currentWalletProposalVote?: number
  hasCurrentWalletVotedOnResolution?: boolean
  currentWalletResolutionVote?: number
  [key: string]: unknown
}

interface WalletPositionHistory {
  marketId: number
  stakes: string[]
  shares: string[]
  totalStake: string
  claimed: boolean
  claimedPayout: string
}

interface CacheEntry {
  expiresAt: number
  payload: Record<string, unknown>
}

const responseCache = new Map<string, CacheEntry>()
const inFlightRequests = new Map<string, Promise<Record<string, unknown>>>()

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function bigintToNumber(value: unknown): number {
  const bigintValue = BigInt(value as bigint)
  if (bigintValue > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Value ${bigintValue.toString()} exceeds JavaScript's safe integer range`)
  }
  return Number(bigintValue)
}

function bigintToString(value: unknown): string {
  return BigInt(value as bigint).toString()
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function extractRpcErrorMessage(error?: RpcError): string {
  if (!error) return 'RPC call failed'
  if (typeof error.data === 'string') return error.data
  if (typeof error.data === 'object' && error.data !== null && 'message' in error.data) {
    return String((error.data as { message?: unknown }).message || error.message || 'RPC call failed')
  }
  return error.message || 'RPC call failed'
}

function isRateLimitError(status: number, json?: RpcResponse, text = ''): boolean {
  const combined = `${json?.error?.message || ''} ${text}`.toLowerCase()
  return status === 429 || json?.error?.code === -32029 ||
    combined.includes('rate limit') || combined.includes('too many requests')
}

async function fetchRpcJson(
  accessToken: string,
  body: unknown,
  callName: string
): Promise<unknown> {
  let lastError = `${callName} failed`

  for (let attempt = 1; attempt <= MAX_RPC_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: AbortSignal.timeout(4_000)
      })

      const responseText = await response.text()
      let parsed: unknown
      try {
        parsed = JSON.parse(responseText)
      } catch {
        throw new Error(`${callName} returned invalid JSON: ${responseText.slice(0, 250)}`)
      }

      const sample = Array.isArray(parsed) ? parsed[0] as RpcResponse | undefined : parsed as RpcResponse
      if (isRateLimitError(response.status, sample, responseText)) {
        if (attempt < MAX_RPC_ATTEMPTS) {
          const retryAfter = Number(response.headers.get('retry-after') || 0)
          const delay = retryAfter > 0
            ? retryAfter * 1000
            : INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
          console.warn(`[Markets API] ${callName} rate limited. Retrying in ${delay}ms (${attempt}/${MAX_RPC_ATTEMPTS}).`)
          await sleep(delay)
          continue
        }
      }

      if (!response.ok) {
        throw new Error(`${callName} returned HTTP ${response.status}: ${responseText.slice(0, 250)}`)
      }

      return parsed
    } catch (error) {
      lastError = getErrorMessage(error)
      const retryable = /429|rate limit|too many requests|fetch failed|timeout/i.test(lastError)
      if (retryable && attempt < MAX_RPC_ATTEMPTS) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
        console.warn(`[Markets API] ${callName} failed. Retrying in ${delay}ms (${attempt}/${MAX_RPC_ATTEMPTS}).`)
        await sleep(delay)
        continue
      }
      throw error
    }
  }

  throw new Error(`${lastError}. Maximum retry attempts reached.`)
}

async function rpcCall(
  accessToken: string,
  data: string,
  callName: string,
  id: number
): Promise<string> {
  const parsed = await fetchRpcJson(accessToken, {
    jsonrpc: '2.0',
    id,
    method: 'eth_call',
    params: [{ to: CONTRACT_ADDRESS, data }, 'latest']
  }, callName) as RpcResponse

  if (parsed.error) throw new Error(`${callName} failed: ${extractRpcErrorMessage(parsed.error)}`)
  if (!parsed.result || parsed.result === '0x') throw new Error(`${callName} returned empty data`)
  return parsed.result
}

async function rpcBatchRead(
  accessToken: string,
  calls: BatchCall[],
  startId: number,
  routeStartedAt = Date.now()
): Promise<Map<string, ethers.Result>> {
  const output = new Map<string, ethers.Result>()
  let pending = [...calls]
  let requestSequence = 0

  for (
    let round = 1;
    round <= RPC_BATCH_RETRY_ROUNDS && pending.length > 0;
    round++
  ) {
    const nextPending: BatchCall[] = []
    const chunkSize = Math.max(
      1,
      Math.floor(RPC_BATCH_SIZE / Math.pow(2, round - 1))
    )

    for (let offset = 0; offset < pending.length; offset += chunkSize) {
      if (Date.now() - routeStartedAt >= MAX_ROUTE_TIME_MS - 2_000) {
        console.warn('[Markets API] Time budget reached; returning the markets loaded so far.')
        nextPending.push(...pending.slice(offset))
        break
      }

      const chunk = pending.slice(offset, offset + chunkSize)
      const idByKey = new Map<string, number>()
      const callById = new Map<number, BatchCall>()

      const requests = chunk.map(call => {
        const id = startId + requestSequence++
        idByKey.set(call.key, id)
        callById.set(id, call)

        return {
          jsonrpc: '2.0',
          id,
          method: 'eth_call',
          params: [{
            to: CONTRACT_ADDRESS,
            data: iface.encodeFunctionData(call.functionName, call.args)
          }, 'latest']
        }
      })

      const startedAt = Date.now()
      let parsed: unknown

      try {
        parsed = await fetchRpcJson(
          accessToken,
          requests,
          `RPC batch round ${round}`
        )
      } catch (error) {
        console.warn(
          `[Markets API] RPC batch round ${round} failed; scheduling ${chunk.length} calls for retry:`,
          getErrorMessage(error)
        )
        nextPending.push(...chunk)
        continue
      }

      if (!Array.isArray(parsed)) {
        console.warn(
          `[Markets API] RPC batch round ${round} returned a non-array response; scheduling ${chunk.length} calls for retry.`
        )
        nextPending.push(...chunk)
        continue
      }

      const responsesById = new Map<number, RpcResponse>()
      for (const item of parsed as RpcResponse[]) {
        responsesById.set(Number(item.id), item)
      }

      for (const call of chunk) {
        const id = idByKey.get(call.key)
        const response = id === undefined ? undefined : responsesById.get(id)

        if (!response) {
          console.warn(`[Markets API] Missing response for ${call.callName}; retrying.`)
          nextPending.push(call)
          continue
        }

        if (response.error) {
          const message = extractRpcErrorMessage(response.error)
          console.warn(`[Markets API] ${call.callName} failed in batch: ${message}`)
          nextPending.push(call)
          continue
        }

        if (!response.result || response.result === '0x') {
          console.warn(`[Markets API] ${call.callName} returned empty data; retrying.`)
          nextPending.push(call)
          continue
        }

        try {
          output.set(
            call.key,
            iface.decodeFunctionResult(call.functionName, response.result)
          )
        } catch (error) {
          console.warn(
            `[Markets API] Unable to decode ${call.callName}; retrying:`,
            getErrorMessage(error)
          )
          nextPending.push(call)
        }
      }

      console.info(
        `[Markets API] RPC batch round ${round}: ${chunk.length} calls in ${Date.now() - startedAt}ms`
      )

      if (offset + chunkSize < pending.length) {
        await sleep(RPC_BATCH_GAP_MS)
      }
    }

    pending = nextPending.filter(call => !output.has(call.key))

    if (pending.length > 0 && round < RPC_BATCH_RETRY_ROUNDS) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, round - 1)
      console.warn(
        `[Markets API] ${pending.length} RPC calls remain unavailable after round ${round}. Retrying in ${delay}ms with smaller batches.`
      )
      await sleep(delay)
    }
  }

  if (pending.length > 0) {
    console.warn(
      `[Markets API] ${pending.length} calls remain unavailable. Individual fallbacks are disabled to keep the route below Netlify's timeout.`
    )
  }

  return output
}

async function rpcJson(
  accessToken: string,
  method: string,
  params: unknown[],
  id: number
): Promise<unknown> {
  const parsed = await fetchRpcJson(accessToken, {
    jsonrpc: '2.0', id, method, params
  }, method) as RpcResponse
  if (parsed.error) throw new Error(extractRpcErrorMessage(parsed.error))
  return parsed.result
}

async function loadLogsChunked(
  accessToken: string,
  topics: Array<string | string[] | null>,
  requestId: number
): Promise<RpcLog[]> {
  const configuredStart = process.env.INTERPREDICT_DEPLOYMENT_BLOCK || '0x0'
  const latestHex = await rpcJson(accessToken, 'eth_blockNumber', [], requestId)
  const latest = Number(BigInt(String(latestHex)))
  let from = Number(BigInt(configuredStart))
  const logs: RpcLog[] = []
  const chunkSize = 10_000

  console.info(`[Markets API] Deployment block: ${configuredStart} (${from})`)
  console.info(`[Markets API] Event scan range: ${from} to ${latest}`)

  while (from <= latest) {
    const to = Math.min(from + chunkSize - 1, latest)
    console.info(`[Markets API] Scanning logs from ${from} to ${to}`)
    const result = await rpcJson(accessToken, 'eth_getLogs', [{
      address: CONTRACT_ADDRESS,
      fromBlock: ethers.toQuantity(from),
      toBlock: ethers.toQuantity(to),
      topics
    }], requestId + from)
    if (Array.isArray(result)) logs.push(...result as RpcLog[])
    from = to + 1
  }

  return logs
}

async function loadResolutionVotingDeadlines(
  accessToken: string
): Promise<Map<number, number>> {
  const deadlines = new Map<number, number>()
  if (!ENABLE_RESOLUTION_EVENT_SCAN) return deadlines

  try {
    const eventFragment = iface.getEvent('RR')
    if (!eventFragment) return deadlines
    const logs = await loadLogsChunked(accessToken, [eventFragment.topicHash], 900001)
    for (const log of logs) {
      try {
        const decoded = iface.decodeEventLog(eventFragment, log.data, log.topics)
        deadlines.set(
          bigintToNumber(decoded.id ?? decoded[0]),
          bigintToNumber(decoded.dl ?? decoded[2])
        )
      } catch (error) {
        console.warn('[Markets API] Unable to decode RR event:', getErrorMessage(error))
      }
    }
  } catch (error) {
    console.warn('[Markets API] Resolution deadline event lookup failed:', getErrorMessage(error))
  }

  return deadlines
}

async function loadWalletPositionHistory(
  accessToken: string,
  walletAddress: string
): Promise<Map<number, WalletPositionHistory>> {
  const positions = new Map<number, WalletPositionHistory>()
  if (!ENABLE_EVENT_HISTORY) return positions

  const sp = iface.getEvent('SP')
  const wc = iface.getEvent('WC')
  if (!sp || !wc) return positions

  try {
    const logs = await loadLogsChunked(accessToken, [[sp.topicHash, wc.topicHash]], 910000)
    for (const log of logs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics, data: log.data })
        if (!parsed) continue

        if (parsed.name === 'SP') {
          const buyer = String(parsed.args.b ?? parsed.args[1])
          if (buyer.toLowerCase() !== walletAddress.toLowerCase()) continue
          const marketId = bigintToNumber(parsed.args.id ?? parsed.args[0])
          const outcomeIndex = Number(parsed.args.oi ?? parsed.args[2])
          const gross = BigInt(parsed.args.g ?? parsed.args[3])
          const shares = BigInt(parsed.args.s ?? parsed.args[5])
          const current = positions.get(marketId) || {
            marketId, stakes: [], shares: [], totalStake: '0', claimed: false, claimedPayout: '0'
          }
          while (current.stakes.length <= outcomeIndex) current.stakes.push('0')
          while (current.shares.length <= outcomeIndex) current.shares.push('0')
          current.stakes[outcomeIndex] = (BigInt(current.stakes[outcomeIndex]) + gross).toString()
          current.shares[outcomeIndex] = (BigInt(current.shares[outcomeIndex]) + shares).toString()
          current.totalStake = (BigInt(current.totalStake) + gross).toString()
          positions.set(marketId, current)
        } else if (parsed.name === 'WC') {
          const claimant = String(parsed.args.c ?? parsed.args[1])
          if (claimant.toLowerCase() !== walletAddress.toLowerCase()) continue
          const marketId = bigintToNumber(parsed.args.id ?? parsed.args[0])
          const current = positions.get(marketId) || {
            marketId, stakes: [], shares: [], totalStake: '0', claimed: false, claimedPayout: '0'
          }
          current.claimed = true
          current.claimedPayout = BigInt(parsed.args.a ?? parsed.args[2]).toString()
          positions.set(marketId, current)
        }
      } catch (error) {
        console.warn('[Markets API] Unable to decode wallet history event:', getErrorMessage(error))
      }
    }
  } catch (error) {
    console.warn('[Markets API] Wallet event history scan failed:', getErrorMessage(error))
  }

  return positions
}

function buildMarket(
  marketId: number,
  values: Map<string, ethers.Result>,
  resolutionVotingDeadline: number
): LoadedMarket {
  const get = (name: string): ethers.Result => {
    const value = values.get(`${marketId}:${name}`)
    if (!value) throw new Error(`${name}(${marketId}) was unavailable`)
    return value
  }

  const base = get('mb')
  const voting = get('mv')
  const resolution = get('mr')
  const financial = get('mf')
  const stateResult = get('ms')
  const labelsResult = get('gL')
  const poolsResult = get('gP')
  const pricesResult = get('gPr2')

  const state = Number(stateResult[0])
  const category = Number(base.cat ?? base[2])
  const origin = Number(base.o ?? base[5])
  const proposalDecision = Number(voting.pd ?? voting[5])
  const outcomeLabels = Array.from(labelsResult[0] as readonly string[])
  const outcomePools = Array.from(poolsResult[0] as readonly bigint[]).map(String)
  const rawOutcomePrices = Array.from(pricesResult[0] as readonly bigint[])
  const marketEndTime = bigintToNumber(base.et ?? base[7])
  const nowSec = Math.floor(Date.now() / 1000)
  const canRequestResolution =
    (state === MarketState.Active && marketEndTime <= nowSec) ||
    state === MarketState.Closed || state === MarketState.Unresolved

  return {
    id: marketId,
    marketId,
    question: String(base.q ?? base[0]),
    description: String(base.d ?? base[1]),
    category,
    categoryName: CATEGORY_NAMES[category] || `Category ${category}`,
    customCategory: String(base.cc ?? base[3]),
    thumbnailUri: String(base.tu ?? base[4]),
    origin,
    originName: ORIGIN_NAMES[origin] || `Origin ${origin}`,
    creator: String(base.cr ?? base[6]),
    marketEndTime,
    endTime: marketEndTime,
    resolutionCriteria: String(base.rc ?? base[8]),
    primaryEvidenceUri: String(base.pe ?? base[9]),
    backupEvidenceUri: String(base.be ?? base[10]),
    proposalVotingStart: bigintToNumber(voting.pvs ?? voting[0]),
    proposalVotingDeadline: bigintToNumber(voting.pvd ?? voting[1]),
    approvalVotes: bigintToNumber(voting.apv ?? voting[2]),
    rejectionVotes: bigintToNumber(voting.rjv ?? voting[3]),
    proposalFinalized: Boolean(voting.pf ?? voting[4]),
    proposalDecision,
    proposalDecisionName: PROPOSAL_DECISION_NAMES[proposalDecision] || `Decision ${proposalDecision}`,
    proposalFinalizationTimestamp: bigintToNumber(voting.pft ?? voting[6]),
    refundAmount: bigintToString(voting.ra ?? voting[7]),
    refundRecipient: String(voting.rr ?? voting[8]),
    refundCompleted: Boolean(voting.rc ?? voting[9]),
    resolutionVotingDeadline,
    activeDECSnapshot: bigintToNumber(resolution.snap ?? resolution[0]),
    resolutionQuorum: bigintToNumber(resolution.quorum ?? resolution[1]),
    totalResolutionVotes: bigintToNumber(resolution.trv ?? resolution[2]),
    confirmedOutcome: Number(resolution.co ?? resolution[3]),
    decSelectedOutcome: Number(resolution.co ?? resolution[3]),
    outcomeConfirmed: Boolean(resolution.oc ?? resolution[4]),
    finalized: Boolean(resolution.fin ?? resolution[5]),
    finalizationTimestamp: 0,
    totalVolume: bigintToString(financial.tv ?? financial[0]),
    participantCount: bigintToNumber(financial.pc ?? financial[1]),
    creatorFeesEarned: bigintToString(financial.cfe ?? financial[2]),
    creatorFeesClaimed: bigintToString(financial.cfc ?? financial[3]),
    creatorSeedClaimed: bigintToString(financial.csc ?? financial[4]),
    cancelled: Boolean(financial.can ?? financial[5]),
    cancelReason: String(financial.cr ?? financial[6]),
    cancelTimestamp: bigintToNumber(financial.ct ?? financial[7]),
    state,
    stateName: STATE_NAMES[state] || `Unknown State ${state}`,
    outcomeLabels,
    outcomePools,
    outcomePrices: rawOutcomePrices.map(value => Number(ethers.formatUnits(value, 18))),
    outcomePricesRaw: rawOutcomePrices.map(String),
    outcomeCount: outcomeLabels.length,
    isExpired: marketEndTime > 0 && nowSec >= marketEndTime,
    isProposed: state === MarketState.Proposed,
    isInProposalVoting: state === MarketState.DECVoting,
    isActive: state === MarketState.Active,
    canRequestResolution,
    isInDECResolutionVoting: state === MarketState.DECResolutionVoting,
    isAwaitingAdminVerification: state === MarketState.AdminVerification,
    isOutcomeConfirmed: state === MarketState.Confirmed,
    isFinalized: state === MarketState.Finalized || state === MarketState.Resolved,
    isPendingResolution: [6, 7, 8, 9, 10, 11].includes(state),
    isResolved: state === MarketState.Finalized || state === MarketState.Resolved
  }
}

async function loadMarketRange(
  accessToken: string,
  start: number,
  endExclusive: number,
  resolutionDeadlines: Map<number, number>,
  routeStartedAt: number
): Promise<{ markets: LoadedMarket[]; skipped: SkippedMarket[] }> {
  const calls: BatchCall[] = []
  const functions = ['mb', 'mv', 'mr', 'mf', 'ms', 'gL', 'gP', 'gPr2']

  for (let marketId = start; marketId < endExclusive; marketId++) {
    for (const functionName of functions) {
      calls.push({
        key: `${marketId}:${functionName}`,
        functionName,
        args: [marketId],
        callName: `${functionName}(${marketId})`
      })
    }
  }

  const values = await rpcBatchRead(accessToken, calls, 1000 + start * 100, routeStartedAt)
  const markets: LoadedMarket[] = []
  const skipped: SkippedMarket[] = []

  for (let marketId = start; marketId < endExclusive; marketId++) {
    try {
      markets.push(buildMarket(marketId, values, resolutionDeadlines.get(marketId) || 0))
    } catch (error) {
      const message = getErrorMessage(error)
      skipped.push({ marketId, error: message })
      console.error(`[Markets API] Unable to build market ${marketId}: ${message}`)
    }
  }

  return { markets, skipped }
}

async function enrichWalletData(
  accessToken: string,
  markets: LoadedMarket[],
  walletAddress: string,
  routeStartedAt: number
): Promise<Map<number, WalletPositionHistory>> {
  const walletHistory = await loadWalletPositionHistory(accessToken, walletAddress)
  const calls: BatchCall[] = []

  for (const market of markets) {
    calls.push(
      { key: `${market.id}:pv`, functionName: 'pv', args: [market.id, walletAddress], callName: `pv(${market.id})` },
      { key: `${market.id}:rv`, functionName: 'rv', args: [market.id, walletAddress], callName: `rv(${market.id})` },
      { key: `${market.id}:hvp`, functionName: 'hvp', args: [market.id, walletAddress], callName: `hvp(${market.id})` },
      { key: `${market.id}:hcw`, functionName: 'hcw', args: [market.id, walletAddress], callName: `hcw(${market.id})` }
    )
    for (let outcomeIndex = 0; outcomeIndex < market.outcomeLabels.length; outcomeIndex++) {
      calls.push({
        key: `${market.id}:sh:${outcomeIndex}`,
        functionName: 'sh',
        args: [market.id, outcomeIndex, walletAddress],
        callName: `sh(${market.id},${outcomeIndex})`
      })
    }
  }

  const values = await rpcBatchRead(accessToken, calls, 500000, routeStartedAt)

  for (const market of markets) {
    const proposalVote = Number(values.get(`${market.id}:pv`)?.[0] || 0)
    const resolutionVote = Number(values.get(`${market.id}:rv`)?.[0] || 0)
    const hasPosition = Boolean(values.get(`${market.id}:hvp`)?.[0] || false)
    const hasClaimed = Boolean(values.get(`${market.id}:hcw`)?.[0] || false)
    const shares = market.outcomeLabels.map((_, index) =>
      bigintToString(values.get(`${market.id}:sh:${index}`)?.[0] || BigInt(0))
    )

    market.currentWalletProposalVote = proposalVote
    market.hasCurrentWalletVoted = proposalVote !== 0
    market.currentWalletResolutionVote = resolutionVote
    market.hasCurrentWalletVotedOnResolution = resolutionVote !== 0

    const hasAnyShares = shares.some(value => BigInt(value) > BigInt(0))
    const existing = walletHistory.get(market.id)

    if (existing) {
      existing.claimed = existing.claimed || hasClaimed
      for (let index = 0; index < shares.length; index++) {
        while (existing.shares.length <= index) existing.shares.push('0')
        if (BigInt(existing.shares[index] || '0') === BigInt(0)) existing.shares[index] = shares[index]
      }
      walletHistory.set(market.id, existing)
    } else if (hasPosition || hasAnyShares || hasClaimed) {
      walletHistory.set(market.id, {
        marketId: market.id,
        stakes: Array.from({ length: market.outcomeLabels.length }, () => '0'),
        shares,
        totalStake: '0',
        claimed: hasClaimed,
        claimedPayout: '0'
      })
    }
  }

  return walletHistory
}

function buildWalletPositions(
  walletHistory: Map<number, WalletPositionHistory>,
  markets: LoadedMarket[]
): Array<Record<string, unknown>> {
  return Array.from(walletHistory.values()).map(history => {
    const market = markets.find(item => item.id === history.marketId)
    const outcomeCount = market?.outcomeLabels.length || Math.max(history.shares.length, history.stakes.length)
    const shares = Array.from({ length: outcomeCount }, (_, index) => history.shares[index] || '0')
    const stakes = Array.from({ length: outcomeCount }, (_, index) => history.stakes[index] || '0')
    let claimablePayout = '0'

    if (market && market.finalized && !history.claimed) {
      const winningOutcome = Number(market.confirmedOutcome)
      const userShares = BigInt(shares[winningOutcome] || '0')
      const pools = market.outcomePools.map(value => BigInt(value))
      const totalPool = pools.reduce((sum, value) => sum + value, BigInt(0))
      const winningPool = BigInt(market.outcomePools[winningOutcome] || '0')
      if (userShares > BigInt(0) && winningPool > BigInt(0)) {
        const grossPayout = (userShares * totalPool) / winningPool
        claimablePayout = (grossPayout - ((grossPayout * BigInt(500)) / BigInt(10000))).toString()
      }
    }

    return {
      ...history,
      shares,
      stakes,
      claimablePayout,
      question: market?.question || `Market #${history.marketId}`,
      marketState: market?.state || 0,
      confirmedOutcome: market?.confirmedOutcome || 0,
      marketEndTime: market?.marketEndTime || 0,
      outcomeLabels: market?.outcomeLabels || [],
      outcomePools: market?.outcomePools || []
    }
  })
}

function buildPayload(
  allMarkets: LoadedMarket[],
  walletPositions: Array<Record<string, unknown>>,
  totalCount: number,
  skippedMarkets: SkippedMarket[],
  walletAddress: string,
  startedAt: number,
  pageStart: number,
  pageLimit: number
): Record<string, unknown> {
  const pendingProposals = allMarkets.filter(m => [0, 1, 4].includes(m.state))
  const activeMarkets = allMarkets.filter(m => m.state === 5)
  const unresolvedMarkets = allMarkets.filter(m => [6, 7, 8, 9, 10, 11].includes(m.state))
  const awaitingResolutionMarkets = allMarkets.filter(m => Boolean(m.canRequestResolution) || m.state === 8)
  const resolutionVotingMarkets = allMarkets.filter(m => m.state === 9)
  const adminVerificationMarkets = allMarkets.filter(m => m.state === 10)
  const confirmedMarkets = allMarkets.filter(m => m.state === 11)
  const finalizedMarkets = allMarkets.filter(m => m.state === 12 || m.state === 13)
  const resolvedMarkets = finalizedMarkets
  const rejectedMarkets = allMarkets.filter(m => m.state === 2)
  const cancelledMarkets = allMarkets.filter(m => m.state === 3)

  return {
    allMarkets,
    activeMarkets,
    pendingProposals,
    unresolvedMarkets,
    awaitingResolutionMarkets,
    resolutionVotingMarkets,
    adminVerificationMarkets,
    confirmedMarkets,
    finalizedMarkets,
    resolvedMarkets,
    rejectedMarkets,
    cancelledMarkets,
    walletPositions,
    counts: {
      all: allMarkets.length,
      active: activeMarkets.length,
      pending: pendingProposals.length,
      unresolved: unresolvedMarkets.length,
      awaitingResolution: awaitingResolutionMarkets.length,
      resolutionVoting: resolutionVotingMarkets.length,
      adminVerification: adminVerificationMarkets.length,
      confirmed: confirmedMarkets.length,
      finalized: finalizedMarkets.length,
      resolved: resolvedMarkets.length,
      rejected: rejectedMarkets.length,
      cancelled: cancelledMarkets.length
    },
    pagination: {
      start: pageStart,
      limit: pageLimit,
      nextStart: Math.min(pageStart + pageLimit, totalCount),
      hasMore: pageStart + pageLimit < totalCount,
      totalMarkets: totalCount
    },
    diagnostics: {
      contractAddress: CONTRACT_ADDRESS,
      eventScanStartBlock: process.env.INTERPREDICT_DEPLOYMENT_BLOCK || '0x0',
      requestedWallet: walletAddress || null,
      totalMarketsReported: totalCount,
      marketsLoaded: allMarkets.length,
      marketsSkipped: skippedMarkets.length,
      skippedMarkets,
      elapsedMs: Date.now() - startedAt,
      rpcConfiguration: {
        maxAttempts: MAX_RPC_ATTEMPTS,
        initialRetryDelayMs: INITIAL_RETRY_DELAY_MS,
        batchSize: RPC_BATCH_SIZE,
        batchRetryRounds: RPC_BATCH_RETRY_ROUNDS,
        batchGapMs: RPC_BATCH_GAP_MS,
        loadingMode: 'adaptive-json-rpc-batched',
        eventHistoryEnabled: ENABLE_EVENT_HISTORY,
        resolutionEventScanEnabled: ENABLE_RESOLUTION_EVENT_SCAN,
        walletEnrichmentEnabled: ENABLE_WALLET_ENRICHMENT,
        maxRouteTimeMs: MAX_ROUTE_TIME_MS
      }
    },
    fetchedAt: new Date().toISOString()
  }
}

async function generatePayload(
  walletAddress: string,
  pageStart: number,
  pageLimit: number
): Promise<Record<string, unknown>> {
  const startedAt = Date.now()
  const accessToken = await getValidServiceToken()
  const totalRaw = await rpcCall(
    accessToken,
    iface.encodeFunctionData('tm', []),
    'tm()',
    1
  )
  const totalCount = bigintToNumber(iface.decodeFunctionResult('tm', totalRaw)[0])
  const safeStart = Math.min(Math.max(0, pageStart), totalCount)
  const endExclusive = Math.min(safeStart + pageLimit, totalCount)
  const deadlines = await loadResolutionVotingDeadlines(accessToken)
  const { markets, skipped } = await loadMarketRange(
    accessToken, safeStart, endExclusive, deadlines, startedAt
  )

  let walletPositions: Array<Record<string, unknown>> = []
  if (walletAddress && ENABLE_WALLET_ENRICHMENT && Date.now() - startedAt < MAX_ROUTE_TIME_MS - 5_000) {
    const walletHistory = await enrichWalletData(accessToken, markets, walletAddress, startedAt)
    walletPositions = buildWalletPositions(walletHistory, markets)
  }

  console.info(`[Markets API] Loaded page ${safeStart}-${endExclusive - 1}: ${markets.length}/${endExclusive - safeStart} markets in ${Date.now() - startedAt}ms`)
  return buildPayload(
    markets, walletPositions, totalCount, skipped, walletAddress, startedAt, safeStart, pageLimit
  )
}

export async function GET(request: Request) {
  if (!ethers.isAddress(CONTRACT_ADDRESS)) {
    return NextResponse.json({
      error: 'NEXT_PUBLIC_CONTRACT_ADDRESS is missing or invalid',
      contractAddress: CONTRACT_ADDRESS
    }, { status: 500 })
  }

  const requestUrl = new URL(request.url)
  const requestedAddress = requestUrl.searchParams.get('address')?.trim() || ''
  const walletAddress = ethers.isAddress(requestedAddress) ? requestedAddress.toLowerCase() : ''
  const requestedStart = Number.parseInt(requestUrl.searchParams.get('start') || '0', 10)
  const requestedLimit = Number.parseInt(requestUrl.searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10)
  const pageStart = Number.isFinite(requestedStart) ? Math.max(0, requestedStart) : 0
  const pageLimit = Number.isFinite(requestedLimit)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, requestedLimit))
    : DEFAULT_PAGE_SIZE
  const cacheKey = `${walletAddress || 'public'}:${pageStart}:${pageLimit}`
  const ttl = walletAddress ? WALLET_CACHE_TTL_MS : PUBLIC_CACHE_TTL_MS
  const now = Date.now()

  const cached = responseCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return NextResponse.json({ ...cached.payload, cache: { hit: true, ttlMs: ttl } }, {
      headers: {
        'Cache-Control': walletAddress
          ? 'private, no-store'
          : 'public, max-age=0, s-maxage=60, stale-while-revalidate=600'
      }
    })
  }

  try {
    let pending = inFlightRequests.get(cacheKey)
    if (!pending) {
      pending = generatePayload(walletAddress, pageStart, pageLimit)
      inFlightRequests.set(cacheKey, pending)
    }

    const payload = await pending
    const diagnostics = payload.diagnostics as {
      totalMarketsReported?: number
      marketsLoaded?: number
    } | undefined
    const pagination = payload.pagination as { start?: number; limit?: number; totalMarkets?: number } | undefined
    const expectedOnPage = Math.max(0, Math.min(
      pagination?.limit || pageLimit,
      (pagination?.totalMarkets || 0) - (pagination?.start || pageStart)
    ))
    const isComplete = diagnostics?.marketsLoaded === expectedOnPage

    if (isComplete) {
      responseCache.set(cacheKey, { expiresAt: Date.now() + ttl, payload })
    } else {
      console.warn(
        `[Markets API] Partial response was not cached (${diagnostics?.marketsLoaded || 0}/${diagnostics?.totalMarketsReported || 0} markets loaded).`
      )
    }

    return NextResponse.json({
      ...payload,
      cache: {
        hit: false,
        stored: isComplete,
        ttlMs: isComplete ? ttl : 0
      }
    }, {
      headers: {
        'Cache-Control': walletAddress
          ? 'private, no-store'
          : 'public, max-age=0, s-maxage=60, stale-while-revalidate=600'
      }
    })
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('GET /api/markets failed:', error)

    const stale = responseCache.get(cacheKey)
    if (stale) {
      return NextResponse.json({
        ...stale.payload,
        cache: { hit: true, stale: true },
        warning: `Fresh market loading failed; serving stale data: ${message}`
      }, { status: 200 })
    }

    return NextResponse.json({
      error: message,
      diagnostics: {
        contractAddress: CONTRACT_ADDRESS,
        requestedWallet: walletAddress || null
      }
    }, { status: 502 })
  } finally {
    inFlightRequests.delete(cacheKey)
  }
}