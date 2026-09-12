// Client-side helpers for the Spin to Win backend. Browser-safe.
// Every call degrades gracefully: when the backend isn't configured/reachable,
// functions throw BackendUnavailableError so the UI can fall back to local
// (single-device) behavior.
'use client'

import { ethers } from 'ethers'
import type {
  AuthSession,
  ServerSpinState,
  TaskDto,
  MultiplierIntent,
  SocialLink,
  SocialProvider,
} from '@/lib/spin-to-win/types'

const TOKEN_KEY = 'interpredict_spin_token'
const BACKEND_FLAG_KEY = 'interpredict_spin_backend'

export class BackendUnavailableError extends Error {
  constructor() {
    super('Spin to Win backend is not configured.')
  }
}

export function getStoredToken(): { token: string; wallet: string } | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    return raw ? (JSON.parse(raw) as { token: string; wallet: string }) : null
  } catch {
    return null
  }
}

export function storeToken(session: AuthSession, wallet: string) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: session.accessToken, wallet }))
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function setBackendFlag(value: boolean) {
  localStorage.setItem(BACKEND_FLAG_KEY, value ? '1' : '0')
}

export function getBackendFlag(): boolean | null {
  const raw = localStorage.getItem(BACKEND_FLAG_KEY)
  return raw === '1' ? true : raw === '0' ? false : null
}

// Probe the backend once. Cached in localStorage so we don't hammer it.
export async function isBackendAvailable(force = false): Promise<boolean> {
  if (!force) {
    const cached = getBackendFlag()
    if (cached !== null) return cached
  }
  try {
    const res = await fetch('/api/spin-to-win/health', { method: 'GET' })
    if (!res.ok) {
      setBackendFlag(false)
      return false
    }
    const envelope = await res.json()
    const available = Boolean(envelope?.data?.configured)
    setBackendFlag(available)
    return available
  } catch {
    setBackendFlag(false)
    return false
  }
}

function normalizeAddress(addr: string): string {
  return addr.toLowerCase()
}

// Obtain the connected wallet's ethers signer (mirrors Web3Context).
export async function getSignerFor(wallet: string) {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('No wallet extension detected.')
  }
  const injectedProviders = (window as any).ethereum.providers as any[] | undefined
  const ethereum =
    injectedProviders?.find((candidate) => candidate.isMetaMask) || (window as any).ethereum
  const provider = new ethers.BrowserProvider(ethereum)
  const signer = await provider.getSigner()
  const address = normalizeAddress(await signer.getAddress())
  if (normalizeAddress(wallet) !== address) {
    throw new Error('Active wallet account does not match.')
  }
  return signer
}

