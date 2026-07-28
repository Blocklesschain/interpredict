import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getValidServiceToken } from '@/lib/interlinkServiceAuth'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x8c69b2D0A1C89fd3C6aD64e1Be3536FAF63b55b6'
const RPC_URL = 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'

const iface = new ethers.Interface([
  'function isActiveDecMember(address) view returns (bool)',
  'function getAllDecMembers() view returns (address[])',
  'function decMembers(address) view returns (bool active, uint256 proposalVotes, uint256 resolutionVotes, uint256 totalParticipation, uint256 honestVotes, uint256 incorrectVotes, uint256 reputation, uint256 totalRewardsEarned, uint256 totalRewardsClaimed, uint256 unclaimedRewards, uint256 joinTimestamp)',
  'function decRewardThreshold() view returns (uint256)',
  'function decRewardPool() view returns (uint256)'
])

async function rpcCall(accessToken: string, data: string, id: number = 1) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: 'eth_call',
      params: [{ to: CONTRACT_ADDRESS, data }, 'latest']
    })
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message || 'RPC call failed')
  return json.result
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'Address parameter required' }, { status: 400 })
  }

  try {
    const accessToken = await getValidServiceToken()

    // Check active DEC membership
    const isActiveResult = await rpcCall(accessToken, iface.encodeFunctionData('isActiveDecMember', [address]), 1)
    const isActiveMember = isActiveResult && isActiveResult !== '0x'
      ? iface.decodeFunctionResult('isActiveDecMember', isActiveResult)[0]
      : false

    // Check admin
    const ADMIN_ADDRESS = '0x6e832252ea4c78068ee109d953724d2762431992'
    const isAdmin = address.toLowerCase() === ADMIN_ADDRESS.toLowerCase()

    // Get DEC member info if member
    let memberInfo = null
    if (isActiveMember || isAdmin) {
      const memberResult = await rpcCall(accessToken, iface.encodeFunctionData('decMembers', [address]), 2)
      if (memberResult && memberResult !== '0x') {
        const decoded = iface.decodeFunctionResult('decMembers', memberResult)
        memberInfo = {
          active: decoded[0],
          proposalVotes: Number(decoded[1]),
          resolutionVotes: Number(decoded[2]),
          totalParticipation: Number(decoded[3]),
          honestVotes: Number(decoded[4]),
          incorrectVotes: Number(decoded[5]),
          reputation: Number(decoded[6]),
          totalRewardsEarned: decoded[7].toString(),
          totalRewardsClaimed: decoded[8].toString(),
          unclaimedRewards: decoded[9].toString(),
          joinTimestamp: Number(decoded[10])
        }
      }
    }

    // Get all DEC members (admin only)
    let allDecMembers: string[] = []
    if (isAdmin) {
      const membersResult = await rpcCall(accessToken, iface.encodeFunctionData('getAllDecMembers'), 3)
      if (membersResult && membersResult !== '0x') {
        const members = iface.decodeFunctionResult('getAllDecMembers', membersResult)[0]
        allDecMembers = Array.from(members as string[])
      }
    }

    // Get reward threshold and pool
    const thresholdResult = await rpcCall(accessToken, iface.encodeFunctionData('decRewardThreshold'), 4)
    const threshold = thresholdResult ? Number(iface.decodeFunctionResult('decRewardThreshold', thresholdResult)[0]) : 0

    const poolResult = await rpcCall(accessToken, iface.encodeFunctionData('decRewardPool'), 5)
    const pool = poolResult ? iface.decodeFunctionResult('decRewardPool', poolResult)[0].toString() : '0'

    return NextResponse.json({
      isDecMember: isActiveMember,
      isAdmin,
      memberInfo,
      allDecMembers,
      decRewardThreshold: threshold,
      decRewardPool: pool
    })
  } catch (err: any) {
    console.error('GET /api/dec-membership failed:', err)
    return NextResponse.json({ error: err.message || 'Failed to check DEC membership' }, { status: 502 })
  }
}