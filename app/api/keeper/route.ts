import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getValidServiceToken } from '@/lib/interlinkServiceAuth'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x8c69b2D0A1C89fd3C6aD64e1Be3536FAF63b55b6'
const RPC_URL = 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'
const SERVICE_WALLET_PRIVATE_KEY = process.env.SERVICE_WALLET_PRIVATE_KEY
const CRON_SECRET = process.env.CRON_SECRET // shared secret so randoms on the internet can't spam this route

const iface = new ethers.Interface([
  'function totalMarkets() view returns (uint256)',
  'function markets(uint256) view returns (uint256 id, string question, uint256 marketEndTime, uint256 votingEndTime, uint256 totalYesPool, uint256 totalNoPool, uint8 state, uint8 winningOutcome, address creator, bool creatorFeeClaimed, uint256 votesForActive, uint256 votesAgainstActive, bool oracleResolutionRequested)',
  'function initializeMarket(uint256 _marketId)'
])

async function rpcCall(accessToken: string, body: unknown) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body)
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message || 'RPC call failed')
  return json.result
}

async function readContractCall(accessToken: string, data: string) {
  return rpcCall(accessToken, {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_call',
    params: [{ to: CONTRACT_ADDRESS, data }, 'latest']
  })
}

export async function GET(request: Request) {
  // Optional but recommended: protect this route so only your cron scheduler can trigger it.
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  if (!SERVICE_WALLET_PRIVATE_KEY) {
    return NextResponse.json({ error: 'SERVICE_WALLET_PRIVATE_KEY not configured' }, { status: 500 })
  }

  const results: Array<{ marketId: number; action: string; txHash?: string; error?: string }> = []

  try {
    const accessToken = await getValidServiceToken()

    // 1. Find every market currently sitting in "Proposed" whose voting window has closed
    const countResult = await readContractCall(accessToken, iface.encodeFunctionData('totalMarkets'))
    const totalCount = Number(iface.decodeFunctionResult('totalMarkets', countResult)[0])

    const nowSec = Math.floor(Date.now() / 1000)
    const dueMarketIds: number[] = []

    for (let i = 0; i < totalCount; i++) {
      const raw = await readContractCall(accessToken, iface.encodeFunctionData('markets', [i]))
      const decoded = iface.decodeFunctionResult('markets', raw)
      const state = Number(decoded[6])
      const votingEndTime = Number(decoded[3])

      if (state === 0 && nowSec >= votingEndTime) {
        dueMarketIds.push(i)
      }
    }

    if (dueMarketIds.length === 0) {
      return NextResponse.json({ processed: 0, results: [], message: 'No markets due for transition.' })
    }

    // 2. Set up an authenticated, transaction-capable connection using the service wallet
    const connection = new ethers.FetchRequest(RPC_URL)
    connection.setHeader('Authorization', `Bearer ${accessToken}`)
    const provider = new ethers.JsonRpcProvider(connection, undefined, { staticNetwork: true })
    const serviceSigner = new ethers.Wallet(SERVICE_WALLET_PRIVATE_KEY, provider)

    // 3. Call initializeMarket() on each — this is a public function, so the service
    // wallet doesn't need any special permission, just enough gas to send the tx.
    for (const marketId of dueMarketIds) {
      try {
        const tx = await serviceSigner.sendTransaction({
          to: CONTRACT_ADDRESS,
          data: iface.encodeFunctionData('initializeMarket', [marketId])
        })
        const receipt = await tx.wait()

        results.push({
          marketId,
          action: receipt && Number(receipt.status) === 1 ? 'transitioned' : 'failed',
          txHash: tx.hash
        })
      } catch (err: any) {
        results.push({ marketId, action: 'error', error: err.message })
      }
    }

    return NextResponse.json({ processed: results.length, results })
  } catch (err: any) {
    console.error('GET /api/keeper failed:', err)
    return NextResponse.json({ error: err.message || 'Keeper run failed' }, { status: 502 })
  }
}