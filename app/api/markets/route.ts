import { NextRequest, NextResponse } from 'next/server'
import { getCachedMarkets } from '@/lib/marketsCache'
import { getBackendToken } from '@/lib/interlinkAuthBackend'
import { ethers } from 'ethers'
import contractABI from '@/lib/interpredictAbi.json'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ---------------------------------------------------------------------------
// GET /api/markets
//
// Returns `{ allMarkets: Market[] }` — the exact shape the frontend already
// expects.  This endpoint ONLY reads the Netlify Blobs cache; it NEVER hits
// the live RPC for market data.  That makes responses fast (< 100ms) and
// reliable regardless of RPC gateway health.
//
// When `?address=<wallet>` is provided, the endpoint enriches the response
// with wallet-specific data (votes, shares, claims) using batched RPC calls
// so the frontend never needs to make per-market readContract calls.
//
// Refresh is handled separately by POST /api/markets/refresh, which should be
// called by a scheduled job (GitHub Action, cron-job.org) or a Background
// Function.  This decoupling means no user request ever waits for a chain scan.
//
// If the cache is empty (first deploy / cold start before the first refresh),
// we return an empty array with a 503 status so the frontend can show a
// "loading" state rather than an error.
// ---------------------------------------------------------------------------

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ||
  '0x3E5936F13e1194380A66c3c1d75D4D7342299CfF'

const RPC_URL = 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'
const RPC_CALL_TIMEOUT_MS = 8_000

const iface = new ethers.Interface(contractABI)

interface WalletPosition {
  marketId: number
  question: string
  marketState: number
  confirmedOutcome: number
  shares: string[]
  stakes: string[]
  totalStake: string
  claimablePayout: string
  claimedPayout: string
  claimed: boolean
  marketEndTime: number
  outcomeLabels: string[]
  outcomePools: string[]
}

