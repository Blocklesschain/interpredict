import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getValidServiceToken } from '@/lib/interlinkServiceAuth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ||
  '0x3E5936F13e1194380A66c3c1d75D4D7342299CfF'

const RPC_URL =
  'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'

const MAX_RPC_ATTEMPTS = 4
const INITIAL_RETRY_DELAY_MS = 700
const MARKET_DELAY_MS = 350

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
  [MarketState.Proposed]: 'Proposed',
  [MarketState.DECVoting]: 'DEC Voting',
  [MarketState.Rejected]: 'Rejected',
  [MarketState.Cancelled]: 'Cancelled',
  [MarketState.Approved]: 'Approved',
  [MarketState.Active]: 'Active',
  [MarketState.Closed]: 'Closed',
  [MarketState.Unresolved]: 'Unresolved',
  [MarketState.ResolutionRequested]: 'Resolution Requested',
  [MarketState.DECResolutionVoting]: 'DEC Resolution Voting',
  [MarketState.AdminVerification]: 'Admin Verification',
  [MarketState.Confirmed]: 'Outcome Confirmed',
  [MarketState.Finalized]: 'Finalized',
  [MarketState.Resolved]: 'Resolved'
}

const CATEGORY_NAMES = [
  'Sports',
  'Politics',
  'Crypto',
  'Blockchain',
  'Technology',
  'AI',
  'Economics',
  'Finance',
  'Business',
  'Science',
  'Climate',
  'Entertainment',
  'Culture',
  'Health',
  'Real Estate',
  'Gaming',
  'Web3',
  'Other'
]

const ORIGIN_NAMES = ['Community', 'Team']

const PROPOSAL_DECISION_NAMES = [
  'None',
  'Approve',
  'Reject'
]

interface RpcResponse {
  jsonrpc?: string
  id?: number | string
  result?: string
  error?: {
    code?: number
    message?: string
    data?: unknown
  }
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function bigintToNumber(value: unknown): number {
  const bigintValue = BigInt(value as bigint)

  if (bigintValue > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(
      `Value ${bigintValue.toString()} exceeds JavaScript's safe integer range`
    )
  }

  return Number(bigintValue)
}

function bigintToString(value: unknown): string {
  return BigInt(value as bigint).toString()
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds)
  })
}

function extractRpcErrorMessage(
  error: RpcResponse['error']
): string {
  if (!error) {
    return 'RPC call failed'
  }

  let message =
    error.message ||
    'RPC call failed'

  if (typeof error.data === 'string') {
    message = error.data
  } else if (
    typeof error.data === 'object' &&
    error.data !== null &&
    'message' in error.data
  ) {
    const nestedMessage = (
      error.data as {
        message?: unknown
      }
    ).message

    if (nestedMessage !== undefined) {
      message = String(nestedMessage)
    }
  }

  return message
}

