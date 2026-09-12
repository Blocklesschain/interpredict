// Incremental blockchain event indexer with targeted market reconciliation.

import 'server-only'
import { ethers } from 'ethers'
import { getSupabase } from '@/lib/supabase'
import { getIndexerConfig } from '@/lib/config'
import { getValidServiceToken } from '@/lib/interlinkServiceAuth'
import contractABI from '@/lib/interpredictAbi.json'

interface SyncCheckpoint {
  chain_id: string
  contract_address: string
  last_processed_block: number
  last_processed_block_hash: string | null
  last_successful_sync_at: string | null
  sync_status: string
  last_error: string | null
}

interface SyncResult {
  startBlock: number
  endBlock: number
  eventsProcessed: number
  recordsUpserted: number
  retryCount: number
  durationMs: number
  checkpoint: number
}

const iface = new ethers.Interface(contractABI)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withJitter(baseMs: number): number {
  return Math.floor(baseMs + Math.random() * baseMs)
}

async function rpcCall(
  url: string,
  token: string,
  method: string,
  params: unknown[],
  maxRetries: number,
  backoffBaseMs: number,
  backoffMaxMs: number,
): Promise<unknown> {
  let lastError: Error | null = null
  let delay = backoffBaseMs

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: attempt, method, params }),
        signal: AbortSignal.timeout(10_000),
      })

      if (response.status === 429) {
        throw new Error(`RPC rate limited (429)`)
      }
      if (!response.ok) {
        throw new Error(`RPC HTTP ${response.status}`)
      }

      const json = await response.json()
      if (json.error) {
        throw new Error(`RPC error: ${json.error.message}`)
      }
      return json.result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < maxRetries) {
        await sleep(delay)
        delay = Math.min(delay * 2, backoffMaxMs)
        delay = withJitter(delay)
      }
    }
  }

  throw lastError ?? new Error('RPC call failed')
}

async function readCheckpoint(
  chainId: string,
  contractAddress: string,
): Promise<SyncCheckpoint | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('sync_checkpoints')
    .select('*')
    .eq('chain_id', chainId)
    .eq('contract_address', contractAddress)
    .maybeSingle()

  if (error) throw error
  return data as SyncCheckpoint | null
}

async function writeCheckpoint(checkpoint: SyncCheckpoint): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('sync_checkpoints')
    .upsert(checkpoint, { onConflict: 'chain_id,contract_address' })
  if (error) throw error
}

function normalizeAddress(addr: string): string {
  return addr.toLowerCase()
}

interface RawLog {
  blockNumber: string
  transactionHash: string
  logIndex: string
  blockHash: string
  data: string
  topics: string[]
}