async function apiFetch<T>(
  path: string,
  init: { method?: string; token?: string | null; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (init.token) headers['Authorization'] = `Bearer ${init.token}`
  const res = await fetch(path, {
    method: init.method || 'GET',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  const envelope = await res.json().catch(() => ({ data: null, error: null }))
  if (!res.ok || envelope.error) {
    const code = envelope?.error?.code || 'UNKNOWN'
    const message = envelope?.error?.message || `Request failed (${res.status})`
    throw new Error(`${code}: ${message}`)
  }
  return envelope.data as T
}

// Challenge → sign → verify. Returns the issued access token.
export async function authenticate(wallet: string): Promise<AuthSession> {
  const signer = await getSignerFor(wallet)
  const challengeEnvelope = await apiFetch<{
    challenge: { challengeId: string; messageToSign: string }
  }>('/api/spin-to-win/auth', { method: 'POST', body: { action: 'challenge', wallet } })
  const signature = await signer.signMessage(challengeEnvelope.challenge.messageToSign)
  const session = await apiFetch<AuthSession>('/api/spin-to-win/auth', {
    method: 'POST',
    body: {
      action: 'verify',
      wallet,
      challengeId: challengeEnvelope.challenge.challengeId,
      signature,
    },
  })
  storeToken(session, normalizeAddress(wallet))
  return session
}

export async function getServerState(
  sessionStart: number,
  token: string | null,
): Promise<ServerSpinState> {
  return apiFetch<ServerSpinState>(
    `/api/spin-to-win/state?sessionStart=${encodeURIComponent(String(sessionStart))}`,
    { token },
  )
}

export async function recordResult(
  token: string | null,
  payload: {
    sessionStart: number
    prizeIndex: number
    prizeLabel: string
    multiplier: number
    wonItp: string
    wonSpins: number
    merchantClientId: string
  },
): Promise<{ recorded: boolean; duplicate: boolean; spinId: string | null }> {
  return apiFetch('/api/spin-to-win/state', {
    method: 'POST',
    token,
    body: { action: 'record', ...payload },
  })
}

export async function reconcileState(
  token: string | null,
  payload: { sessionStart: number; bonusSpins: number; selectedMultiplier: number },
): Promise<ServerSpinState> {
  return apiFetch('/api/spin-to-win/state', {
    method: 'POST',
    token,
    body: { action: 'reconcile', ...payload },
  })
}

export async function getTasks(): Promise<{ sessionStart: number; tasks: TaskDto[] }> {
  return apiFetch('/api/spin-to-win/tasks', {})
}

export async function submitVerification(
  token: string | null,
  taskId: string,
  proofLink: string,
): Promise<{ submitted: boolean }> {
  return apiFetch('/api/spin-to-win/verify', {
    method: 'POST',
    token,
    body: { action: 'submit', taskId, proofLink },
  })
}

export async function approveVerification(
  token: string | null,
  verificationId: string,
  approved: boolean,
): Promise<{ approved: boolean }> {
  return apiFetch('/api/spin-to-win/verify', {
    method: 'POST',
    token,
    body: { action: 'approve', verificationId, approved },
  })
}

export async function createAdminTask(
  token: string | null,
  task: { title: string; href: string; kind: string; description?: string },
): Promise<{ id: string }> {
  return apiFetch('/api/spin-to-win/tasks', {
    method: 'POST',
    token,
    body: { action: 'create', ...task },
  })
}

export async function getAdminLedger(token: string | null): Promise<{
  ledger: Array<Record<string, unknown>>
  pendingVerifications: Array<Record<string, unknown>>
  recentActions: Array<Record<string, unknown>>
}> {
  return apiFetch('/api/spin-to-win/admin', { token })
}

export async function getSocialLinks(token: string | null): Promise<{ links: SocialLink[] }> {
  return apiFetch('/api/spin-to-win/social', { token })
}

export async function linkSocial(
  token: string | null,
  provider: SocialProvider,
  handle: string,
  providerAccountId = '',
): Promise<{ linked: boolean }> {
  return apiFetch('/api/spin-to-win/social', {
    method: 'POST',
    token,
    body: { action: 'link', provider, handle, providerAccountId },
  })
}

export async function requestPendingLink(
  token: string | null,
  provider: SocialProvider,
): Promise<{
  code: string
  expiresInSec: number
  instructions: string
}> {
  return apiFetch('/api/spin-to-win/social', {
    method: 'POST',
    token,
    body: { action: 'pending', provider },
  })
}

export async function verifyXAccountByTweet(
  token: string | null,
  handle: string,
  tweetUrl: string,
  code: string,
): Promise<{ verified: boolean; username?: string; tweetId?: string }> {
  return apiFetch('/api/spin-to-win/social', {
    method: 'POST',
    token,
    body: { action: 'verify-x', provider: 'x', handle, tweetUrl, code },
  })
}

export async function createMultiplierIntent(
  token: string | null,
  multiplier: number,
): Promise<MultiplierIntent> {
  return apiFetch('/api/spin-to-win/multiplier', {
    method: 'POST',
    token,
    body: { action: 'intent', multiplier },
  })
}

export async function confirmMultiplier(
  token: string | null,
  purchaseId: string,
  txHash: string,
): Promise<{ status: string; confirmed: boolean }> {
  return apiFetch('/api/spin-to-win/multiplier', {
    method: 'POST',
    token,
    body: { action: 'confirm', purchaseId, txHash },
  })
}

export function newMerchantClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `spin-${crypto.randomUUID()}`
  }
  return `spin-${Date.now()}-${Math.random().toString(36).slice(2)}`
}