function isRateLimitError(
  responseStatus: number,
  json?: RpcResponse,
  responseText?: string
): boolean {
  if (responseStatus === 429) {
    return true
  }

  if (json?.error?.code === -32029) {
    return true
  }

  const combinedMessage = [
    json?.error?.message,
    responseText
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return (
    combinedMessage.includes('rate limit') ||
    combinedMessage.includes('too many requests')
  )
}

async function rpcCall(
  accessToken: string,
  data: string,
  callName: string,
  id: number
): Promise<string> {
  let lastError = `${callName} failed`

  for (
    let attempt = 1;
    attempt <= MAX_RPC_ATTEMPTS;
    attempt++
  ) {
    try {
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id,
          method: 'eth_call',
          params: [
            {
              to: CONTRACT_ADDRESS,
              data
            },
            'latest'
          ]
        }),
        cache: 'no-store'
      })

      const responseText =
        await response.text()

      let json: RpcResponse | undefined

      try {
        json = JSON.parse(
          responseText
        ) as RpcResponse
      } catch {
        if (
          response.status === 429 &&
          attempt < MAX_RPC_ATTEMPTS
        ) {
          const retryDelay =
            INITIAL_RETRY_DELAY_MS *
            attempt

          console.warn(
            `${callName} was rate limited. Retrying in ${retryDelay}ms. Attempt ${attempt}/${MAX_RPC_ATTEMPTS}.`
          )

          await sleep(retryDelay)
          continue
        }

        throw new Error(
          `${callName} returned invalid JSON: ${responseText.slice(
            0,
            300
          )}`
        )
      }

      const rateLimited =
        isRateLimitError(
          response.status,
          json,
          responseText
        )

      if (
        rateLimited &&
        attempt < MAX_RPC_ATTEMPTS
      ) {
        const retryAfterHeader =
          response.headers.get('retry-after')

        const retryAfterSeconds =
          retryAfterHeader
            ? Number(retryAfterHeader)
            : 0

        const retryDelay =
          Number.isFinite(retryAfterSeconds) &&
            retryAfterSeconds > 0
            ? retryAfterSeconds * 1000
            : INITIAL_RETRY_DELAY_MS *
            attempt

        console.warn(
          `${callName} was rate limited. Retrying in ${retryDelay}ms. Attempt ${attempt}/${MAX_RPC_ATTEMPTS}.`
        )

        await sleep(retryDelay)
        continue
      }

      if (!response.ok) {
        throw new Error(
          `${callName} returned HTTP ${response.status}: ${responseText.slice(
            0,
            300
          )}`
        )
      }

      if (json.error) {
        const errorDetails =
          extractRpcErrorMessage(
            json.error
          )

        throw new Error(
          `${callName} failed: ${errorDetails}`
        )
      }

      if (
        typeof json.result !== 'string' ||
        json.result === '' ||
        json.result === '0x'
      ) {
        throw new Error(
          `${callName} returned empty data. Check the deployed contract address and ABI.`
        )
      }

      return json.result
    } catch (error: unknown) {
      lastError =
        getErrorMessage(error)

      const looksRateLimited =
        lastError
          .toLowerCase()
          .includes('rate limit') ||
        lastError
          .toLowerCase()
          .includes('too many requests') ||
        lastError.includes('429') ||
        lastError.includes('-32029')

      if (
        looksRateLimited &&
        attempt < MAX_RPC_ATTEMPTS
      ) {
        const retryDelay =
          INITIAL_RETRY_DELAY_MS *
          attempt

        console.warn(
          `${callName} failed due to rate limiting. Retrying in ${retryDelay}ms. Attempt ${attempt}/${MAX_RPC_ATTEMPTS}.`
        )

        await sleep(retryDelay)
        continue
      }

      throw error
    }
  }

  throw new Error(
    `${lastError}. Maximum retry attempts reached.`
  )
}


interface RpcLog {
  topics: string[]
  data: string
  blockNumber?: string
  transactionHash?: string
  logIndex?: string
}

async function rpcJson(
  accessToken: string,
  method: string,
  params: unknown[],
  id: number
): Promise<any> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    cache: 'no-store'
  })
  const json = await response.json()
  if (!response.ok || json.error) {
    throw new Error(json?.error?.message || `${method} returned HTTP ${response.status}`)
  }
  return json.result
}

async function loadLogsChunked(
  accessToken: string,
  topics: Array<string | string[] | null>,
  requestId: number
): Promise<RpcLog[]> {
  const configuredStart = process.env.INTERPREDICT_DEPLOYMENT_BLOCK || '0x0'
  const latestHex = await rpcJson(accessToken, 'eth_blockNumber', [], requestId)
  const latest = Number(BigInt(latestHex))
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
    if (Array.isArray(result)) logs.push(...result)
    from = to + 1
  }

  return logs
}

interface WalletPositionHistory {
  marketId: number
  stakes: string[]
  shares: string[]
  totalStake: string
  claimed: boolean
  claimedPayout: string
}

