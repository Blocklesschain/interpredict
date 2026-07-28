import { ethers } from 'ethers'
import fs from 'fs'
import path from 'path'

const BASE = 'https://evm-rpc.test-net.interlinklabs.ai/v1/auth'
const CHAIN_ID = '19042026'

const CACHE_DIR = path.resolve(process.cwd(), '.interlink-cache')

interface TokenState {
  accessToken: string
  refreshToken: string
  accessExpiresAt: number
  refreshExpiresAt: number
}

const memCache = new Map<string, TokenState>()

function cacheFilePath(address: string) {
  return path.join(CACHE_DIR, `${address.toLowerCase()}.json`)
}

function loadState(address: string): TokenState | null {
  const cached = memCache.get(address.toLowerCase())
  if (cached) return cached
  const file = cacheFilePath(address)
  if (!fs.existsSync(file)) return null
  const raw = fs.readFileSync(file, 'utf8')
  const parsed = JSON.parse(raw) as TokenState
  memCache.set(address.toLowerCase(), parsed)
  return parsed
}

function saveState(address: string, state: TokenState) {
  memCache.set(address.toLowerCase(), state)
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(cacheFilePath(address), JSON.stringify(state, null, 2), 'utf8')
}

async function postJson(url: string, body: unknown, bearerToken?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  const json = await res.json()
  if (!res.ok || json.error) {
    throw new Error(json?.error?.message || `Request to ${url} failed (${res.status})`)
  }
  return json.result
}

async function requestChallenge(address: string) {
  return postJson(`${BASE}/challenge`, {
    chainId: CHAIN_ID,
    walletAddress: address
  }) as Promise<{ challengeId: string; messageToSign: string; expiresAt: string }>
}

async function verifyChallenge(address: string, signer: ethers.Signer) {
  const { challengeId, messageToSign } = await requestChallenge(address)
  const signature = await signer.signMessage(messageToSign)
  const result = await postJson(`${BASE}/verify`, {
    walletAddress: address,
    signature,
    challengeId
  }) as {
    accessToken: string
    refreshToken: string
    tokenType: string
    accessTokenExpiresInSec: number
    refreshTokenExpiresInSec: number
    walletAddress: string
  }
  const now = Date.now()
  const state: TokenState = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    accessExpiresAt: now + result.accessTokenExpiresInSec * 1000,
    refreshExpiresAt: now + result.refreshTokenExpiresInSec * 1000
  }
  saveState(address, state)
  return state
}

async function refreshAccessToken(address: string, state: TokenState) {
  const result = await postJson(
    `${BASE}/refresh`,
    { refreshToken: state.refreshToken },
    state.accessToken
  ) as {
    accessToken: string
    refreshToken?: string
    accessTokenExpiresInSec: number
    refreshTokenExpiresInSec?: number
  }
  const now = Date.now()
  const newState: TokenState = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken ?? state.refreshToken,
    accessExpiresAt: now + result.accessTokenExpiresInSec * 1000,
    refreshExpiresAt: result.refreshTokenExpiresInSec
      ? now + result.refreshTokenExpiresInSec * 1000
      : state.refreshExpiresAt
  }
  saveState(address, newState)
  return newState
}

export async function getValidToken(address: string, signer: ethers.Signer): Promise<string> {
  const now = Date.now()
  let state = loadState(address)
  if (state && now < state.accessExpiresAt - 60_000) {
    return state.accessToken
  }
  if (state && now < state.refreshExpiresAt - 60_000) {
    try {
      state = await refreshAccessToken(address, state)
      return state.accessToken
    } catch (err: any) {
      console.warn(`[interlinkAuth] Silent refresh failed: ${err.message} — falling back to full re-auth`)
    }
  }
  state = await verifyChallenge(address, signer)
  return state.accessToken
}

export function clearAuthState(address: string) {
  memCache.delete(address.toLowerCase())
  const file = cacheFilePath(address)
  if (fs.existsSync(file)) fs.unlinkSync(file)
}

let backendWallet: ethers.Wallet | null = null

function getBackendWallet(): ethers.Wallet {
  if (backendWallet) return backendWallet
  const pk = process.env.INTERLINK_BACKEND_PRIVATE_KEY
  if (!pk) {
    throw new Error('INTERLINK_BACKEND_PRIVATE_KEY is not set. Add it to your .env / .env.local')
  }
  backendWallet = new ethers.Wallet(pk)
  return backendWallet
}

export async function getBackendToken(): Promise<string> {
  const wallet = getBackendWallet()
  return getValidToken(wallet.address, wallet)
}

export function getBackendAddress(): string {
  return getBackendWallet().address
}