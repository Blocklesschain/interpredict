import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getValidServiceToken } from '@/lib/interlinkServiceAuth'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x3E5936F13e1194380A66c3c1d75D4D7342299CfF'
const RPC_URL = 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'

const iface = new ethers.Interface([
  'function iad(address) view returns (bool)',
  'function gAD() view returns (address[])',
  'function gDMI(address) view returns (tuple(bool act, uint256 pv, uint256 rv, uint256 tp, uint256 hv, uint256 iv, uint256 rep, uint256 tre, uint256 trc, uint256 ur))',
  'function drt() view returns (uint256)',
  'function drp() view returns (uint256)'
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
    const isActiveResult = await rpcCall(accessToken, iface.encodeFunctionData('iad', [address]), 1)
    const isActiveMember = isActiveResult && isActiveResult !== '0x'
      ? iface.decodeFunctionResult('iad', isActiveResult)[0]
      : false

    // Check admin
    const ADMIN_ADDRESS = '0x6e832252ea4c78068ee109d953724d2762431992'
    const isAdmin = address.toLowerCase() === ADMIN_ADDRESS.toLowerCase()

    // Get DEC member info if member
    let memberInfo = null
    if (isActiveMember || isAdmin) {
      const memberResult = await rpcCall(accessToken, iface.encodeFunctionData('gDMI', [address]), 2)
      if (memberResult && memberResult !== '0x') {
        const decoded = iface.decodeFunctionResult('gDMI', memberResult)[0]
        memberInfo = {
          active: decoded.act,
          proposalVotes: Number(decoded.pv),
          resolutionVotes: Number(decoded.rv),
          totalParticipation: Number(decoded.tp),
          honestVotes: Number(decoded.hv),
          incorrectVotes: Number(decoded.iv),
          reputation: Number(decoded.rep),
          totalRewardsEarned: decoded.tre.toString(),
          totalRewardsClaimed: decoded.trc.toString(),
          unclaimedRewards: decoded.ur.toString()
        }
      }
    }

    // Get all DEC members (admin only)
    let allDecMembers: string[] = []
    if (isAdmin) {
      const membersResult = await rpcCall(accessToken, iface.encodeFunctionData('gAD'), 3)
      if (membersResult && membersResult !== '0x') {
        const members = iface.decodeFunctionResult('gAD', membersResult)[0]
        allDecMembers = Array.from(members as string[])
      }
    }

    // Get reward threshold and pool
    const thresholdResult = await rpcCall(accessToken, iface.encodeFunctionData('drt'), 4)
    const threshold = thresholdResult ? Number(iface.decodeFunctionResult('drt', thresholdResult)[0]) : 0

    const poolResult = await rpcCall(accessToken, iface.encodeFunctionData('drp'), 5)
    const pool = poolResult ? iface.decodeFunctionResult('drp', poolResult)[0].toString() : '0'

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