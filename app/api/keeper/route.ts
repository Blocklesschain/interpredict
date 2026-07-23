import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getValidServiceToken } from '@/lib/interlinkServiceAuth'
import { decodeMarket, INTERPREDICT_ABI } from '@/lib/interpredictProtocol'
import { deterministicCursor, selectKeeperAction } from '@/lib/keeperPolicy'

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
const rpcURL = process.env.INTERLINK_RPC_URL || 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'
const privateKey = process.env.SERVICE_WALLET_PRIVATE_KEY
const cronSecret = process.env.CRON_SECRET
const expectedChainId = BigInt(process.env.INTERLINK_CHAIN_ID || '19042026')
const defaultBatchSize = environmentInteger('KEEPER_BATCH_SIZE', 25, 1, 50)
const maxBatchSize = environmentInteger('KEEPER_MAX_BATCH_SIZE', 50, 1, 100)
const maxTransactions = environmentInteger('KEEPER_MAX_TRANSACTIONS', 10, 1, 25)
const timeBudgetMs = environmentInteger('KEEPER_TIME_BUDGET_MS', 45_000, 5_000, 55_000)
const confirmations = environmentInteger('KEEPER_CONFIRMATIONS', 1, 1, 10)
const settlementsPerMarket = environmentInteger('KEEPER_SETTLEMENTS_PER_MARKET', 5, 0, 25)
const settlementScanSize = environmentInteger('KEEPER_SETTLEMENT_SCAN_SIZE', 25, 1, 100)
const rpcTimeoutMs = environmentInteger('KEEPER_RPC_TIMEOUT_MS', 15_000, 1_000, 50_000)
let keeperRunning = false

type KeeperResult = {
  marketId: number
  action: string
  voter?: string
  txHash?: string
  error?: string
}

type SettlementScan = {
  marketId: number
  totalMembers: number
  cursor: number
  nextCursor: number
  scanned: number
  transactionAttempts: number
}

function environmentInteger(name: string, fallback: number, minimum: number, maximum: number) {
  const value = Number(process.env[name] || fallback)
  return Number.isSafeInteger(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback
}

function queryInteger(url: URL, name: string, fallback: number, maximum: number) {
  const raw = url.searchParams.get(name)
  if (raw === null) return fallback
  if (!/^\d+$/.test(raw)) throw new Error(`${name} must be a nonnegative integer`)
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value > maximum) throw new Error(`${name} is out of range`)
  return value
}

function hasFunction(contract: ethers.Contract, name: string) {
  try {
    return Boolean(contract.interface.getFunction(name))
  } catch {
    return false
  }
}

async function waitFor(transaction: ethers.ContractTransactionResponse) {
  const receipt = await transaction.wait(confirmations)
  if (!receipt || receipt.status !== 1) throw new Error(`transaction ${transaction.hash} failed`)
  return receipt
}

async function settleDiscoverableParticipation(
  contract: ethers.Contract,
  marketId: number,
  deadline: number,
  blockTimestamp: number,
  remainingTransactions: () => number,
  results: KeeperResult[],
  settlementScans: SettlementScan[],
) {
  if (
    settlementsPerMarket === 0
    || remainingTransactions() <= 0
    || Date.now() >= deadline
    || !hasFunction(contract, 'getResolutionSnapshotMembers')
    || !hasFunction(contract, 'settleResolutionParticipation')
    || !hasFunction(contract, 'resolutionReputationSettled')
    || !hasFunction(contract, 'resolutionVotes')
  ) return 0

  const members = Array.from(await contract.getResolutionSnapshotMembers(marketId) as string[])
  if (members.length === 0) {
    settlementScans.push({
      marketId,
      totalMembers: 0,
      cursor: 0,
      nextCursor: 0,
      scanned: 0,
      transactionAttempts: 0,
    })
    return 0
  }

  // Rotate the bounded inspection window independently for every market. A
  // fixed prefix can permanently starve later voters once the prefix contains
  // only non-voters or already-settled members.
  const cycle = Math.floor(blockTimestamp / 300)
  // Advancing one member per cycle (with a per-market phase) guarantees that
  // even a repeatedly reverting voter at the front of a window cannot starve
  // all later voters forever.
  const cursor = (cycle + marketId) % members.length
  const scanCount = Math.min(settlementScanSize, members.length)
  let attempts = 0
  let scanned = 0
  for (let offset = 0; offset < scanCount; offset += 1) {
    const voter = members[(cursor + offset) % members.length]
    if (remainingTransactions() - attempts <= 0 || Date.now() >= deadline) break
    scanned += 1
    const [vote, settled] = await Promise.all([
      contract.resolutionVotes(marketId, voter),
      contract.resolutionReputationSettled(marketId, voter),
    ])
    if (BigInt(vote) === 0n || Boolean(settled)) continue
    attempts += 1
    try {
      const transaction = await contract.settleResolutionParticipation(marketId, voter)
      const receipt = await waitFor(transaction)
      results.push({
        marketId,
        voter,
        action: 'settleResolutionParticipation',
        txHash: receipt.hash,
      })
    } catch (error) {
      results.push({
        marketId,
        voter,
        action: 'settleResolutionParticipation',
        error: error instanceof Error ? error.message.slice(0, 300) : 'transaction failed',
      })
    }
    if (attempts >= settlementsPerMarket) break
  }
  settlementScans.push({
    marketId,
    totalMembers: members.length,
    cursor,
    nextCursor: (cursor + 1) % members.length,
    scanned,
    transactionAttempts: attempts,
  })
  return attempts
}

