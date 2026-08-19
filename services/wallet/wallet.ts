'use client'

import { ethers } from 'ethers'
import { getValidToken } from '@/lib/interlinkAuth'

// ---------------------------------------------------------------------------
// Wallet service (V2 §32). Extracted from the legacy Web3Context god-object.
// Handles: connection, disconnection, account switching, network switching,
// wallet rejection, transaction pending/confirmed/reverted.
// ---------------------------------------------------------------------------

const INTERLINK_TESTNET_CHAIN_ID = '19042026'
const RPC_URL = 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'

export interface WalletState {
  address: string | null
  chainId: string | null
  isConnected: boolean
}

let walletState: WalletState = {
  address: null,
  chainId: null,
  isConnected: false,
}

type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  for (const listener of listeners) {
    listener()
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const STORAGE_KEY = 'interpredict_wallet_connected'

export function getWalletState(): WalletState {
  // Rehydrate from localStorage on every read so the in-memory state
  // survives page reloads. The connection is only cleared by an explicit
  // disconnectWallet() call — never by a page refresh.
  const cached = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      walletState = parsed
    } catch {
      // Fall through to existing in-memory state
    }
  }
  return walletState
}

function getProvider(): ethers.BrowserProvider | null {
  if (typeof window === 'undefined') return null
  const ethereum = (window as unknown as { ethereum?: unknown }).ethereum
  if (!ethereum) return null
  return new ethers.BrowserProvider(ethereum as ethers.Eip1193Provider)
}

export async function connectWallet(): Promise<WalletState> {
  const provider = getProvider()
  if (!provider) {
    throw new Error('No Web3 wallet detected. Please install a wallet extension.')
  }

  // Request accounts
  await provider.send('eth_requestAccounts', [])

  // Ensure network
  await switchToInterlinkTestnet()

  const signer = await provider.getSigner()
  const address = await signer.getAddress()
  const network = await provider.getNetwork()

  walletState = {
    address: address.toLowerCase(),
    chainId: network.chainId.toString(),
    isConnected: true,
  }

  // Persist to localStorage so the connection survives page reloads.
  // It is only cleared by an explicit disconnectWallet() call.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(walletState))
  notify()
  return walletState
}

export function disconnectWallet(): WalletState {
  walletState = {
    address: null,
    chainId: null,
    isConnected: false,
  }
  localStorage.removeItem(STORAGE_KEY)
  notify()
  return walletState
}

export async function reconnectWallet(): Promise<WalletState> {
  const provider = getProvider()
  if (!provider) return walletState

  try {
    const accounts = await provider.listAccounts()
    if (accounts.length === 0) return walletState

    const network = await provider.getNetwork()
    walletState = {
      address: accounts[0].address.toLowerCase(),
      chainId: network.chainId.toString(),
      isConnected: true,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(walletState))
    notify()
  } catch {
    // Silently fail — user may not have authorized yet.
  }

  return walletState
}

export async function switchToInterlinkTestnet(): Promise<void> {
  const provider = getProvider()
  if (!provider) return

  const hexChainId = `0x${Number(INTERLINK_TESTNET_CHAIN_ID).toString(16)}`

  try {
    await provider.send('wallet_switchEthereumChain', [{ chainId: hexChainId }])
  } catch (switchError: unknown) {
    const code = (switchError as { code?: number })?.code
    if (code === 4902) {
      // Chain not added — add it
      await provider.send('wallet_addEthereumChain', [
        {
          chainId: hexChainId,
          chainName: 'Interlink Testnet',
          nativeCurrency: { name: 'Interlink Token', symbol: 'tITL', decimals: 18 },
          rpcUrls: [RPC_URL],
          blockExplorerUrls: ['https://testnet-explorer.interlinklabs.ai'],
        },
      ])
    } else {
      throw switchError
    }
  }
}

export async function getWalletBalance(address: string): Promise<string> {
  const provider = getProvider()
  if (!provider) return '0'

  try {
    const token = await getValidToken(address, await provider.getSigner())
    const connection = new ethers.FetchRequest(RPC_URL)
    connection.setHeader('Authorization', `Bearer ${token}`)
    const rpcProvider = new ethers.JsonRpcProvider(connection, undefined, {
      staticNetwork: true,
    })
    const balance = await rpcProvider.getBalance(address)
    return balance.toString()
  } catch {
    return '0'
  }
}

export function watchAccounts(callback: (accounts: string[]) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const ethereum = (window as unknown as { ethereum?: { on?: (event: string, handler: (...args: string[][]) => void) => void; removeListener?: (event: string, handler: (...args: string[][]) => void) => void } }).ethereum

  if (!ethereum?.on) return () => {}

  const handler = (accounts: string[]) => {
    callback(accounts)
  }

  ethereum.on('accountsChanged', handler)
  return () => {
    ethereum.removeListener?.('accountsChanged', handler)
  }
}
