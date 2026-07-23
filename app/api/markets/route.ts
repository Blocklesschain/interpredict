import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getValidServiceToken } from '@/lib/interlinkServiceAuth'
import {
  categoryLabel,
  decodeMarket,
  decodeMarketOutcomes,
  decodeMarketPricing,
  INTERPREDICT_ABI,
  isActiveTradeMarket,
  isInactiveTradeMarket,
  MARKET_CATEGORIES,
  MARKET_STATES,
  type ProtocolMarket,
} from '@/lib/interpredictProtocol'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
const RPC_URL = process.env.INTERLINK_RPC_URL || 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'
const iface = new ethers.Interface(INTERPREDICT_ABI)
const tokenIface = new ethers.Interface(['function symbol() view returns (string)'])
const CACHE_TTL_MS = 10_000
const CACHE_ENTRIES = 32
const DEFAULT_PAGE_SIZE = boundedEnvironmentInteger('MARKETS_PAGE_SIZE', 24, 1, 50)
const MAX_PAGE_SIZE = boundedEnvironmentInteger('MARKETS_MAX_PAGE_SIZE', 50, 1, 50)
const RPC_CONCURRENCY = boundedEnvironmentInteger('MARKETS_RPC_CONCURRENCY', 6, 1, 12)
const RPC_TIMEOUT_MS = boundedEnvironmentInteger('MARKETS_RPC_TIMEOUT_MS', 12_000, 1_000, 30_000)

type IndexedMarket = ProtocolMarket & {
  resolutionMembershipEpoch: number
  adminVerificationDeadline: number
  resolutionRequester: string
  participantCount: number
  tradeCount: number
  marketPaused: boolean
}

type CacheEntry = { data: unknown; expiresAt: number }
const pageCache = new Map<string, CacheEntry>()
let rpcRequestId = 1