export async function GET(request: NextRequest) {
  try {
    const cached = await getCachedMarkets()

    if (!cached) {
      console.warn('[Markets API] No cached snapshot available yet. Run POST /api/markets/refresh to seed the cache.')
      return NextResponse.json(
        { allMarkets: [], cacheStatus: 'empty' },
        {
          status: 503,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': '10',
            'X-Markets-Source': 'empty',
          },
        },
      )
    }

    const url = new URL(request.url)
    const walletAddress = url.searchParams.get('address')?.toLowerCase()

    // If no wallet address, return markets as-is (fast path)
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return NextResponse.json(
        { allMarkets: cached.markets },
        {
          headers: {
            'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=300',
            'X-Markets-Source': 'cache',
            'X-Markets-Updated-At': cached.updatedAt,
            ...(cached.lastIndexedBlock ? { 'X-Markets-Last-Block': cached.lastIndexedBlock } : {}),
          },
        },
      )
    }

    // --- Wallet enrichment path ---
    // Batch all wallet-specific reads into a single RPC call per market
    // to avoid rate limiting. Each market needs: pv, rv, hvp, hcw, sh (per outcome)
    const token = await getBackendToken().catch(() => null)
    if (!token) {
      // Fallback: return markets without wallet enrichment
      console.warn('[Markets API] Could not get backend token for wallet enrichment; returning markets without wallet data.')
      return NextResponse.json(
        { allMarkets: cached.markets },
        {
          headers: {
            'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=300',
            'X-Markets-Source': 'cache',
            'X-Markets-Updated-At': cached.updatedAt,
          },
        },
      )
    }

    const enrichedMarkets = [...cached.markets]
    const walletPositions: WalletPosition[] = []

    // Process markets in batches of 5 to avoid overwhelming the RPC
    const BATCH_SIZE = 5
    for (let batchStart = 0; batchStart < enrichedMarkets.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, enrichedMarkets.length)
      const batchMarkets = enrichedMarkets.slice(batchStart, batchEnd)

      // Build batched RPC requests for all wallet-specific functions
      const requests: any[] = []
      const requestMap: { marketId: number; label: string; outcomeIndex?: number }[] = []

      for (const market of batchMarkets) {
        // Proposal vote
        requests.push({
          jsonrpc: '2.0',
          id: requests.length + 1,
          method: 'eth_call',
          params: [{
            to: CONTRACT_ADDRESS,
            data: iface.encodeFunctionData('pv', [market.id, walletAddress]),
          }, 'latest'],
        })
        requestMap.push({ marketId: market.id, label: 'pv' })

        // Resolution vote
        requests.push({
          jsonrpc: '2.0',
          id: requests.length + 1,
          method: 'eth_call',
          params: [{
            to: CONTRACT_ADDRESS,
            data: iface.encodeFunctionData('rv', [market.id, walletAddress]),
          }, 'latest'],
        })
        requestMap.push({ marketId: market.id, label: 'rv' })

        // Has voted on proposal
        requests.push({
          jsonrpc: '2.0',
          id: requests.length + 1,
          method: 'eth_call',
          params: [{
            to: CONTRACT_ADDRESS,
            data: iface.encodeFunctionData('hvp', [market.id, walletAddress]),
          }, 'latest'],
        })
        requestMap.push({ marketId: market.id, label: 'hvp' })

        // Has claimed winnings
        requests.push({
          jsonrpc: '2.0',
          id: requests.length + 1,
          method: 'eth_call',
          params: [{
            to: CONTRACT_ADDRESS,
            data: iface.encodeFunctionData('hcw', [market.id, walletAddress]),
          }, 'latest'],
        })
        requestMap.push({ marketId: market.id, label: 'hcw' })

        // Shares per outcome
        for (let oi = 0; oi < (market.outcomeLabels?.length || 2); oi++) {
          requests.push({
            jsonrpc: '2.0',
            id: requests.length + 1,
            method: 'eth_call',
            params: [{
              to: CONTRACT_ADDRESS,
              data: iface.encodeFunctionData('sh', [market.id, oi, walletAddress]),
            }, 'latest'],
          })
          requestMap.push({ marketId: market.id, label: 'sh', outcomeIndex: oi })
        }
      }

      // Execute batched RPC call
      try {
        const response = await fetch(RPC_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requests),
          signal: AbortSignal.timeout(RPC_CALL_TIMEOUT_MS),
        })

        const json = await response.json()

        if (Array.isArray(json)) {
          // Process results per market
          const marketResults = new Map<number, {
            pv: number
            rv: number
            hvp: boolean
            hcw: boolean
            shares: string[]
          }>()

          for (let i = 0; i < requestMap.length; i++) {
            const req = requestMap[i]
            const result = json[i]

            if (!result || result.error || !result.result || result.result === '0x') continue

            if (!marketResults.has(req.marketId)) {
              marketResults.set(req.marketId, { pv: 0, rv: 0, hvp: false, hcw: false, shares: [] })
            }

            const mr = marketResults.get(req.marketId)!

            try {
              if (req.label === 'pv') {
                const decoded = iface.decodeFunctionResult('pv', result.result)
                mr.pv = Number(decoded[0] ?? 0)
              } else if (req.label === 'rv') {
                const decoded = iface.decodeFunctionResult('rv', result.result)
                mr.rv = Number(decoded[0] ?? 0)
              } else if (req.label === 'hvp') {
                const decoded = iface.decodeFunctionResult('hvp', result.result)
                mr.hvp = Boolean(decoded[0] ?? false)
              } else if (req.label === 'hcw') {
                const decoded = iface.decodeFunctionResult('hcw', result.result)
                mr.hcw = Boolean(decoded[0] ?? false)
              } else if (req.label === 'sh') {
                const decoded = iface.decodeFunctionResult('sh', result.result)
                const shareVal = decoded[0] ? (decoded[0] as bigint).toString() : '0'
                // Ensure array is long enough
                while (mr.shares.length <= (req.outcomeIndex ?? 0)) {
                  mr.shares.push('0')
                }
                mr.shares[req.outcomeIndex ?? 0] = shareVal
              }
            } catch (decodeErr) {
              // Skip individual decode failures
            }
          }

          // Apply results to markets and build wallet positions
          for (const market of batchMarkets) {
            const mr = marketResults.get(market.id)
            if (!mr) continue

            // Update market with wallet-specific fields
            const marketIndex = enrichedMarkets.findIndex(m => m.id === market.id)
            if (marketIndex >= 0) {
              enrichedMarkets[marketIndex] = {
                ...enrichedMarkets[marketIndex],
                // These are added as dynamic fields for the frontend
                hasCurrentWalletVoted: mr.hvp || mr.pv !== 0,
                currentWalletProposalVote: mr.pv,
                hasCurrentWalletVotedOnResolution: mr.rv !== 0,
                currentWalletResolutionVote: mr.rv,
              } as any
            }

            // Build wallet position if user has shares or has claimed
            const hasAnyShares = mr.shares.some(s => BigInt(s || '0') > BigInt(0))
            if (hasAnyShares || mr.hcw) {
              let claimablePayout = '0'
              if (market.finalized && !mr.hcw) {
                const winningOutcome = Number(market.confirmedOutcome)
                const userShares = BigInt(mr.shares[winningOutcome] || '0')
                const pools = (market.outcomePools || []).map(v => BigInt(v || '0'))
                const totalPool = pools.reduce((sum, v) => sum + v, BigInt(0))
                const winningPool = BigInt(market.outcomePools?.[winningOutcome] || '0')
                if (userShares > BigInt(0) && winningPool > BigInt(0)) {
                  const grossPayout = (userShares * totalPool) / winningPool
                  claimablePayout = (grossPayout - ((grossPayout * BigInt(500)) / BigInt(10000))).toString()
                }
              }

              walletPositions.push({
                marketId: market.id,
                question: market.question,
                marketState: market.state,
                confirmedOutcome: market.confirmedOutcome,
                shares: mr.shares,
                stakes: mr.shares.map(() => '0'),
                totalStake: mr.shares.reduce((sum, s) => sum + BigInt(s || '0'), BigInt(0)).toString(),
                claimablePayout,
                claimedPayout: '0',
                claimed: mr.hcw,
                marketEndTime: market.marketEndTime,
                outcomeLabels: market.outcomeLabels || [],
                outcomePools: market.outcomePools || [],
              })
            }
          }
        }
      } catch (batchErr) {
        console.warn(`[Markets API] Wallet enrichment batch ${batchStart}-${batchEnd} failed:`, batchErr)
        // Continue with next batch
      }

      // Small delay between batches to avoid rate limiting
      if (batchEnd < enrichedMarkets.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    return NextResponse.json(
      {
        allMarkets: enrichedMarkets,
        walletPositions: walletPositions.length > 0 ? walletPositions : undefined,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          'X-Markets-Source': 'cache-enriched',
          'X-Markets-Updated-At': cached.updatedAt,
          ...(cached.lastIndexedBlock ? { 'X-Markets-Last-Block': cached.lastIndexedBlock } : {}),
        },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read markets cache'
    console.error('[Markets API] Error reading cache:', error)
    return NextResponse.json({ error: message, allMarkets: [] }, { status: 502 })
  }
}