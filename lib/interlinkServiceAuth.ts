import { ethers } from 'ethers'

// SERVER-ONLY MODULE. Never import this from a 'use client' component or
// anything that ends up in the browser bundle — it holds a private key.

const BASE = 'https://evm-rpc.test-net.interlinklabs.ai/v1/auth'
const CHAIN_ID = '19042026'

const SERVICE_WALLET_PRIVATE_KEY = process.env.SERVICE_WALLET_PRIVATE_KEY
if (!SERVICE_WALLET_PRIVATE_KEY) {
  // Fail loudly at import time rather than silently 401-ing on first request.
  console.error('SERVICE_WALLET_PRIVATE_KEY is not set — server-side reads will fail.')
}

const serviceWallet = SERVICE_WALLET_PRIVATE_KEY
  ? new ethers.Wallet(SERVICE_WALLET_PRIVATE_KEY)
  : null

interface TokenState {
  accessToken: string
  refreshToken: string
  accessExpiresAt: number
  refreshExpiresAt: number
}

// Module-level cache. Persists across warm invocations of the same server
// instance/lambda. On a cold start this resets to null and the first request
// pays the cost of a full challenge/verify — that's fine, it self-heals.
// If you deploy on Vercel with frequent cold starts and want to avoid the
// extra signature round trip, swap this for a small persistent store
// (Vercel KV / Upstash Redis / a DB row) using the same get/set shape.
let state: TokenState | null = null

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

async function verifyChallenge(): Promise<TokenState> {
  if (!serviceWallet) throw new Error('Service wallet not configured')

  const address = serviceWallet.address
  const { challengeId, messageToSign } = await requestChallenge(address)
  const signature = await serviceWallet.signMessage(messageToSign)

  const result = await postJson(`${BASE}/verify`, {
    walletAddress: address,
    signature,
    challengeId
  }) as {
    accessToken: string
    refreshToken: string
    accessTokenExpiresInSec: number
    refreshTokenExpiresInSec: number
  }

  const now = Date.now()
  const newState: TokenState = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    accessExpiresAt: now + result.accessTokenExpiresInSec * 1000,
    refreshExpiresAt: now + result.refreshTokenExpiresInSec * 1000
  }
  state = newState
  return newState
}

async function refreshAccessToken(current: TokenState): Promise<TokenState> {
  const result = await postJson(
    `${BASE}/refresh`,
    { refreshToken: current.refreshToken },
    current.accessToken // old bearer required in Authorization header
  ) as {
    accessToken: string
    refreshToken?: string
    accessTokenExpiresInSec: number
    refreshTokenExpiresInSec?: number
  }

  const now = Date.now()
  const newState: TokenState = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken ?? current.refreshToken,
    accessExpiresAt: now + result.accessTokenExpiresInSec * 1000,
    refreshExpiresAt: result.refreshTokenExpiresInSec
      ? now + result.refreshTokenExpiresInSec * 1000
      : current.refreshExpiresAt
  }
  state = newState
  return newState
}

/** Returns a valid bearer token for the service wallet, refreshing or
 *  re-authenticating as needed. Safe to call on every request — cheap
 *  when the cached token is still fresh. */
export async function getValidServiceToken(): Promise<string> {
  const now = Date.now()

  if (state && now < state.accessExpiresAt - 60_000) {
    return state.accessToken
  }

  if (state && now < state.refreshExpiresAt - 60_000) {
    try {
      const refreshed = await refreshAccessToken(state)
      return refreshed.accessToken
    } catch {
      // fall through to full re-auth
    }
  }

  const fresh = await verifyChallenge()
  return fresh.accessToken
}

export function getServiceWalletAddress(): string {
  if (!serviceWallet) throw new Error('Service wallet not configured')
  return serviceWallet.address
}
