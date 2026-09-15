import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { randomUUID } from 'crypto'
import { getSupabase } from '@/lib/supabase'
import { SPIN_SESSION_LENGTH_MS, getWindowStart } from '@/lib/spin-to-win/constants'
import type { ApiEnvelope } from '@/lib/spin-to-win/types'

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24h spin session token
const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export function normalizeAddress(addr: string): string {
  return addr.toLowerCase()
}

export function ok<T>(data: T, meta: Record<string, unknown> = {}): NextResponse {
  const envelope: ApiEnvelope<T> = { data, meta, error: null }
  return NextResponse.json(envelope)
}

export function fail(code: string, message: string, status = 400): NextResponse {
  const envelope: ApiEnvelope<null> = { data: null, meta: {}, error: { code, message } }
  return NextResponse.json(envelope, { status })
}

export function checksumAddress(addr: string): string {
  try {
    return ethers.getAddress(addr)
  } catch {
    return addr
  }
}

// ---------------------------------------------------------------------------
// Challenges & signed-wallet tokens
// ---------------------------------------------------------------------------

export async function createChallenge(wallet: string): Promise<{
  challengeId: string
  messageToSign: string
  expiresAt: number
}> {
  const supabase = getSupabase()
  const challengeId = randomUUID()
  const expiresAt = Date.now() + CHALLENGE_TTL_MS
  const messageToSign = [
    'InterPredict Spin to Win',
    `Wallet: ${checksumAddress(wallet)}`,
    `Nonce: ${challengeId}`,
    `Issued: ${new Date().toISOString()}`,
  ].join('\n')

  const { error } = await supabase.from('spin_auth_challenges').insert({
    id: challengeId,
    wallet: normalizeAddress(wallet),
    message_to_sign: messageToSign,
    expires_at: expiresAt,
    used: false,
  })
  // Ignore pre-existing superseded challenges from real-time duplicates; the
  // insert error for the same id is guarded by the unique PK.
  if (error) throw error

  return { challengeId, messageToSign, expiresAt }
}

export async function verifyChallenge(
  wallet: string,
  challengeId: string,
  signature: string,
): Promise<{ accessToken: string; expiresAt: number }> {
  const supabase = getSupabase()
  const now = Date.now()

  const { data: challenges, error: readError } = await supabase
    .from('spin_auth_challenges')
    .select('id, message_to_sign, expires_at, used')
    .eq('id', challengeId)
    .limit(1)
  if (readError) throw readError

  const challenge = Array.isArray(challenges) ? challenges[0] : null
  if (!challenge) throw new Error('Unknown challenge id.')
  if (challenge.used) throw new Error('Challenge already used.')
  if (challenge.expires_at < now) throw new Error('Challenge expired.')

  // Signature must recover to the exact claiming wallet.
  const recovered = ethers.verifyMessage(challenge.message_to_sign, signature)
  if (normalizeAddress(recovered) !== normalizeAddress(wallet)) {
    throw new Error('Signature does not match the claimed wallet.')
  }

  const { error: markError } = await supabase
    .from('spin_auth_challenges')
    .update({ used: true })
    .eq('id', challengeId)
  if (markError) throw markError

  const accessToken = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')
  const expiresAt = now + TOKEN_TTL_MS

  const { error: tokenError } = await supabase.from('spin_auth_tokens').insert({
    access_token: accessToken,
    wallet: normalizeAddress(wallet),
    expires_at: expiresAt,
  })
  if (tokenError) throw tokenError

  // Touch last_seen_at on the profile (create if needed).
  const { error: profileError } = await supabase.from('spin_profiles').upsert(
    {
      wallet: normalizeAddress(wallet),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'wallet', ignoreDuplicates: false },
  )
  if (profileError) {
    // Profile upsert is best-effort; never block auth on it.
    console.warn('[spin] profile upsert failed:', profileError)
  }

  return { accessToken, expiresAt }
}

// ---------------------------------------------------------------------------
// Bearer token auth for protected routes
// ---------------------------------------------------------------------------

export async function requireAuth(
  request: NextRequest,
): Promise<{ wallet: string; isAdmin: boolean }> {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) throw new Error('Missing bearer token.')

  const supabase = getSupabase()
  const { data: tokens, error } = await supabase
    .from('spin_auth_tokens')
    .select('wallet, expires_at')
    .eq('access_token', token)
    .limit(1)
  if (error) throw error
  const row = Array.isArray(tokens) ? tokens[0] : null
  if (!row) throw new Error('Invalid token.')
  if (Number(row.expires_at) < Date.now()) throw new Error('Token expired.')

  const wallet = normalizeAddress(String(row.wallet))

  // Admin check via the spin_admins table.
  const { data: admins } = await supabase
    .from('spin_admins')
    .select('wallet')
    .eq('wallet', wallet)
    .limit(1)
  const isAdmin = Array.isArray(admins) && admins.length > 0

  return { wallet, isAdmin }
}

export async function requireAdmin(request: NextRequest): Promise<string> {
  const { wallet, isAdmin } = await requireAuth(request)
  if (!isAdmin) throw new Error('Admin role required.')
  return wallet
}

export function currentSessionStart(nowMs = Date.now()): number {
  return getWindowStart(nowMs)
}

export { SPIN_SESSION_LENGTH_MS }