import 'server-only'
import { ethers } from 'ethers'

// This module must remain server-only because it accesses a private key.

const BASE = 'https://evm-rpc.test-net.interlinklabs.ai/v1/auth'
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
    return new ethers.Wallet(SERVICE_WALLET_PRIVATE_KEY)
  } catch (error) {
    console.error(
      'SERVICE_WALLET_PRIVATE_KEY is invalid.',
      error
    )
    return null
  }
}

const serviceWallet = createServiceWallet()

interface TokenState {
  accessToken: string
  refreshToken: string
  accessExpiresAt: number
  refreshExpiresAt: number
}

interface ChallengeResponse {
  challengeId: string
  messageToSign: string
  expiresAt: string
}

interface VerifyResponse {
  accessToken: string
  refreshToken: string
  accessTokenExpiresInSec: number
  refreshTokenExpiresInSec: number
}

interface RefreshResponse {
  accessToken: string
  refreshToken?: string
  accessTokenExpiresInSec: number
  refreshTokenExpiresInSec?: number
}

// This cache survives warm serverless invocations.
// It resets whenever Netlify starts a new function instance.
let state: TokenState | null = null

async function postJson<T>(
  url: string,
  body: unknown,
  bearerToken?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    cache: 'no-store'
  })

  let json: any

  try {
    json = await response.json()
  } catch {
    throw new Error(
      `InterLink authentication returned an invalid response (${response.status})`
    )
  }

  if (!response.ok || json?.error) {
    const message =
      json?.error?.message ||
      json?.error ||
      json?.message ||
      `Request to ${url} failed (${response.status})`

    throw new Error(String(message))
  }

  if (json?.result === undefined) {
    throw new Error(
      `InterLink authentication response did not contain a result`
    )
  }

  return json.result as T
}

async function requestChallenge(
  address: string
): Promise<ChallengeResponse> {
  return postJson<ChallengeResponse>(
    `${BASE}/challenge`,
    {
      chainId: CHAIN_ID,
      walletAddress: address
    }
  )
}

async function verifyChallenge(): Promise<TokenState> {
  if (!serviceWallet) {
    throw new Error('Service wallet not configured')
  }

  const address = serviceWallet.address

  const {
    challengeId,
    messageToSign
  } = await requestChallenge(address)

  const signature =
    await serviceWallet.signMessage(messageToSign)

  const result = await postJson<VerifyResponse>(
    `${BASE}/verify`,
    {
      walletAddress: address,
      signature,
      challengeId
    }
  )

  const now = Date.now()

  const newState: TokenState = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    accessExpiresAt:
      now + result.accessTokenExpiresInSec * 1000,
    refreshExpiresAt:
      now + result.refreshTokenExpiresInSec * 1000
  }

  state = newState
  return newState
}

async function refreshAccessToken(
  current: TokenState
): Promise<TokenState> {
  const result = await postJson<RefreshResponse>(
    `${BASE}/refresh`,
    {
      refreshToken: current.refreshToken
    },
    current.accessToken
  )

  const now = Date.now()

  const newState: TokenState = {
    accessToken: result.accessToken,
    refreshToken:
      result.refreshToken ?? current.refreshToken,
    accessExpiresAt:
      now + result.accessTokenExpiresInSec * 1000,
    refreshExpiresAt:
      result.refreshTokenExpiresInSec !== undefined
        ? now + result.refreshTokenExpiresInSec * 1000
        : current.refreshExpiresAt
  }

  state = newState
  return newState
}

/**
 * Returns a valid InterLink RPC bearer token.
 *
 * It reuses a cached access token, refreshes it when possible,
 * or performs a new wallet challenge when necessary.
 */
export async function getValidServiceToken(): Promise<string> {
  if (!serviceWallet) {
    throw new Error('Service wallet not configured')
  }

  const now = Date.now()
  const safetyWindowMs = 60_000

  if (
    state &&
    now < state.accessExpiresAt - safetyWindowMs
  ) {
    return state.accessToken
  }

  if (
    state &&
    now < state.refreshExpiresAt - safetyWindowMs
  ) {
    try {
      const refreshed =
        await refreshAccessToken(state)

      return refreshed.accessToken
    } catch (error) {
      console.warn(
        'InterLink token refresh failed; requesting a new challenge.',
        error
      )

      state = null
    }
  }

  const fresh = await verifyChallenge()
  return fresh.accessToken
}

/**
 * Returns the public address of the configured service wallet.
 */
export function getServiceWalletAddress(): string {
  if (!serviceWallet) {
    throw new Error('Service wallet not configured')
  }

  return serviceWallet.address
}