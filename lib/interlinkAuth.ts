import { ethers } from 'ethers'

const BASE = 'https://evm-rpc.test-net.interlinklabs.ai/v1/auth'
const CHAIN_ID = '19042026'

interface TokenState {
  accessToken: string
  refreshToken: string
  accessExpiresAt: number   // ms epoch
  refreshExpiresAt: number  // ms epoch
}

const memCache = new Map<string, TokenState>() // keyed by lowercase wallet address

function storageKey(address: string) {
  return `interlink_auth_${address.toLowerCase()}`
}

function loadState(address: string): TokenState | null {
  const cached = memCache.get(address.toLowerCase())
  if (cached) return cached
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(storageKey(address))
  if (!raw) return null
  const parsed = JSON.parse(raw) as TokenState
  memCache.set(address.toLowerCase(), parsed)
  return parsed
}

function saveState(address: string, state: TokenState) {
  memCache.set(address.toLowerCase(), state)
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey(address), JSON.stringify(state))
  }
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

// Step 1: challenge
async function requestChallenge(address: string) {
  return postJson(`${BASE}/challenge`, {
    chainId: CHAIN_ID,
    walletAddress: address
  }) as Promise<{ challengeId: string; messageToSign: string; expiresAt: string }>
}

// Step 2: sign + verify
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

// Step 3: silent refresh — needs the OLD/expiring bearer token in the Authorization header
// plus the refresh token in the body.
async function refreshAccessToken(address: string, state: TokenState) {
  const result = await postJson(
    `${BASE}/refresh`,
    { refreshToken: state.refreshToken },
    state.accessToken // <-- required: old bearer goes in Authorization header
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

/**
 * Main entry point. Call this right before any authenticated RPC call.
 * Returns a valid bearer token — refreshing silently, or doing a full
 * challenge/verify (which needs a wallet signature) only when required.
 */
export async function getValidToken(address: string, signer: ethers.Signer): Promise<string> {
  const now = Date.now()
  let state = loadState(address)

  // Bearer still good (60s safety buffer before its real 15-min expiry)
  if (state && now < state.accessExpiresAt - 60_000) {
    console.log(`[interlinkAuth] Using cached token for ${address}, expires ${new Date(state.accessExpiresAt).toLocaleTimeString()}`)
    return state.accessToken
  }

  // Bearer expired/expiring, but refresh token (7-day life) still valid -> silent refresh
  if (state && now < state.refreshExpiresAt - 60_000) {
    try {
      console.log(`[interlinkAuth] Access token expired for ${address} — refreshing silently...`)
      state = await refreshAccessToken(address, state)
      console.log(`[interlinkAuth] Refreshed OK. New expiry: ${new Date(state.accessExpiresAt).toLocaleTimeString()}`)
      return state.accessToken
    } catch (err: any) {
      console.warn(`[interlinkAuth] Silent refresh failed for ${address}: ${err.message} — falling back to full re-auth`)
      // refresh token rejected server-side (revoked, clock skew, etc.) -> fall through
    }
  }

  // No usable state, or refresh failed -> full challenge/verify, requires a signature
  console.log(`[interlinkAuth] No valid session for ${address} — requesting wallet signature...`)
  state = await verifyChallenge(address, signer)
  console.log(`[interlinkAuth] New session established. Access expires ${new Date(state.accessExpiresAt).toLocaleTimeString()}, refresh expires ${new Date(state.refreshExpiresAt).toLocaleDateString()}`)
  return state.accessToken
}

/** Seed an already-obtained refresh token so the next call does a silent refresh
 *  instead of prompting a new signature. */
export function seedRefreshToken(address: string, refreshToken: string, refreshTokenExpiresInSec = 604800) {
  const now = Date.now()
  saveState(address, {
    accessToken: '',
    refreshToken,
    accessExpiresAt: 0, // forces refresh on next call
    refreshExpiresAt: now + refreshTokenExpiresInSec * 1000
  })
}

export function clearAuthState(address: string) {
  memCache.delete(address.toLowerCase())
  if (typeof window !== 'undefined') {
    localStorage.removeItem(storageKey(address))
  }
}