async function loadWalletPositionHistory(
  accessToken: string,
  walletAddress: string
): Promise<Map<number, WalletPositionHistory>> {
  const positions = new Map<number, WalletPositionHistory>()
  const sp = iface.getEvent('SP')
  const wc = iface.getEvent('WC')
  if (!sp || !wc) return positions

  const logs = await loadLogsChunked(
    accessToken,
    [[sp.topicHash, wc.topicHash]],
    910000
  )

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
          marketId,
          stakes: [],
          shares: [],
          totalStake: '0',
          claimed: false,
          claimedPayout: '0'
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
        const amount = BigInt(parsed.args.a ?? parsed.args[2]).toString()
        const current = positions.get(marketId) || {
          marketId,
          stakes: [],
          shares: [],
          totalStake: '0',
          claimed: false,
          claimedPayout: '0'
        }
        current.claimed = true
        current.claimedPayout = amount
        positions.set(marketId, current)
      }
    } catch (error) {
      console.warn('Unable to decode wallet history event:', getErrorMessage(error))
    }
  }

  return positions
}


async function loadWalletMarketState(
  accessToken: string,
  market: LoadedMarket,
  walletAddress: string
): Promise<{
  proposalVote: number
  resolutionVote: number
  hasPosition: boolean
  hasClaimedWinnings: boolean
  shares: string[]
}> {
  const marketId = market.id
  const proposalVoteResult = await readFunction(
    accessToken, 'pv', [marketId, walletAddress], 920000 + marketId * 20, `pv(${marketId}, ${walletAddress})`
  )
  const resolutionVoteResult = await readFunction(
    accessToken, 'rv', [marketId, walletAddress], 920001 + marketId * 20, `rv(${marketId}, ${walletAddress})`
  )
  const hasPositionResult = await readFunction(
    accessToken, 'hvp', [marketId, walletAddress], 920002 + marketId * 20, `hvp(${marketId}, ${walletAddress})`
  )
  const hasClaimedResult = await readFunction(
    accessToken, 'hcw', [marketId, walletAddress], 920003 + marketId * 20, `hcw(${marketId}, ${walletAddress})`
  )

  const shares: string[] = []
  for (let outcomeIndex = 0; outcomeIndex < market.outcomeLabels.length; outcomeIndex++) {
    const shareResult = await readFunction(
      accessToken, 'sh', [marketId, outcomeIndex, walletAddress],
      920004 + marketId * 20 + outcomeIndex,
      `sh(${marketId}, ${outcomeIndex}, ${walletAddress})`
    )
    shares.push(bigintToString(shareResult[0]))
  }

  return {
    proposalVote: Number(proposalVoteResult[0]),
    resolutionVote: Number(resolutionVoteResult[0]),
    hasPosition: Boolean(hasPositionResult[0]),
    hasClaimedWinnings: Boolean(hasClaimedResult[0]),
    shares
  }
}

async function loadResolutionVotingDeadlines(
  accessToken: string
): Promise<Map<number, number>> {
  const deadlines = new Map<number, number>()

  try {
    const eventFragment = iface.getEvent('RR')
    if (!eventFragment) return deadlines
    const logs = await loadLogsChunked(accessToken, [eventFragment.topicHash], 900001)

    for (const log of logs) {
      try {
        const decoded = iface.decodeEventLog(eventFragment, log.data, log.topics)
        const marketId = bigintToNumber(decoded.id ?? decoded[0])
        const deadline = bigintToNumber(decoded.dl ?? decoded[2])
        deadlines.set(marketId, deadline)
      } catch (error) {
        console.warn('Unable to decode an RR event:', getErrorMessage(error))
      }
    }
  } catch (error) {
    console.warn('Resolution deadline event lookup failed:', getErrorMessage(error))
  }

  return deadlines
}

async function readFunction(
  accessToken: string,
  functionName: string,
  args: readonly unknown[],
  requestId: number,
  callName: string
): Promise<ethers.Result> {
  const data =
    iface.encodeFunctionData(
      functionName,
      args
    )

  const rawResult =
    await rpcCall(
      accessToken,
      data,
      callName,
      requestId
    )

  try {
    return iface.decodeFunctionResult(
      functionName,
      rawResult
    )
  } catch (error: unknown) {
    throw new Error(
      `${callName} returned data that could not be decoded: ${getErrorMessage(
        error
      )}`
    )
  }
}