export async function GET(request: Request) {
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (keeperRunning) {
    return NextResponse.json({ error: 'Keeper invocation already running on this instance' }, { status: 409 })
  }
  if (!privateKey || !contractAddress || !ethers.isAddress(contractAddress)) {
    return NextResponse.json({ error: 'Keeper V2 configuration incomplete' }, { status: 503 })
  }

  keeperRunning = true
  const startedAt = Date.now()
  const deadline = startedAt + timeBudgetMs
  const results: KeeperResult[] = []
  const settlementScans: SettlementScan[] = []
  try {
    const url = new URL(request.url)
    const requestedLimit = queryInteger(url, 'limit', defaultBatchSize, maxBatchSize)
    if (requestedLimit < 1) throw new Error('limit must be positive')

    const token = await getValidServiceToken()
    const connection = new ethers.FetchRequest(rpcURL)
    connection.setHeader('Authorization', `Bearer ${token}`)
    connection.timeout = rpcTimeoutMs
    const provider = new ethers.JsonRpcProvider(connection, undefined, { staticNetwork: true })
    const [network, latestBlock, code] = await Promise.all([
      provider.getNetwork(),
      provider.getBlock('latest'),
      provider.getCode(contractAddress),
    ])
    if (network.chainId !== expectedChainId) {
      throw new Error(`Keeper connected to chain ${network.chainId}; expected ${expectedChainId}`)
    }
    if (!latestBlock) throw new Error('Latest block is unavailable')
    if (code === '0x') throw new Error('Configured InterPredict address has no code')

    const signer = new ethers.Wallet(privateKey, provider)
    const contract = new ethers.Contract(contractAddress, INTERPREDICT_ABI, signer)
    const totalRaw = BigInt(await contract.totalMarkets())
    if (totalRaw > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('totalMarkets exceeds keeper range')
    const totalMarkets = Number(totalRaw)
    const explicitCursor = url.searchParams.has('cursor')
    const cursor = queryInteger(
      url,
      'cursor',
      deterministicCursor(totalMarkets, requestedLimit, latestBlock.timestamp),
      Math.max(0, totalMarkets),
    )
    const start = Math.min(cursor, totalMarkets)
    const end = Math.min(start + requestedLimit, totalMarkets)
    const protocolPaused = hasFunction(contract, 'paused') ? Boolean(await contract.paused()) : false
    let transactionCount = 0
    let scanned = 0

    for (let id = start; id < end; id += 1) {
      if (Date.now() >= deadline) break
      scanned += 1
      try {
        const [encodedMarket, marketPaused] = await Promise.all([
          contract.getMarket(id),
          hasFunction(contract, 'marketPaused') ? contract.marketPaused(id) : false,
        ])
        if (typeof encodedMarket !== 'string' || !ethers.isHexString(encodedMarket)) {
          throw new Error('getMarket must return canonical encoded Market bytes')
        }
        const market = decodeMarket(encodedMarket)
        const action = selectKeeperAction(market, {
          blockTimestamp: latestBlock.timestamp,
          protocolPaused,
          marketPaused: Boolean(marketPaused),
        })
        if (action && transactionCount < maxTransactions) {
          transactionCount += 1
          try {
            const transaction = await contract[action](id)
            const receipt = await waitFor(transaction)
            results.push({ marketId: id, action, txHash: receipt.hash })
          } catch (error) {
            results.push({
              marketId: id,
              action,
              error: error instanceof Error ? error.message.slice(0, 300) : 'transaction failed',
            })
          }
        } else if (market.state === 13) {
          transactionCount += await settleDiscoverableParticipation(
            contract,
            id,
            deadline,
            latestBlock.timestamp,
            () => maxTransactions - transactionCount,
            results,
            settlementScans,
          )
        }
      } catch (error) {
        results.push({
          marketId: id,
          action: 'inspect',
          error: error instanceof Error ? error.message.slice(0, 300) : 'market inspection failed',
        })
      }
      if (transactionCount >= maxTransactions) break
    }

    const nextCursor = end >= totalMarkets ? 0 : end
    return NextResponse.json({
      cursor: start,
      limit: requestedLimit,
      nextCursor,
      totalMarkets,
      scanned,
      transactionAttempts: transactionCount,
      attempted: results.length,
      succeeded: results.filter(result => result.txHash).length,
      failed: results.filter(result => result.error).length,
      protocolPaused,
      blockNumber: latestBlock.number,
      blockTimestamp: latestBlock.timestamp,
      timeBudgetExceeded: Date.now() >= deadline,
      cursorMode: explicitCursor ? 'explicit' : 'deterministic-cycle',
      settlementScans,
      results,
    })
  } catch (error) {
    console.error('GET /api/keeper failed:', error instanceof Error ? error.message : 'unknown error')
    const message = error instanceof Error ? error.message : 'Keeper failed'
    const status = /cursor|limit/.test(message) ? 400 : 502
    return NextResponse.json({ error: message }, { status })
  } finally {
    keeperRunning = false
  }
}
