import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getValidServiceToken } from '@/lib/interlinkServiceAuth'
import { INTERPREDICT_ABI } from '@/lib/interpredictProtocol'

const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
const rpcURL = process.env.INTERLINK_RPC_URL || 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'
const iface = new ethers.Interface(INTERPREDICT_ABI)

export async function GET(request: NextRequest) {
  const account = request.nextUrl.searchParams.get('address')
  if (!account || !ethers.isAddress(account)) return NextResponse.json({ error: 'Valid address required' }, { status: 400 })
  if (!address || !ethers.isAddress(address)) return NextResponse.json({ error: 'V2 contract address not configured' }, { status: 503 })
  try {
    const token = await getValidServiceToken()
    const read = async (fn: string, args: unknown[], id: number) => {
      const response = await fetch(rpcURL, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jsonrpc: '2.0', id, method: 'eth_call', params: [{ to: address, data: iface.encodeFunctionData(fn, args) }, 'latest'] }),
        cache: 'no-store',
      })
      const json = await response.json()
      if (!response.ok || json.error) throw new Error(json.error?.message || `RPC request failed (${response.status})`)
      return iface.decodeFunctionResult(fn, json.result)
    }
    const [member, rewards, thresholdResult] = await Promise.all([
      read('decMembers', [account], 1),
      read('decRewardsView', [account], 2),
      read('REWARD_THRESHOLD', [], 3),
    ])
    const isActive = Boolean(member.exists) && Boolean(member.active) && !Boolean(member.removed)
    const reputation = BigInt(member.reputation)
    const rewardThreshold = BigInt(thresholdResult[0])
    const claimableRewards = BigInt(rewards.claimable)
    const lockedRewards = BigInt(rewards.locked)
    const eligibleForFutureRewards = isActive && reputation >= rewardThreshold
    return NextResponse.json({
      exists: Boolean(member.exists),
      isActive,
      removed: Boolean(member.removed),
      joinedAt: Number(member.joinedAt),
      proposalVotes: member.proposalVotes.toString(),
      resolutionVotes: member.resolutionVotes.toString(),
      honestResolutionVotes: member.honestResolutionVotes.toString(),
      incorrectResolutionVotes: member.incorrectResolutionVotes.toString(),
      reputation: reputation.toString(),
      rewardThreshold: rewardThreshold.toString(),
      totalRewardsEarned: member.totalRewardsEarned.toString(),
      totalRewardsClaimed: member.totalRewardsClaimed.toString(),
      storedRewards: member.storedRewards.toString(),
      claimableRewards: claimableRewards.toString(),
      lockedRewards: lockedRewards.toString(),
      // Vested rewards remain claimable after later suspension, removal, or
      // reputation loss. Current status controls future earning, not custody of
      // rewards already earned.
      rewardClaimLocked: false,
      rewardLockReason: null,
      eligibleForFutureRewards,
      futureRewardIneligibilityReason: eligibleForFutureRewards
        ? null
        : !isActive ? 'inactive' : 'reputation',
      canClaimRewards: claimableRewards > BigInt(0),
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Membership lookup failed' }, { status: 502 })
  }
}