async function upsertEvent(
  supabase: ReturnType<typeof getSupabase>,
  config: ReturnType<typeof getIndexerConfig>,
  parsed: ethers.LogDescription,
  rawLog: RawLog,
): Promise<number> {
  const blockNumber = Number(rawLog.blockNumber)
  const txHash = rawLog.transactionHash
  const logIndex = Number(rawLog.logIndex)
  const blockHash = rawLog.blockHash

  const provenance = {
    chain_id: config.chainId,
    contract_address: config.contractAddress,
    block_number: blockNumber,
    block_hash: blockHash,
    transaction_hash: txHash,
    log_index: logIndex,
    indexed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  let records = 0

  switch (parsed.name) {
    case 'MarketProposed':
    case 'MarketDeployed': {
      const args = parsed.args
      const id = Number(args.id)

      const { syncMarketById } = await import('./syncMarket')
      await syncMarketById(id)
      records++
      break
    }

    case 'MarketActivated':
    case 'MarketApproved':
    case 'MarketRejected':
    case 'MarketCancelled':
    case 'MarketFinalized': {
      const args = parsed.args
      const id = Number(args.id)

      const { syncMarketById } = await import('./syncMarket')
      await syncMarketById(id)
      records++
      break
    }

    case 'ParticipationRecorded': {
      const args = parsed.args
      const id = Number(args.id)
      const participant = normalizeAddress(String(args.participant))
      const { error } = await supabase.from('participations').upsert(
        {
          market_id: id,
          participant,
          outcome_index: Number(args.outcomeIndex),
          gross: String(args.gross),
          net: String(args.net),
          shares: String(args.sharesOut),
          fee: String(args.fee),
          claimed: false,
          ...provenance,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'market_id,participant,outcome_index' },
      )
      if (error) throw error
      records++

      const { syncMarketById } = await import('./syncMarket')
      await syncMarketById(id)
      records++
      break
    }

    case 'ProposalVoteCast': {
      const args = parsed.args
      const { error } = await supabase.from('proposal_votes').upsert(
        {
          market_id: Number(args.id),
          voter: normalizeAddress(String(args.voter)),
          vote: Number(args.vote),
          ...provenance,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'market_id,voter' },
      )
      if (error) throw error
      records++
      break
    }

    case 'ResolutionRequested': {
      const args = parsed.args
      const id = Number(args.id)
      const { error } = await supabase.from('resolution_requests').upsert(
        {
          market_id: id,
          requester: normalizeAddress(String(args.requester)),
          deadline: Number(args.deadline),
          ...provenance,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'market_id' },
      )
      if (error) throw error
      records++
      const { syncMarketById } = await import('./syncMarket')
      await syncMarketById(id)
      records++
      break
    }

    case 'ResolutionVoteCast': {
      const args = parsed.args
      const { error } = await supabase.from('resolution_votes').upsert(
        {
          market_id: Number(args.id),
          voter: normalizeAddress(String(args.voter)),
          outcome_index: Number(args.outcomeIndex),
          ...provenance,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'market_id,voter' },
      )
      if (error) throw error
      records++

      const { syncMarketById } = await import('./syncMarket')
      await syncMarketById(Number(args.id))
      records++
      break
    }

    case 'ResolutionFinalized': {
      const args = parsed.args
      const id = Number(args.id)
      const quorumReached = Boolean(args.quorumReached)
      const tied = Boolean(args.tied)
      const outcomeAvailable = Boolean(args.outcomeAvailable)
      const suggestedOutcome = outcomeAvailable ? Number(args.suggestedOutcome) : null

      const { error } = await supabase.from('market_resolutions').upsert(
        {
          market_id: id,
          quorum_reached: quorumReached,
          tied,
          dec_outcome_available: outcomeAvailable,
          dec_suggested_outcome: suggestedOutcome,
          ...provenance,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'market_id' },
      )
      if (error) throw error
      records++

      const { syncMarketById } = await import('./syncMarket')
      await syncMarketById(id)
      records++
      break
    }

    case 'OutcomeConfirmed': {
      const args = parsed.args
      const { error } = await supabase
        .from('markets')
        .update({ confirmed_outcome: Number(args.outcomeIndex), ...provenance })
        .eq('id', Number(args.id))
      if (error) throw error
      records++

      const { syncMarketById } = await import('./syncMarket')
      await syncMarketById(Number(args.id))
      records++
      break
    }

    case 'WinningsClaimed': {
      const args = parsed.args
      const { error } = await supabase
        .from('participations')
        .update({ claimed: true, ...provenance })
        .eq('market_id', Number(args.id))
        .eq('participant', normalizeAddress(String(args.claimant)))
      if (error) throw error
      records++
      break
    }

    case 'DECMemberJoined':
    case 'DECMemberRemoved':
    case 'DECMemberActivated':
    case 'DECMemberSuspended': {
      const args = parsed.args
      const member = normalizeAddress(String(args.member))
      const active =
        parsed.name === 'DECMemberJoined' ||
        parsed.name === 'DECMemberActivated'
      const { error } = await supabase.from('dec_members').upsert(
        {
          address: member,
          active,
          ...provenance,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'address' },
      )
      if (error) throw error
      records++
      break
    }

    case 'ReputationUpdated': {
      const args = parsed.args
      const { error } = await supabase
        .from('dec_members')
        .update({ reputation: Number(args.reputation), ...provenance })
        .eq('address', normalizeAddress(String(args.member)))
      if (error) throw error
      records++
      break
    }

    default:

      break
  }

  return records
}

export async function syncOnce(): Promise<SyncResult> {
  const config = getIndexerConfig()
  const supabase = getSupabase()
  const startedAt = Date.now()

  const token = await getValidServiceToken()

  let checkpoint = await readCheckpoint(config.chainId, config.contractAddress)
  const lastProcessed = checkpoint?.last_processed_block ?? config.startBlock - 1

  const latestHex = (await rpcCall(
    config.rpcUrl,
    token,
    'eth_blockNumber',
    [],
    config.maxRetries,
    config.backoffBaseMs,
    config.backoffMaxMs,
  )) as string
  const latest = Number(latestHex)
  const safeBlock = latest - config.confirmationDepth

  if (safeBlock <= lastProcessed) {
    return {
      startBlock: lastProcessed,
      endBlock: lastProcessed,
      eventsProcessed: 0,
      recordsUpserted: 0,
      retryCount: 0,
      durationMs: Date.now() - startedAt,
      checkpoint: lastProcessed,
    }
  }

  const startBlock = lastProcessed + 1
  let endBlock = Math.min(startBlock + config.batchSize - 1, safeBlock)

  const logs = (await rpcCall(
    config.rpcUrl,
    token,
    'eth_getLogs',
    [
      {
        fromBlock: `0x${startBlock.toString(16)}`,
        toBlock: `0x${endBlock.toString(16)}`,
        address: config.contractAddress,
      },
    ],
    config.maxRetries,
    config.backoffBaseMs,
    config.backoffMaxMs,
  )) as RawLog[]

  let eventsProcessed = 0
  let recordsUpserted = 0
  let retryCount = 0

  for (const rawLog of logs) {
    try {
      const parsed = iface.parseLog({
        topics: rawLog.topics,
        data: rawLog.data,
      })
      if (!parsed) continue
      eventsProcessed++
      recordsUpserted += await upsertEvent(supabase, config, parsed, rawLog)
    } catch (error) {
      retryCount++
      const message = error instanceof Error ? error.message : String(error)
      await supabase.from('sync_failures').insert({
        block_number: Number(rawLog.blockNumber),
        transaction_hash: rawLog.transactionHash,
        log_index: Number(rawLog.logIndex),
        error: message,
        retry_count: 1,
      })
      console.error(`[indexer] Failed to process log: ${message}`)

      endBlock = Math.min(endBlock, Number(rawLog.blockNumber) - 1)
    }
  }

  const newCheckpoint: SyncCheckpoint = {
    chain_id: config.chainId,
    contract_address: config.contractAddress,
    last_processed_block: endBlock,
    last_processed_block_hash: null,
    last_successful_sync_at: new Date().toISOString(),
    sync_status: 'healthy',
    last_error: null,
  }
  await writeCheckpoint(newCheckpoint)

  return {
    startBlock,
    endBlock,
    eventsProcessed,
    recordsUpserted,
    retryCount,
    durationMs: Date.now() - startedAt,
    checkpoint: endBlock,
  }
}
