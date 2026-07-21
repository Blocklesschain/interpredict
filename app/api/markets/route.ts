import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getValidServiceToken } from '@/lib/interlinkServiceAuth'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x8c69b2D0A1C89fd3C6aD64e1Be3536FAF63b55b6'
const RPC_URL = 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'

const iface = new ethers.Interface([
  'function totalMarkets() view returns (uint256)',
  'function markets(uint256) view returns (uint256 id, string question, uint256 marketEndTime, uint256 votingEndTime, uint256 totalYesPool, uint256 totalNoPool, uint8 state, uint8 winningOutcome, address creator, bool creatorFeeClaimed, uint256 votesForActive, uint256 votesAgainstActive, bool oracleResolutionRequested)'
])

// Tiny in-memory response cache so a burst of logged-out visitors doesn't
// hammer the RPC or force extra token refreshes.
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

      markets.push({
        id: Number(decoded[0]),
        question: String(decoded[1]),
        marketEndTime: Number(decoded[2]),
        votingEndTime: Number(decoded[3]),
        totalYesPool: decoded[4].toString(),
        totalNoPool: decoded[5].toString(),
        state: Number(decoded[6]), // 0 = Proposed, 1 = Active, 2 = Resolved
        winningOutcome: Number(decoded[7]),
        creator: String(decoded[8]),
        oracleResolutionRequested: Boolean(decoded[12])
      })
    }

    const payload = {
      // All markets for proper filtering on the client side
      allMarkets: markets,
      // Categorized for convenience
      activeMarkets: markets.filter(m => m.state === 1),
      pendingProposals: markets.filter(m => m.state === 0),
      resolvedMarkets: markets.filter(m => m.state === 2),
      fetchedAt: new Date().toISOString()
    }

    cache = { data: payload, expiresAt: Date.now() + CACHE_TTL_MS }
    return NextResponse.json(payload)
  } catch (err: any) {
    console.error('GET /api/markets failed:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch markets' }, { status: 502 })
  }
}