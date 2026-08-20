// Targeted single-market reconciliation from the V2 contract.

import 'server-only'
import { ethers } from 'ethers'
import { getSupabase } from '@/lib/supabase'
import { getIndexerConfig } from '@/lib/config'
import { getValidServiceToken } from '@/lib/interlinkServiceAuth'
import contractABI from '@/lib/interpredictAbi.json'

const iface = new ethers.Interface(contractABI)

function normalizeAddress(addr: string): string {
  return addr.toLowerCase()
}

async function rpcCall(
  url: string,
  token: string,
  method: string,
  params: unknown[],
): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`RPC HTTP ${response.status}`)
  }

  const json = await response.json()
  if (json.error) {
    throw new Error(`RPC error: ${json.error.message}`)
  }
  return json.result
}

export async function syncMarketById(marketId: number): Promise<void> {
  const config = getIndexerConfig()
  const supabase = getSupabase()
  const token = await getValidServiceToken()

  const call = async (method: string, params: unknown[]): Promise<unknown> => {
    return rpcCall(config.rpcUrl, token, method, params)
  }

  const stateResult = (await call('eth_call', [
    {
      to: config.contractAddress,
      data: iface.encodeFunctionData('marketState', [marketId]),
    },
    'latest',
  ])) as string
  const state = Number(iface.decodeFunctionResult('marketState', stateResult)[0])

  const contextResult = (await call('eth_call', [
    {
      to: config.contractAddress,
      data: iface.encodeFunctionData('marketContext', [marketId]),
    },
    'latest',
  ])) as string
  const context = iface.decodeFunctionResult('marketContext', contextResult)

  const labelsResult = (await call('eth_call', [
    {
      to: config.contractAddress,
      data: iface.encodeFunctionData('getOutcomeLabels', [marketId]),
    },
    'latest',
  ])) as string
  const labels = iface.decodeFunctionResult('getOutcomeLabels', labelsResult)[0] as string[]

  const poolsResult = (await call('eth_call', [
    {
      to: config.contractAddress,
      data: iface.encodeFunctionData('getOutcomePools', [marketId]),
    },
    'latest',
  ])) as string
  const pools = iface.decodeFunctionResult('getOutcomePools', poolsResult)[0] as bigint[]

  const pricesResult = (await call('eth_call', [
    {
      to: config.contractAddress,
      data: iface.encodeFunctionData('getOutcomePrices', [marketId]),
    },
    'latest',
  ])) as string
  const prices = iface.decodeFunctionResult('getOutcomePrices', pricesResult)[0] as bigint[]

  const resolutionResult = (await call('eth_call', [
    {
      to: config.contractAddress,
      data: iface.encodeFunctionData('marketResolution', [marketId]),
    },
    'latest',
  ])) as string
  const resolution = iface.decodeFunctionResult('marketResolution', resolutionResult)

  const financeResult = (await call('eth_call', [
    {
      to: config.contractAddress,
      data: iface.encodeFunctionData('marketFinance', [marketId]),
    },
    'latest',
  ])) as string
  const finance = iface.decodeFunctionResult('marketFinance', financeResult)

  const now = new Date().toISOString()
  const provenance = {
    chain_id: config.chainId,
    contract_address: config.contractAddress,
    block_number: 0,
    block_hash: '',
    transaction_hash: '',
    log_index: 0,
    indexed_at: now,
    updated_at: now,
  }

  const { error: marketError } = await supabase.from('markets').upsert(
    {
      id: marketId,
      question: String(context.question),
      description: String(context.description),
      category: Number(context.category),
      custom_category: String(context.customCategory) || null,
      origin: Number(context.origin),
      creator: normalizeAddress(String(context.creator)),
      state,
      end_time: Number(context.endTime),
      resolution_criteria: String(context.resolutionCriteria),
      thumbnail_url: String(context.thumbnailUri) || null,
      total_volume: String(finance.totalVolume),
      participant_count: Number(finance.participantCount),
      confirmed_outcome: resolution.outcomeConfirmed ? Number(resolution.confirmedOutcome) : null,
      finalized: Boolean(resolution.finalized),
      cancelled: Boolean(finance.cancelled),
      cancel_reason: String(finance.cancelReason) || null,
      ...provenance,
      created_at: now,
    },
    { onConflict: 'id' },
  )
  if (marketError) throw marketError

  for (let i = 0; i < labels.length; i++) {
    const { error: outcomeError } = await supabase.from('market_outcomes').upsert(
      {
        market_id: marketId,
        outcome_index: i,
        label: labels[i],
        pool: String(pools[i] ?? BigInt(0)),
        price: String(prices[i] ?? BigInt(0)),
      },
      { onConflict: 'market_id,outcome_index' },
    )
    if (outcomeError) throw outcomeError
  }

  const { error: resolutionError } = await supabase.from('market_resolutions').upsert(
    {
      market_id: marketId,
      active_dec_snapshot: Number(resolution.activeDecSnapshot),
      quorum: Number(resolution.quorum),
      total_votes: Number(resolution.totalResolutionVotes),
      confirmed_outcome: resolution.outcomeConfirmed ? Number(resolution.confirmedOutcome) : null,
      outcome_confirmed: Boolean(resolution.outcomeConfirmed),
      finalized: Boolean(resolution.finalized),
      quorum_reached: Boolean(resolution.quorumReached),
      tied: Boolean(resolution.tied),
      dec_outcome_available: Boolean(resolution.decOutcomeAvailable),
      dec_suggested_outcome: resolution.decOutcomeAvailable
        ? Number(resolution.decSuggestedOutcome)
        : null,
      ...provenance,
      created_at: now,
    },
    { onConflict: 'market_id' },
  )
  if (resolutionError) throw resolutionError
}