async function loadMarket(
  accessToken: string,
  marketId: number,
  resolutionVotingDeadline = 0
): Promise<LoadedMarket> {
  /*
   * Calls are deliberately sequential to avoid flooding
   * the InterLink authenticated RPC endpoint.
   */
  const baseResult =
    await readFunction(
      accessToken,
      'mb',
      [marketId],
      marketId * 10 + 1,
      `mb(${marketId})`
    )

  const votingResult =
    await readFunction(
      accessToken,
      'mv',
      [marketId],
      marketId * 10 + 2,
      `mv(${marketId})`
    )

  const resolutionResult =
    await readFunction(
      accessToken,
      'mr',
      [marketId],
      marketId * 10 + 3,
      `mr(${marketId})`
    )

  const financialResult =
    await readFunction(
      accessToken,
      'mf',
      [marketId],
      marketId * 10 + 4,
      `mf(${marketId})`
    )

  const stateResult =
    await readFunction(
      accessToken,
      'ms',
      [marketId],
      marketId * 10 + 5,
      `ms(${marketId})`
    )

  const labelsResult =
    await readFunction(
      accessToken,
      'gL',
      [marketId],
      marketId * 10 + 6,
      `gL(${marketId})`
    )

  const poolsResult =
    await readFunction(
      accessToken,
      'gP',
      [marketId],
      marketId * 10 + 7,
      `gP(${marketId})`
    )

  const pricesResult =
    await readFunction(
      accessToken,
      'gPr2',
      [marketId],
      marketId * 10 + 8,
      `gPr2(${marketId})`
    )

  const base = baseResult
  const voting = votingResult
  const resolution = resolutionResult
  const financial = financialResult

  const state =
    Number(stateResult[0])

  const category =
    Number(base.cat ?? base[2])

  const origin =
    Number(base.o ?? base[5])

  const proposalDecision =
    Number(voting.pd ?? voting[5])

  const outcomeLabels =
    Array.from(
      labelsResult[0] as readonly string[]
    )

  const outcomePools =
    Array.from(
      poolsResult[0] as readonly bigint[]
    ).map(value =>
      value.toString()
    )

  const rawOutcomePrices =
    Array.from(
      pricesResult[0] as readonly bigint[]
    )

  const outcomePricesRaw =
    rawOutcomePrices.map(value =>
      value.toString()
    )

  const outcomePrices =
    rawOutcomePrices.map(value =>
      Number(
        ethers.formatUnits(
          value,
          18
        )
      )
    )

  const marketEndTime =
    bigintToNumber(
      base.et ?? base[7]
    )

  const nowSec =
    Math.floor(
      Date.now() / 1000
    )

  const canRequestResolution =
    (state === MarketState.Active && marketEndTime <= nowSec) ||
    state === MarketState.Closed ||
    state === MarketState.Unresolved

  return {
    id: marketId,
    marketId,

    question: String(
      base.q ?? base[0]
    ),

    description: String(
      base.d ?? base[1]
    ),

    category,

    categoryName:
      CATEGORY_NAMES[category] ||
      `Category ${category}`,

    customCategory: String(
      base.cc ?? base[3]
    ),

    thumbnailUri: String(
      base.tu ?? base[4]
    ),

    origin,

    originName:
      ORIGIN_NAMES[origin] ||
      `Origin ${origin}`,

    creator: String(
      base.cr ?? base[6]
    ),

    marketEndTime,
    endTime: marketEndTime,

    resolutionCriteria: String(
      base.rc ?? base[8]
    ),

    primaryEvidenceUri: String(
      base.pe ?? base[9]
    ),

    backupEvidenceUri: String(
      base.be ?? base[10]
    ),

    proposalVotingStart:
      bigintToNumber(
        voting.pvs ?? voting[0]
      ),

    proposalVotingDeadline:
      bigintToNumber(
        voting.pvd ?? voting[1]
      ),

    approvalVotes:
      bigintToNumber(
        voting.apv ?? voting[2]
      ),

    rejectionVotes:
      bigintToNumber(
        voting.rjv ?? voting[3]
      ),

    proposalFinalized:
      Boolean(
        voting.pf ?? voting[4]
      ),

    proposalDecision,

    proposalDecisionName:
      PROPOSAL_DECISION_NAMES[
      proposalDecision
      ] ||
      `Decision ${proposalDecision}`,

    proposalFinalizationTimestamp:
      bigintToNumber(
        voting.pft ?? voting[6]
      ),

    refundAmount:
      bigintToString(
        voting.ra ?? voting[7]
      ),

    refundRecipient: String(
      voting.rr ?? voting[8]
    ),

    refundCompleted:
      Boolean(
        voting.rc ?? voting[9]
      ),

    resolutionVotingDeadline,

    activeDECSnapshot:
      bigintToNumber(
        resolution.snap ??
        resolution[0]
      ),

    resolutionQuorum:
      bigintToNumber(
        resolution.quorum ??
        resolution[1]
      ),

    totalResolutionVotes:
      bigintToNumber(
        resolution.trv ??
        resolution[2]
      ),

    confirmedOutcome:
      Number(
        resolution.co ??
        resolution[3]
      ),

    decSelectedOutcome:
      Number(
        resolution.co ??
        resolution[3]
      ),

    outcomeConfirmed:
      Boolean(
        resolution.oc ??
        resolution[4]
      ),

    finalized:
      Boolean(
        resolution.fin ??
        resolution[5]
      ),

    finalizationTimestamp: 0,

    totalVolume:
      bigintToString(
        financial.tv ??
        financial[0]
      ),

    participantCount:
      bigintToNumber(
        financial.pc ??
        financial[1]
      ),

    creatorFeesEarned:
      bigintToString(
        financial.cfe ??
        financial[2]
      ),

    creatorFeesClaimed:
      bigintToString(
        financial.cfc ??
        financial[3]
      ),

    creatorSeedClaimed:
      bigintToString(
        financial.csc ??
        financial[4]
      ),

    cancelled:
      Boolean(
        financial.can ??
        financial[5]
      ),

    cancelReason: String(
      financial.cr ??
      financial[6]
    ),

    cancelTimestamp:
      bigintToNumber(
        financial.ct ??
        financial[7]
      ),

    state,

    stateName:
      STATE_NAMES[state] ||
      `Unknown State ${state}`,

    outcomeLabels,
    outcomePools,
    outcomePrices,
    outcomePricesRaw,

    outcomeCount:
      outcomeLabels.length,

    isExpired:
      marketEndTime > 0 &&
      nowSec >= marketEndTime,

    isProposed:
      state ===
      MarketState.Proposed,

    isInProposalVoting:
      state ===
      MarketState.DECVoting,

    isActive:
      state ===
      MarketState.Active,

    canRequestResolution,

    isInDECResolutionVoting:
      state ===
      MarketState.DECResolutionVoting,

    isAwaitingAdminVerification:
      state ===
      MarketState.AdminVerification,

    isOutcomeConfirmed:
      state ===
      MarketState.Confirmed,

    isFinalized:
      state ===
      MarketState.Finalized ||
      state ===
      MarketState.Resolved,

    isPendingResolution:
      [
        MarketState.Closed,
        MarketState.Unresolved,
        MarketState.ResolutionRequested,
        MarketState.DECResolutionVoting,
        MarketState.AdminVerification,
        MarketState.Confirmed
      ].includes(state),

    isResolved:
      state ===
      MarketState.Finalized ||
      state ===
      MarketState.Resolved
  }
}

