import 'server-only'
import { ethers } from 'ethers'
import { getValidServiceToken } from '@/lib/interlinkServiceAuth'

// Authenticated JsonRpcProvider against the Interlink testnet, using the
// service-wallet bearer token (mirrors app/api/keeper/route.ts and
// lib/interlinkServiceAuth.ts). Server-only.
const RPC_URL = 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'

let cachedProvider: ethers.JsonRpcProvider | null = null

async function getProvider(): Promise<ethers.JsonRpcProvider> {
  if (cachedProvider) return cachedProvider
  const accessToken = await getValidServiceToken()
  const connection = new ethers.FetchRequest(RPC_URL)
  connection.setHeader('Authorization', `Bearer ${accessToken}`)
  cachedProvider = new ethers.JsonRpcProvider(connection, undefined, { staticNetwork: true })
  return cachedProvider
}

export interface TransferVerification {
  ok: boolean
  reason?: string
  receipt?: {
    txHash: string
    from: string
    to: string
    value: string
    blockNumber: string
    status: number
  }
}

/**
 * Verifies that a confirmed on-chain transfer matches the expected sender,
 * recipient and value. Used by the multiplier "confirm" flow to prove a real
 * tITL payment happened before unlocking a multiplier — no more optimistic
 * confirmation.
 */
export async function verifyOnChainTransfer(params: {
  txHash: string
  expectedSender: string
  expectedRecipient: string
  expectedValueWei: string
}): Promise<TransferVerification> {
  const { txHash, expectedSender, expectedRecipient, expectedValueWei } = params

  try {
    const provider = await getProvider()

    const tx = await provider.getTransaction(txHash)
    if (!tx) return { ok: false, reason: 'Transaction not found.' }

    const receipt = await provider.getTransactionReceipt(txHash)
    if (!receipt || receipt.blockNumber === 0 || receipt.blockNumber === null) {
      return { ok: false, reason: 'Transaction is not confirmed on-chain yet.' }
    }
    // spec: null blockNumber in ethers v6 = pending; also treat status !== 1 as failure.
    if (receipt.status !== undefined && receipt.status !== 1) {
      return { ok: false, reason: 'Transaction failed on-chain (status != success).' }
    }

    const actualFrom = (tx.from || '').toLowerCase()
    const actualTo = (tx.to || '').toLowerCase()
    const actualValue = (tx.value || '0').toString()

    if (actualFrom !== expectedSender.toLowerCase()) {
      return { ok: false, reason: 'Transaction sender does not match your wallet.' }
    }
    if (actualTo !== expectedRecipient.toLowerCase()) {
      return { ok: false, reason: 'Transaction recipient does not match the treasury address.' }
    }
    if (actualValue !== BigInt(expectedValueWei).toString()) {
      return { ok: false, reason: 'Transaction value does not match the multiplier cost.' }
    }

    return {
      ok: true,
      receipt: {
        txHash,
        from: actualFrom,
        to: actualTo,
        value: actualValue,
        blockNumber: receipt.blockNumber.toString(),
        status: Number(receipt.status ?? 1),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'On-chain verification failed.'
    return { ok: false, reason: message }
  }
}