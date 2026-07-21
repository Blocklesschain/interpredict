import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getValidServiceToken } from '@/lib/interlinkServiceAuth'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x8c69b2D0A1C89fd3C6aD64e1Be3536FAF63b55b6'
const RPC_URL = 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'

const iface = new ethers.Interface([
  'function isDecMember(address) view returns (bool)',
  'function getAllDecMembers() view returns (address[])'
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

    // Check DEC membership
    const isMemberResult = await rpcCall(accessToken, iface.encodeFunctionData('isDecMember', [address]), 1)
    const isMember = isMemberResult && isMemberResult !== '0x'
      ? iface.decodeFunctionResult('isDecMember', isMemberResult)[0]
      : false

    // Check if admin
    const ADMIN_ADDRESS = '0x6e832252ea4c78068ee109d953724d2762431992'
    const isOracle = address.toLowerCase() === ADMIN_ADDRESS.toLowerCase()

    // Get all DEC members for admin
    let allDecMembers: string[] = []
    if (isOracle) {
      const membersResult = await rpcCall(accessToken, iface.encodeFunctionData('getAllDecMembers'), 2)
      if (membersResult && membersResult !== '0x') {
        const members = iface.decodeFunctionResult('getAllDecMembers', membersResult)[0]
        allDecMembers = Array.from(members as string[])
      }
    }

    return NextResponse.json({
      isDecMember: isMember,
      isOracle,
      allDecMembers: isOracle ? allDecMembers : []
    })
  } catch (err: any) {
    console.error('GET /api/dec-membership failed:', err)
    return NextResponse.json({ error: err.message || 'Failed to check DEC membership' }, { status: 502 })
  }
}