export async function GET(request: Request) {
  if (
    !ethers.isAddress(
      CONTRACT_ADDRESS
    )
  ) {
    return NextResponse.json(
      {
        error:
          'NEXT_PUBLIC_CONTRACT_ADDRESS is missing or invalid',

        contractAddress:
          CONTRACT_ADDRESS
      },
      {
        status: 500
      }
    )
  }

  const skippedMarkets:
    SkippedMarket[] = []

  try {
    const accessToken =
      await getValidServiceToken()

    const requestUrl = new URL(request.url)
    const requestedAddress = requestUrl.searchParams.get('address')?.trim() || ''
    const walletAddress = ethers.isAddress(requestedAddress) ? requestedAddress : ''

    const totalResult =
      await readFunction(
        accessToken,
        'tm',
        [],
        1,
        'tm()'
      )

    const totalCount =
      bigintToNumber(
        totalResult[0]
      )

    const resolutionDeadlines =
      await loadResolutionVotingDeadlines(accessToken)

    const allMarkets: LoadedMarket[] = []

    /*
     * Market IDs begin at zero.
     */
    for (
      let marketId = 0;
      marketId < totalCount;
      marketId++
    ) {
      try {
        const market =
          await loadMarket(
            accessToken,
            marketId,
            resolutionDeadlines.get(marketId) || 0
          )

        allMarkets.push(market)
      } catch (error: unknown) {
        const message =
          getErrorMessage(error)

        console.error(
          `Unable to load market ${marketId}:`,
          message
        )

        skippedMarkets.push({
          marketId,
          error: message
        })
      }

      /*
       * Small pause before loading the next market.
       * This reduces the chance of another RPC 429.
       */
      if (
        marketId <
        totalCount - 1
      ) {
        await sleep(
          MARKET_DELAY_MS
        )
      }
    }

    const pendingProposals =
      allMarkets.filter(market =>
        [
          MarketState.Proposed,
          MarketState.DECVoting,
          MarketState.Approved
        ].includes(market.state)
      )

    let walletHistory = new Map<number, WalletPositionHistory>()
    if (walletAddress) {
      try {
        walletHistory = await loadWalletPositionHistory(accessToken, walletAddress)
      } catch (error) {
        console.warn('[Markets API] Wallet event history scan failed; using direct contract state fallback:', getErrorMessage(error))
      }

      for (const market of allMarkets) {
        try {
          const walletState = await loadWalletMarketState(accessToken, market, walletAddress)
          market.currentWalletProposalVote = walletState.proposalVote
          market.hasCurrentWalletVoted = walletState.proposalVote !== 0
          market.currentWalletResolutionVote = walletState.resolutionVote
          market.hasCurrentWalletVotedOnResolution = walletState.resolutionVote !== 0

          const hasAnyShares = walletState.shares.some(value => BigInt(value) > BigInt(0))
          const existing = walletHistory.get(market.id)
          if (existing) {
            existing.claimed = existing.claimed || walletState.hasClaimedWinnings
            for (let index = 0; index < walletState.shares.length; index++) {
              while (existing.shares.length <= index) existing.shares.push('0')
              if (BigInt(existing.shares[index] || '0') === BigInt(0)) {
                existing.shares[index] = walletState.shares[index]
              }
            }
            walletHistory.set(market.id, existing)
          } else if (walletState.hasPosition || hasAnyShares || walletState.hasClaimedWinnings) {
            walletHistory.set(market.id, {
              marketId: market.id,
              stakes: Array.from({ length: market.outcomeLabels.length }, () => '0'),
              shares: walletState.shares,
              totalStake: '0',
              claimed: walletState.hasClaimedWinnings,
              claimedPayout: '0'
            })
          }
        } catch (error) {
          console.warn(`[Markets API] Unable to load wallet state for market ${market.id}:`, getErrorMessage(error))
        }
      }
    }

    const walletPositions = Array.from(walletHistory.values()).map(history => {
      const market = allMarkets.find(item => item.id === history.marketId)
      const outcomeCount = market?.outcomeLabels?.length || Math.max(history.shares.length, history.stakes.length)
      const shares = Array.from({ length: outcomeCount }, (_, index) => history.shares[index] || '0')
      const stakes = Array.from({ length: outcomeCount }, (_, index) => history.stakes[index] || '0')
      let claimablePayout = '0'

      if (market && market.finalized && !history.claimed) {
        const winningOutcome = Number(market.confirmedOutcome)
        const userShares = BigInt(shares[winningOutcome] || '0')
        const pools = market.outcomePools.map((value: string) => BigInt(value))
        const totalPool = pools.reduce((sum: bigint, value: bigint) => sum + value, BigInt(0))
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

    const activeMarkets =
      allMarkets.filter(
        market =>
          market.state ===
          MarketState.Active
      )

    const unresolvedMarkets =
      allMarkets.filter(market =>
        [
          MarketState.Closed,
          MarketState.Unresolved,
          MarketState.ResolutionRequested,
          MarketState.DECResolutionVoting,
          MarketState.AdminVerification,
          MarketState.Confirmed
        ].includes(market.state)
      )

    const awaitingResolutionMarkets =
      allMarkets.filter(market =>
        market.canRequestResolution ||
        market.state === MarketState.ResolutionRequested
      )

    const resolutionVotingMarkets =
      allMarkets.filter(market =>
        market.state === MarketState.DECResolutionVoting
      )

    const adminVerificationMarkets =
      allMarkets.filter(market =>
        market.state === MarketState.AdminVerification
      )

    const confirmedMarkets =
      allMarkets.filter(market =>
        market.state === MarketState.Confirmed
      )

    const finalizedMarkets =
      allMarkets.filter(market =>
        market.state === MarketState.Finalized ||
        market.state === MarketState.Resolved
      )

    const resolvedMarkets =
      allMarkets.filter(market =>
        [
          MarketState.Finalized,
          MarketState.Resolved
        ].includes(market.state)
      )

    const rejectedMarkets =
      allMarkets.filter(
        market =>
          market.state ===
          MarketState.Rejected
      )

    const cancelledMarkets =
      allMarkets.filter(
        market =>
          market.state ===
          MarketState.Cancelled
      )

    return NextResponse.json({
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

        active:
          activeMarkets.length,

        pending:
          pendingProposals.length,

        unresolved:
          unresolvedMarkets.length,

        awaitingResolution:
          awaitingResolutionMarkets.length,

        resolutionVoting:
          resolutionVotingMarkets.length,

        adminVerification:
          adminVerificationMarkets.length,

        confirmed:
          confirmedMarkets.length,

        finalized:
          finalizedMarkets.length,

        resolved:
          resolvedMarkets.length,

        rejected:
          rejectedMarkets.length,

        cancelled:
          cancelledMarkets.length
      },

      diagnostics: {
        contractAddress:
          CONTRACT_ADDRESS,

        eventScanStartBlock:
          process.env.INTERPREDICT_DEPLOYMENT_BLOCK || '0x0',

        requestedWallet:
          walletAddress || null,

        totalMarketsReported:
          totalCount,

        marketsLoaded:
          allMarkets.length,

        marketsSkipped:
          skippedMarkets.length,

        skippedMarkets,

        rpcConfiguration: {
          maxAttempts:
            MAX_RPC_ATTEMPTS,

          initialRetryDelayMs:
            INITIAL_RETRY_DELAY_MS,

          marketDelayMs:
            MARKET_DELAY_MS,

          loadingMode:
            'sequential'
        }
      },

      fetchedAt:
        new Date().toISOString()
    })
  } catch (error: unknown) {
    const message =
      getErrorMessage(error)

    console.error(
      'GET /api/markets failed:',
      error
    )

    return NextResponse.json(
      {
        error: message,

        diagnostics: {
          contractAddress:
            CONTRACT_ADDRESS,

          marketsSkipped:
            skippedMarkets.length,

          skippedMarkets
        }
      },
      {
        status: 502
      }
    )
  }
}