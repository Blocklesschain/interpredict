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

/*
 * These function names and return values match the deployed
 * Solidity contract supplied by you.
 */
const iface = new ethers.Interface([
  // Total number of markets
  'function tm() view returns (uint256)',

  // Base market context: mapping(uint256 => MCtx) public mb
  'function mb(uint256) view returns (string q, string d, uint8 cat, string cc, string tu, uint8 o, address cr, uint256 et, string rc, string pe, string be)',

  // Proposal voting data: mapping(uint256 => MV) public mv
  'function mv(uint256) view returns (uint256 pvs, uint256 pvd, uint256 apv, uint256 rjv, bool pf, uint8 pd, uint256 pft, uint256 ra, address rr, bool rc)',

  // Resolution data: mapping(uint256 => MR) public mr
  'function mr(uint256) view returns (uint256 snap, uint256 quorum, uint256 trv, uint8 co, bool oc, bool fin)',

  // Market financial/activity data: mapping(uint256 => MF) public mf
  'function mf(uint256) view returns (uint256 tv, uint256 pc, uint256 cfe, uint256 cfc, uint256 csc, bool can, string cr, uint256 ct)',

  // Market state: mapping(uint256 => State) public ms
  'function ms(uint256) view returns (uint8)',

  // Outcome labels
  'function gL(uint256) view returns (string[])',

  // Outcome liquidity pools
  'function gP(uint256) view returns (uint256[])',

  // Outcome prices
  'function gPr2(uint256) view returns (uint256[])'
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

const ORIGIN_NAMES = [
  'Community',
  'Team'
]

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

async function rpcCall(
  accessToken: string,
  data: string,
  callName: string,
  id: number
): Promise<string> {
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

  const responseText = await response.text()

  let json: RpcResponse

  try {
    json = JSON.parse(responseText) as RpcResponse
  } catch {
    throw new Error(
      `${callName} returned invalid JSON: ${responseText.slice(0, 300)}`
    )
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
    let errorDetails = json.error.message || 'RPC call failed'

    if (json.error.data) {
      if (
        typeof json.error.data === 'object' &&
        json.error.data !== null &&
        'message' in json.error.data
      ) {
        errorDetails =
          String(
            (json.error.data as { message?: unknown }).message
          ) || errorDetails
      } else if (typeof json.error.data === 'string') {
        errorDetails = json.error.data
      }
    }

    throw new Error(`${callName} failed: ${errorDetails}`)
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
}

async function readFunction(
  accessToken: string,
  functionName: string,
  args: readonly unknown[],
  requestId: number,
  callName: string
): Promise<ethers.Result> {
  const data = iface.encodeFunctionData(
    functionName,
    args
  )

  const rawResult = await rpcCall(
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
  marketId: number
) {
  /*
   * The public mappings are independent, so they can safely
   * be loaded concurrently.
   */
  const [
    baseResult,
    votingResult,
    resolutionResult,
    financialResult,
    stateResult,
    labelsResult,
    poolsResult,
    pricesResult
  ] = await Promise.all([
    readFunction(
      accessToken,
      'mb',
      [marketId],
      marketId * 10 + 1,
      `mb(${marketId})`
    ),

    readFunction(
      accessToken,
      'mv',
      [marketId],
      marketId * 10 + 2,
      `mv(${marketId})`
    ),

    readFunction(
      accessToken,
      'mr',
      [marketId],
      marketId * 10 + 3,
      `mr(${marketId})`
    ),

    readFunction(
      accessToken,
      'mf',
      [marketId],
      marketId * 10 + 4,
      `mf(${marketId})`
    ),

    readFunction(
      accessToken,
      'ms',
      [marketId],
      marketId * 10 + 5,
      `ms(${marketId})`
    ),

    readFunction(
      accessToken,
      'gL',
      [marketId],
      marketId * 10 + 6,
      `gL(${marketId})`
    ),

    readFunction(
      accessToken,
      'gP',
      [marketId],
      marketId * 10 + 7,
      `gP(${marketId})`
    ),

    readFunction(
      accessToken,
      'gPr2',
      [marketId],
      marketId * 10 + 8,
      `gPr2(${marketId})`
    )
  ])

  const base = baseResult
  const voting = votingResult
  const resolution = resolutionResult
  const financial = financialResult

  const state = Number(stateResult[0])
  const category = Number(base.cat ?? base[2])
  const origin = Number(base.o ?? base[5])
  const proposalDecision = Number(
    voting.pd ?? voting[5]
  )

  const outcomeLabels = Array.from(
    labelsResult[0] as readonly string[]
  )

  const outcomePools = Array.from(
    poolsResult[0] as readonly bigint[]
  ).map(value => value.toString())

  const rawOutcomePrices = Array.from(
    pricesResult[0] as readonly bigint[]
  )

  /*
   * Solidity returns prices scaled by 1e18.
   *
   * outcomePricesRaw preserves the exact value.
   * outcomePrices provides a decimal number for UI display.
   */
  const outcomePricesRaw =
    rawOutcomePrices.map(value => value.toString())

  const outcomePrices =
    rawOutcomePrices.map(value =>
      Number(ethers.formatUnits(value, 18))
    )

  const marketEndTime = bigintToNumber(
    base.et ?? base[7]
  )

  const nowSec = Math.floor(Date.now() / 1000)

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

    proposalVotingStart: bigintToNumber(
      voting.pvs ?? voting[0]
    ),

    proposalVotingDeadline: bigintToNumber(
      voting.pvd ?? voting[1]
    ),

    approvalVotes: bigintToNumber(
      voting.apv ?? voting[2]
    ),

    rejectionVotes: bigintToNumber(
      voting.rjv ?? voting[3]
    ),

    proposalFinalized: Boolean(
      voting.pf ?? voting[4]
    ),

    proposalDecision,

    proposalDecisionName:
      PROPOSAL_DECISION_NAMES[
      proposalDecision
      ] || `Decision ${proposalDecision}`,

    proposalFinalizationTimestamp:
      bigintToNumber(
        voting.pft ?? voting[6]
      ),

    refundAmount: bigintToString(
      voting.ra ?? voting[7]
    ),

    refundRecipient: String(
      voting.rr ?? voting[8]
    ),

    refundCompleted: Boolean(
      voting.rc ?? voting[9]
    ),

    activeDECSnapshot: bigintToNumber(
      resolution.snap ?? resolution[0]
    ),

    resolutionQuorum: bigintToNumber(
      resolution.quorum ?? resolution[1]
    ),

    totalResolutionVotes: bigintToNumber(
      resolution.trv ?? resolution[2]
    ),

    confirmedOutcome: Number(
      resolution.co ?? resolution[3]
    ),

    /*
     * This contract does not store a separate
     * decSelectedOutcome value.
     */
    decSelectedOutcome: Number(
      resolution.co ?? resolution[3]
    ),

    outcomeConfirmed: Boolean(
      resolution.oc ?? resolution[4]
    ),

    finalized: Boolean(
      resolution.fin ?? resolution[5]
    ),

    /*
     * The current contract does not store a market
     * finalization timestamp inside MR.
     */
    finalizationTimestamp: 0,

    totalVolume: bigintToString(
      financial.tv ?? financial[0]
    ),

    participantCount: bigintToNumber(
      financial.pc ?? financial[1]
    ),

    creatorFeesEarned: bigintToString(
      financial.cfe ?? financial[2]
    ),

    creatorFeesClaimed: bigintToString(
      financial.cfc ?? financial[3]
    ),

    creatorSeedClaimed: bigintToString(
      financial.csc ?? financial[4]
    ),

    cancelled: Boolean(
      financial.can ?? financial[5]
    ),

    cancelReason: String(
      financial.cr ?? financial[6]
    ),

    cancelTimestamp: bigintToNumber(
      financial.ct ?? financial[7]
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
      state === MarketState.Proposed,

    isInProposalVoting:
      state === MarketState.DECVoting,

    isActive:
      state === MarketState.Active,

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
      state === MarketState.Finalized ||
      state === MarketState.Resolved
  }
}

export async function GET() {
  if (!ethers.isAddress(CONTRACT_ADDRESS)) {
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

  const skippedMarkets: SkippedMarket[] = []

  try {
    const accessToken =
      await getValidServiceToken()

    /*
     * The contract uses the public variable `tm`, not
     * a function called `totalMarkets`.
     */
    const totalResult =
      await readFunction(
        accessToken,
        'tm',
        [],
        1,
        'tm()'
      )

    const totalCount =
      bigintToNumber(totalResult[0])

    const allMarkets = []

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
            marketId
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
    }

    /*
     * These groups use the actual State enum positions
     * in the uploaded Solidity contract.
     */
    const pendingProposals =
      allMarkets.filter(market =>
        [
          MarketState.Proposed,
          MarketState.DECVoting,
          MarketState.Approved
        ].includes(market.state)
      )

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
      resolvedMarkets,
      rejectedMarkets,
      cancelledMarkets,

      counts: {
        all: allMarkets.length,
        active: activeMarkets.length,
        pending: pendingProposals.length,
        unresolved:
          unresolvedMarkets.length,
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

        totalMarketsReported:
          totalCount,

        marketsLoaded:
          allMarkets.length,

        marketsSkipped:
          skippedMarkets.length,

        skippedMarkets
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