function boundedEnvironmentInteger(name: string, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(process.env[name] || fallback)
  return Number.isSafeInteger(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback
}

function parseNonnegativeInteger(value: string | null, fallback: number, name: string) {
  if (value === null || value === '') return fallback
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be a nonnegative integer`)
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) throw new Error(`${name} exceeds the safe integer range`)
  return parsed
}

function hasFunction(name: string) {
  try {
    return Boolean(iface.getFunction(name))
  } catch {
    return false
  }
}

function functionReturnsBytes(name: string) {
  const fragment = iface.getFunction(name)
  return fragment?.outputs.length === 1 && fragment.outputs[0].type === 'bytes'
}

function nextRpcId() {
  const id = rpcRequestId
  rpcRequestId = rpcRequestId >= Number.MAX_SAFE_INTEGER ? 1 : rpcRequestId + 1
  return id
}

async function rpcCall(token: string, data: string, to = CONTRACT_ADDRESS) {
  if (!to || !ethers.isAddress(to)) {
    throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS must be configured for the V2 deployment')
  }
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: nextRpcId(),
      method: 'eth_call',
      params: [{ to, data }, 'latest'],
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
  })
  const json = await response.json()
  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `RPC request failed (${response.status})`)
  }
  if (typeof json.result !== 'string') throw new Error('RPC response did not contain encoded call data')
  return json.result
}

async function latestChainBlock(token: string) {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: nextRpcId(),
      method: 'eth_getBlockByNumber',
      params: ['latest', false],
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
  })
  const json = await response.json()
  if (!response.ok || json.error || !json.result) {
    throw new Error(json.error?.message || `Latest-block RPC request failed (${response.status})`)
  }
  const number = Number(BigInt(json.result.number))
  const timestamp = Number(BigInt(json.result.timestamp))
  if (!Number.isSafeInteger(number) || !Number.isSafeInteger(timestamp)) {
    throw new Error('Latest block metadata exceeds the API safe integer range')
  }
  return { number, timestamp }
}

async function readFunction(token: string, name: string, args: unknown[] = []) {
  const raw = await rpcCall(token, iface.encodeFunctionData(name, args))
  return iface.decodeFunctionResult(name, raw)
}

async function loadSettlementTokenMetadata(token: string) {
  const [addressResult, decimalsResult, proposalFeeResult, proposalSeedResult, minimumTradeResult] =
    await Promise.all([
      readFunction(token, 'settlementToken'),
      readFunction(token, 'tokenDecimals'),
      readFunction(token, 'proposalFee'),
      readFunction(token, 'proposalSeed'),
      readFunction(token, 'minimumTrade'),
    ])
  const address = ethers.getAddress(String(addressResult[0]))
  let symbol = process.env.NEXT_PUBLIC_SETTLEMENT_TOKEN_SYMBOL || 'tITL'
  try {
    const raw = await rpcCall(token, tokenIface.encodeFunctionData('symbol'), address)
    symbol = String(tokenIface.decodeFunctionResult('symbol', raw)[0])
  } catch {
    // Symbol is display metadata; the address and contract-canonical decimals
    // remain authoritative when a non-standard token omits symbol().
  }
  return {
    address,
    symbol,
    decimals: Number(decimalsResult[0]),
    proposalFee: BigInt(proposalFeeResult[0]).toString(),
    proposalSeed: BigInt(proposalSeedResult[0]).toString(),
    minimumTrade: BigInt(minimumTradeResult[0]).toString(),
  }
}

function firstDecodedValue(decoded: ethers.Result) {
  return decoded.length === 1 ? decoded[0] : decoded
}

async function loadMarket(token: string, id: number): Promise<IndexedMarket> {
  const optionalReads: Array<Promise<ethers.Result>> = []
  const optionalNames: string[] = []
  for (const name of [
    'marketPaused',
    'participantCount',
    'tradeCount',
  ]) {
    if (hasFunction(name)) {
      optionalNames.push(name)
      optionalReads.push(readFunction(token, name, [id]))
    }
  }

  const [marketResult, outcomesResult, pricingResult, ...optionalResults] = await Promise.all([
    readFunction(token, 'getMarket', [id]),
    readFunction(token, 'getMarketOutcomes', [id]),
    readFunction(token, 'getMarketPricing', [id]),
    ...optionalReads,
  ])
  const encodedMarket = marketResult[0]
  if (typeof encodedMarket !== 'string' || !ethers.isHexString(encodedMarket)) {
    throw new Error('getMarket ABI must return canonical encoded Market bytes')
  }
  const market = decodeMarket(encodedMarket)
  const outcomesValue = functionReturnsBytes('getMarketOutcomes')
    ? firstDecodedValue(outcomesResult)
    : outcomesResult
  const pricingValue = firstDecodedValue(pricingResult)
  const outcomes = decodeMarketOutcomes(outcomesValue)
  const pricing = decodeMarketPricing(pricingValue)
  const optional = Object.fromEntries(
    optionalNames.map((name, index) => [name, optionalResults[index]?.[0]]),
  ) as Record<string, unknown>
  const creatorFeesEarned = BigInt(market.creatorFeesEarned)
  const creatorFeesClaimed = BigInt(market.creatorFeesClaimed)

  return {
    ...market,
    resolutionMembershipEpoch: market.resolutionMembershipEpoch ?? 0,
    adminVerificationDeadline: market.adminVerificationDeadline ?? 0,
    resolutionQuorum: market.resolutionQuorum,
    resolutionRequester: market.resolutionRequester,
    creatorFeesClaimable: (creatorFeesEarned - creatorFeesClaimed).toString(),
    outcomes,
    balances: pricing.balances,
    shares: pricing.shares,
    prices: pricing.prices,
    marketPaused: Boolean(optional.marketPaused),
    participantCount: Number(optional.participantCount ?? 0),
    tradeCount: Number(optional.tradeCount ?? 0),
  }
}

async function mapBounded<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<Array<PromiseSettledResult<R>>> {
  const results = new Array<PromiseSettledResult<R>>(values.length)
  let next = 0
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (next < values.length) {
      const index = next++
      try {
        results[index] = { status: 'fulfilled', value: await mapper(values[index]) }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  })
  await Promise.all(workers)
  return results
}

function normalizeFilter(value: string) {
  return value.trim().toLowerCase().replaceAll('-', '').replaceAll(' ', '')
}

function readCache(key: string) {
  const entry = pageCache.get(key)
  if (!entry || Date.now() >= entry.expiresAt) {
    pageCache.delete(key)
    return undefined
  }
  pageCache.delete(key)
  pageCache.set(key, entry)
  return entry.data
}

function writeCache(key: string, data: unknown) {
  pageCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
  while (pageCache.size > CACHE_ENTRIES) {
    const oldest = pageCache.keys().next().value
    if (oldest === undefined) break
    pageCache.delete(oldest)
  }
}

export async function GET(request: NextRequest) {
  try {
    const cursor = parseNonnegativeInteger(request.nextUrl.searchParams.get('cursor'), 0, 'cursor')
    const exactIdParameter = request.nextUrl.searchParams.get('id')
    const exactId = exactIdParameter === null
      ? undefined
      : parseNonnegativeInteger(exactIdParameter, 0, 'id')
    const order = (request.nextUrl.searchParams.get('order') || 'desc').toLowerCase()
    if (order !== 'asc' && order !== 'desc') {
      return NextResponse.json({ error: 'order must be asc or desc' }, { status: 400 })
    }
    const requestedLimit = parseNonnegativeInteger(
      request.nextUrl.searchParams.get('limit'),
      DEFAULT_PAGE_SIZE,
      'limit',
    )
    if (requestedLimit < 1 || requestedLimit > MAX_PAGE_SIZE) {
      return NextResponse.json(
        { error: `limit must be between 1 and ${MAX_PAGE_SIZE}` },
        { status: 400 },
      )
    }
    const creatorQuery = request.nextUrl.searchParams.get('creator')?.trim()
    if (creatorQuery && !ethers.isAddress(creatorQuery)) {
      return NextResponse.json({ error: 'creator must be a valid address' }, { status: 400 })
    }
    const creator = creatorQuery?.toLowerCase()
    const state = request.nextUrl.searchParams.get('state')
    const category = request.nextUrl.searchParams.get('category')
    const cacheKey = JSON.stringify({
      cursor,
      limit: requestedLimit,
      exactId,
      order,
      creator,
      state,
      category,
    })
    const cached = readCache(cacheKey)
    if (cached) return NextResponse.json(cached, { headers: { 'X-InterPredict-Cache': 'HIT' } })

    const token = await getValidServiceToken()
    const [countResult, pauseResult, chainBlock, settlementToken] = await Promise.all([
      readFunction(token, 'totalMarkets'),
      hasFunction('paused') ? readFunction(token, 'paused') : Promise.resolve(undefined),
      latestChainBlock(token),
      loadSettlementTokenMetadata(token),
    ])
    const totalRaw = BigInt(countResult[0])
    if (totalRaw > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error('totalMarkets exceeds the API safe integer range')
    }
    const totalMarkets = Number(totalRaw)
    if (exactId !== undefined && exactId >= totalMarkets) {
      return NextResponse.json({ error: `market ${exactId} does not exist` }, { status: 404 })
    }
    // `cursor` is an opaque offset into the requested order, not a market ID.
    // Newest-first is the default so bounded clients see newly created markets
    // without scanning the full historical range.
    const start = exactId === undefined ? Math.min(cursor, totalMarkets) : 0
    const end = exactId === undefined ? Math.min(start + requestedLimit, totalMarkets) : 1
    const ids = exactId === undefined
      ? Array.from(
          { length: end - start },
          (_, index) => order === 'desc'
            ? totalMarkets - 1 - (start + index)
            : start + index,
        )
      : [exactId]
    const settled = await mapBounded(ids, RPC_CONCURRENCY, id => loadMarket(token, id))
    const loaded = settled
      .filter((result): result is PromiseFulfilledResult<IndexedMarket> => result.status === 'fulfilled')
      .map(result => result.value)
    const failedMarkets = settled.flatMap((result, index) => result.status === 'rejected'
      ? [{
          marketId: ids[index],
          error: result.reason instanceof Error ? result.reason.message.slice(0, 240) : 'market read failed',
        }]
      : [])
    if (ids.length > 0 && loaded.length === 0) {
      throw new Error(`Every market read failed for cursor ${start}`)
    }

    const markets = loaded.filter(market =>
      (!creator || market.creator.toLowerCase() === creator)
      && (!state || normalizeFilter(MARKET_STATES[market.state] ?? '') === normalizeFilter(state))
      && (
        !category
        || normalizeFilter(MARKET_CATEGORIES[market.category] ?? '') === normalizeFilter(category)
        || normalizeFilter(categoryLabel(market)) === normalizeFilter(category)
      ))
    const blockTimestamp = chainBlock.timestamp
    const protocolPaused = Boolean(pauseResult?.[0])
    const activeMarkets = markets.filter(
      market => !protocolPaused && !market.marketPaused && isActiveTradeMarket(market, blockTimestamp),
    )
    const pausedMarkets = markets.filter(
      market => market.state === 5 && (protocolPaused || market.marketPaused),
    )
    const inactiveMarkets = markets.filter(market => isInactiveTradeMarket(market, blockTimestamp))
    const payload = {
      cursor: exactId === undefined ? String(start) : null,
      limit: requestedLimit,
      nextCursor: exactId === undefined && end < totalMarkets ? String(end) : null,
      order,
      paginationMode: exactId === undefined ? 'offset' : 'exact-id',
      requestedMarketId: exactId ?? null,
      totalMarkets,
      scanned: ids.length,
      failedMarkets,
      degraded: failedMarkets.length > 0,
      protocolPaused,
      blockNumber: chainBlock.number,
      blockTimestamp: chainBlock.timestamp,
      settlementToken,
      markets,
      activeMarkets,
      pausedMarkets,
      inactiveMarkets,
      pendingProposals: markets.filter(market => market.state === 1),
      categories: [...new Set(
        markets
          .filter(market =>
            activeMarkets.includes(market)
            || pausedMarkets.includes(market)
            || inactiveMarkets.includes(market))
          .map(categoryLabel),
      )],
      fetchedAt: new Date().toISOString(),
    }
    writeCache(cacheKey, payload)
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'private, max-age=0, must-revalidate',
        'X-InterPredict-Cache': 'MISS',
      },
    })
  } catch (error) {
    console.error('GET /api/markets failed:', error instanceof Error ? error.message : 'unknown error')
    const message = error instanceof Error ? error.message : 'Failed to fetch markets'
    const status = /cursor|limit|safe integer/.test(message) ? 400 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
