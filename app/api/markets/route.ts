import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getValidServiceToken } from '@/lib/interlinkServiceAuth'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x3E5936F13e1194380A66c3c1d75D4D7342299CfF'
const RPC_URL = 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'

const iface = new ethers.Interface([
  'function totalMarkets() view returns (uint256)',
  'function markets(uint256) view returns (uint256 id, string question, string description, uint8 category, string customCategory, string thumbnailUri, uint8 origin, address creator, uint256 proposalVotingStart, uint256 proposalVotingDeadline, uint256 approvalVotes, uint256 rejectionVotes, bool proposalFinalized, uint8 proposalDecision, uint256 proposalFinalizationTimestamp, uint256 refundAmount, address refundRecipient, bool refundCompleted, uint256 marketEndTime, uint8 state, uint256 resolutionRequester, uint256 resolutionVotingStart, uint256 resolutionVotingDeadline, uint256 activeDECSnapshot, uint256 resolutionQuorum, uint256 totalResolutionVotes, uint8 decSelectedOutcome, uint8 confirmedOutcome, bool outcomeConfirmed, bool finalized, uint256 finalizationTimestamp, string resolutionCriteria, string primaryEvidenceUri, string backupEvidenceUri, uint256 totalVolume, uint256 participantCount, uint256 creatorFeesEarned, uint256 creatorFeesClaimed, uint256 creatorSeedClaimed, bool cancelled, string cancelReason, uint256 cancelTimestamp)',
  'function getOutcomeLabels(uint256) view returns (string[])',
  'function getOutcomePools(uint256) view returns (uint256[])',
  'function getOutcomePrices(uint256) view returns (uint256[])',
  'function getOutcomeCount(uint256) view returns (uint256)'
])

let cache: { data: unknown; expiresAt: number } | null = null
const CACHE_TTL_MS = 10_000

async function rpcCall(accessToken: string, data: string) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: CONTRACT_ADDRESS, data }, 'latest']
    })
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message || 'RPC call failed')
  return json.result
}

export async function GET() {
  try {
    if (cache && Date.now() < cache.expiresAt) {
      return NextResponse.json(cache.data)
    }

    const accessToken = await getValidServiceToken()

    const countResult = await rpcCall(accessToken, iface.encodeFunctionData('totalMarkets'))
    const totalCount = Number(iface.decodeFunctionResult('totalMarkets', countResult)[0])

    const markets = []
    for (let i = 0; i < totalCount; i++) {
      const raw = await rpcCall(accessToken, iface.encodeFunctionData('markets', [i]))
      const decoded = iface.decodeFunctionResult('markets', raw)

      let outcomeLabels: string[] = []
      let outcomePools: string[] = []
      let outcomePrices: string[] = []
      try {
        const labelsRaw = await rpcCall(accessToken, iface.encodeFunctionData('getOutcomeLabels', [i]))
        outcomeLabels = labelsRaw ? Array.from(iface.decodeFunctionResult('getOutcomeLabels', labelsRaw)[0] as string[]) : []
        
        const poolsRaw = await rpcCall(accessToken, iface.encodeFunctionData('getOutcomePools', [i]))
        outcomePools = poolsRaw ? Array.from(iface.decodeFunctionResult('getOutcomePools', poolsRaw)[0] as string[]).map((v: any) => v.toString()) : []
        
        const pricesRaw = await rpcCall(accessToken, iface.encodeFunctionData('getOutcomePrices', [i]))
        outcomePrices = pricesRaw ? Array.from(iface.decodeFunctionResult('getOutcomePrices', pricesRaw)[0] as string[]).map((v: any) => v.toString()) : []
      } catch (e) {
        // Older markets may not have these
      }

      markets.push({
        id: Number(decoded[0]),
        question: String(decoded[1]),
        description: String(decoded[2]),
        category: Number(decoded[3]),
        customCategory: String(decoded[4]),
        thumbnailUri: String(decoded[5]),
        origin: Number(decoded[6]),
        creator: String(decoded[7]),
        proposalVotingStart: Number(decoded[8]),
        proposalVotingDeadline: Number(decoded[9]),
        approvalVotes: Number(decoded[10]),
        rejectionVotes: Number(decoded[11]),
        proposalFinalized: Boolean(decoded[12]),
        proposalDecision: Number(decoded[13]),
        marketEndTime: Number(decoded[18]),
        state: Number(decoded[19]),
        resolutionVotingStart: Number(decoded[21]),
        resolutionVotingDeadline: Number(decoded[22]),
        activeDECSnapshot: Number(decoded[23]),
        resolutionQuorum: Number(decoded[24]),
        totalResolutionVotes: Number(decoded[25]),
        decSelectedOutcome: Number(decoded[26]),
        confirmedOutcome: Number(decoded[27]),
        outcomeConfirmed: Boolean(decoded[28]),
        finalized: Boolean(decoded[29]),
        finalizationTimestamp: Number(decoded[30]),
        resolutionCriteria: String(decoded[31]),
        primaryEvidenceUri: String(decoded[32]),
        backupEvidenceUri: String(decoded[33]),
        totalVolume: decoded[34].toString(),
        participantCount: Number(decoded[35]),
        creatorFeesEarned: decoded[36].toString(),
        creatorFeesClaimed: decoded[37].toString(),
        creatorSeedClaimed: decoded[38].toString(),
        cancelled: Boolean(decoded[39]),
        cancelReason: String(decoded[40]),
        cancelTimestamp: Number(decoded[41]),
        outcomeLabels,
        outcomePools,
        outcomePrices
      })
    }

    const payload = {
      allMarkets: markets,
      activeMarkets: markets.filter((m: any) => m.state === 5),
      pendingProposals: markets.filter((m: any) => m.state === 3 || m.state === 4),
      resolvedMarkets: markets.filter((m: any) => m.state >= 12),
      fetchedAt: new Date().toISOString()
    }

    cache = { data: payload, expiresAt: Date.now() + CACHE_TTL_MS }
    return NextResponse.json(payload)
  } catch (err: any) {
    console.error('GET /api/markets failed:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch markets' }, { status: 502 })
  }
}