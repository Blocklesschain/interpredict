import { ethers } from 'ethers'

const BASE =
  'https://evm-rpc.test-net.interlinklabs.ai/v1/auth'

const CHAIN_ID = '19042026'

const SERVICE_WALLET_PRIVATE_KEY =
  process.env.SERVICE_WALLET_PRIVATE_KEY?.trim()

function createServiceWallet(): ethers.Wallet | null {
  if (!SERVICE_WALLET_PRIVATE_KEY) {
    console.error(
      'SERVICE_WALLET_PRIVATE_KEY is not configured.'
    )
    return null
  }

  try {
    return new ethers.Wallet(
      SERVICE_WALLET_PRIVATE_KEY
    )
  } catch {
    console.error(
      'SERVICE_WALLET_PRIVATE_KEY is invalid.'
    )
    return null
  }
}

const serviceWallet = createServiceWallet()