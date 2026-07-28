import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getValidServiceToken } from '@/lib/interlinkServiceAuth'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x8c69b2D0A1C89fd3C6aD64e1Be3536FAF63b55b6'
const RPC_URL = 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'
const SERVICE_WALLET_PRIVATE_KEY = process.env.SERVICE_WALLET_PRIVATE_KEY
const CRON_SECRET = process.env.CRON_SECRET

const iface = new ethers.Interface([
  'function totalMarkets() view returns (uint256)',
  'function markets(uint256) view returns (uint256 id, string question, string description, uint8 category, string customCategory, string thumbnailUri, uint8 origin, address creator, uint256 proposalVotingStart, uint256 proposalVotingDeadline, uint256 approvalVotes, uint256 rejectionVotes, bool proposalFinalized, uint8 proposalDecision, uint256 proposalFinalizationTimestamp, uint256 refundAmount, address refundRecipient, bool refundCompleted, uint256 marketEndTime, uint8 state, uint256 resolutionRequester, uint256 resolutionVotingStart, uint256 resolutionVotingDeadline, uint256 activeDECSnapshot, uint256 resolutionQuorum, uint256 totalResolutionVotes, uint8 decSelectedOutcome, uint8 confirmedOutcome, bool outcomeConfirmed, bool finalized, uint256 finalizationTimestamp, string resolutionCriteria, string primaryEvidenceUri, string backupEvidenceUri, uint256 totalVolume, uint256 participantCount, uint256 creatorFeesEarned, uint256 creatorFeesClaimed, uint256 creatorSeedClaimed, bool cancelled, string cancelReason, uint256 cancelTimestamp)',
  'function enterProposalVoting(uint256)',
  'function finalizeProposalVoting(uint256)',
  'function finalizeResolutionVoting(uint256)',
  'function finalizeMarket(uint256)',
  'function accrueDecRewards(uint256)'
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

    const countResult = await readContractCall(accessToken, iface.encodeFunctionData('totalMarkets'))
    const totalCount = Number(iface.decodeFunctionResult('totalMarkets', countResult)[0])

    const nowSec = Math.floor(Date.now() / 1000)

    // Scan all markets for keeper actions
    const toEnterVoting: number[] = []
    const toFinalizeProposal: number[] = []
    const toFinalizeResolution: number[] = []
    const toFinalizeMarket: number[] = []
    const toAccrueRewards: number[] = []

    for (let i = 0; i < totalCount; i++) {
      const raw = await readContractCall(accessToken, iface.encodeFunctionData('markets', [i]))
      const decoded = iface.decodeFunctionResult('markets', raw)
      const state = Number(decoded[19]) // 0-13 state
      const proposalVotingStart = Number(decoded[8])
      const proposalVotingDeadline = Number(decoded[9])
      const resolutionVotingDeadline = Number(decoded[22])
      const outcomeConfirmed = Boolean(decoded[28])
      const finalized = Boolean(decoded[29])

      // Proposed (state==3) -> enter proposal voting (if origin=community)
      if (state === 3) {
        toEnterVoting.push(i)
      }
      // DECProposalVoting (state==4) && deadline passed -> finalize
      else if (state === 4 && nowSec >= proposalVotingDeadline) {
        toFinalizeProposal.push(i)
      }
      // DECResolutionVoting (state==9) && deadline passed -> finalize
      else if (state === 9 && nowSec >= resolutionVotingDeadline && resolutionVotingDeadline > 0) {
        toFinalizeResolution.push(i)
      }
      // OutcomeConfirmed (state==11) && not finalized -> finalize market
      else if (state === 11 && outcomeConfirmed && !finalized) {
        toFinalizeMarket.push(i)
      }
      // Finalized (state==12) && not yet accrued -> accrue rewards
      else if (state === 12 && finalized) {
        toAccrueRewards.push(i)
      }
    }

    if (toEnterVoting.length === 0 && toFinalizeProposal.length === 0 && 
        toFinalizeResolution.length === 0 && toFinalizeMarket.length === 0 &&
        toAccrueRewards.length === 0) {
      return NextResponse.json({ processed: 0, results: [], message: 'No markets due for transition.' })
    }

    const connection = new ethers.FetchRequest(RPC_URL)
    connection.setHeader('Authorization', `Bearer ${accessToken}`)
    const provider = new ethers.JsonRpcProvider(connection, undefined, { staticNetwork: true })
    const serviceSigner = new ethers.Wallet(SERVICE_WALLET_PRIVATE_KEY, provider)

    for (const marketId of toEnterVoting) {
      try {
        const tx = await serviceSigner.sendTransaction({
          to: CONTRACT_ADDRESS,
          data: iface.encodeFunctionData('enterProposalVoting', [marketId])
        })
        const receipt = await tx.wait()
        results.push({
          marketId,
          action: receipt && Number(receipt.status) === 1 ? 'entered_voting' : 'failed',
          txHash: tx.hash
        })
      } catch (err: any) {
        results.push({ marketId, action: 'error', error: err.message })
      }
    }

    for (const marketId of toFinalizeProposal) {
      try {
        const tx = await serviceSigner.sendTransaction({
          to: CONTRACT_ADDRESS,
          data: iface.encodeFunctionData('finalizeProposalVoting', [marketId])
        })
        const receipt = await tx.wait()
        results.push({
          marketId,
          action: receipt && Number(receipt.status) === 1 ? 'proposal_finalized' : 'failed',
          txHash: tx.hash
        })
      } catch (err: any) {
        results.push({ marketId, action: 'error', error: err.message })
      }
    }

    for (const marketId of toFinalizeResolution) {
      try {
        const tx = await serviceSigner.sendTransaction({
          to: CONTRACT_ADDRESS,
          data: iface.encodeFunctionData('finalizeResolutionVoting', [marketId])
        })
        const receipt = await tx.wait()
        results.push({
          marketId,
          action: receipt && Number(receipt.status) === 1 ? 'resolution_finalized' : 'failed',
          txHash: tx.hash
        })
      } catch (err: any) {
        results.push({ marketId, action: 'error', error: err.message })
      }
    }

    for (const marketId of toFinalizeMarket) {
      try {
        const tx = await serviceSigner.sendTransaction({
          to: CONTRACT_ADDRESS,
          data: iface.encodeFunctionData('finalizeMarket', [marketId])
        })
        const receipt = await tx.wait()
        results.push({
          marketId,
          action: receipt && Number(receipt.status) === 1 ? 'market_finalized' : 'failed',
          txHash: tx.hash
        })
      } catch (err: any) {
        results.push({ marketId, action: 'error', error: err.message })
      }
    }

    for (const marketId of toAccrueRewards) {
      try {
        const tx = await serviceSigner.sendTransaction({
          to: CONTRACT_ADDRESS,
          data: iface.encodeFunctionData('accrueDecRewards', [marketId])
        })
        const receipt = await tx.wait()
        results.push({
          marketId,
          action: receipt && Number(receipt.status) === 1 ? 'rewards_accrued' : 'failed',
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