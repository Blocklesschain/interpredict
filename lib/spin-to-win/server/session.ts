import 'server-only'
import { randomUUID } from 'crypto'
import { getSupabase } from '@/lib/supabase'
import { normalizeAddress } from '@/lib/spin-to-win/server/helpers'
import { getDayStart } from '@/lib/spin-to-win/constants'
import type { ServerSpinState, SocialProvider } from '@/lib/spin-to-win/types'

// ---------------------------------------------------------------------------
// Load the authoritative server-side spin state for a wallet + session.
// ---------------------------------------------------------------------------

export async function loadServerState(
  wallet: string,
  sessionStart: number,
): Promise<ServerSpinState> {
  const supabase = getSupabase()
  const walletKey = normalizeAddress(wallet)
  const dayStart = getDayStart(Date.now())

  const { data: sessionRows } = await supabase
    .from('spin_sessions')
    .select('spins_used, bonus_spins, selected_multiplier, multiplier_confirmed')
    .eq('wallet', walletKey)
    .eq('session_start', sessionStart)
    .limit(1)
  const session = Array.isArray(sessionRows) ? sessionRows[0] : null

  const { data: verificationRows } = await supabase
    .from('spin_task_verifications')
    .select('task_id')
    .eq('wallet', walletKey)
    .eq('day_start', dayStart)
    .eq('verified', true)
  const verifiedTaskIds = (Array.isArray(verificationRows) ? verificationRows : [])
    .map((row) => `${dayStart}-${row.task_id}`)

  const { data: social } = await supabase
    .from('social_account_links')
    .select('provider, handle, verified')
    .eq('wallet', walletKey)
  const socialRows = Array.isArray(social) ? social : []
  const accounts: { x: string | null; telegram: string | null } = { x: null, telegram: null }
  const verifiedSocial: { x: boolean; telegram: boolean } = { x: false, telegram: false }
  for (const row of socialRows) {
    const provider = row.provider as SocialProvider
    if (provider === 'x' || provider === 'telegram') {
      verifiedSocial[provider] = Boolean(row.verified)
      // Only expose a handle once it is VERIFIED, so the client can never
      // unlock the spinner off an unverified link.
      if (row.verified) accounts[provider] = row.handle
    }
  }

  const { data: profiles } = await supabase
    .from('spin_profiles')
    .select('total_won_itp, total_spins')
    .eq('wallet', walletKey)
    .limit(1)
  const profile = Array.isArray(profiles) ? profiles[0] : null

  return {
    wallet: walletKey,
    sessionStart,
    dayStart,
    spinsUsed: Number(session?.spins_used || 0),
    bonusSpins: Number(session?.bonus_spins || 0),
    verifiedTaskIds,
    accounts,
    verifiedSocial,
    wonItp: profile ? String(profile.total_won_itp || 0) : '0',
    multiplier: Number(session?.selected_multiplier || 1),
    multiplierConfirmed: Boolean(session?.multiplier_confirmed || false),
  }
}

// ---------------------------------------------------------------------------
// Record a spin outcome into the global ledger (requirement #1).
// Idempotent via merchant_client_id; bumps the session counter.
// ---------------------------------------------------------------------------

export async function recordResult(
  wallet: string,
  sessionStart: number,
  body: Record<string, unknown>,
  isAdmin: boolean,
): Promise<{ recorded: boolean; duplicate: boolean; spinId: string | null }> {
  const supabase = getSupabase()
  const walletKey = normalizeAddress(wallet)
  const merchantClientId = String(body.merchantClientId || randomUUID())
  const normalizedSessionStart = Number(body.sessionStart || sessionStart)
  const prizeIndex = Number(body.prizeIndex)
  const prizeLabel = String(body.prizeLabel || '')
  const multiplier = Number(body.multiplier || 1)
  const wonItp = String(body.wonItp || '0')
  const wonSpins = Number(body.wonSpins || 0)

  const { data: inserted, error } = await supabase
    .from('spin_results')
    .insert({
      id: randomUUID(),
      merchant_client_id: merchantClientId,
      session_start: normalizedSessionStart,
      wallet: walletKey,
      prize_index: prizeIndex,
      prize_label: prizeLabel,
      multiplier,
      won_itp: wonItp,
      won_spins: wonSpins,
      recorded_by: isAdmin ? walletKey : null,
    })
    .select('id')
    .maybeSingle()

  if (error) {
    const isConflict = String(error.message || error.details || '').toLowerCase().includes('duplicate')
    if (isConflict) return { recorded: false, duplicate: true, spinId: null }
    throw error
  }
  const spinId = inserted ? String(inserted.id) : null

  // Bump session counters. Base usage is derived (max(0,3-base)+bonus).
  const { data: sessionRows } = await supabase
    .from('spin_sessions')
    .select('spins_used, bonus_spins')
    .eq('wallet', walletKey)
    .eq('session_start', normalizedSessionStart)
    .limit(1)
  const existing = Array.isArray(sessionRows) ? sessionRows[0] : null
  const nextSpinsUsed = Number(existing?.spins_used || 0) + 1
  const nextBonus = Math.max(0, Number(existing?.bonus_spins || 0) - (nextSpinsUsed > 3 ? 1 : 0))

  const { error: upsertError } = await supabase.from('spin_sessions').upsert(
    {
      wallet: walletKey,
      session_start: normalizedSessionStart,
      spins_used: nextSpinsUsed,
      bonus_spins: nextBonus,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'wallet,session_start' },
  )
  if (upsertError) throw upsertError

  // Lifetime totals.
  const { data: profileRows } = await supabase
    .from('spin_profiles')
    .select('total_spins, total_won_itp, won_spins')
    .eq('wallet', walletKey)
    .limit(1)
  const profile = Array.isArray(profileRows) ? profileRows[0] : null
  const totalItp = BigInt(String(profile?.total_won_itp || '0')) + BigInt(wonItp)
  const profileResult = await supabase.from('spin_profiles').upsert(
    {
      wallet: walletKey,
      total_spins: Number(profile?.total_spins || 0) + 1,
      total_won_itp: totalItp.toString(),
      won_spins: Number(profile?.won_spins || 0) + wonSpins,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'wallet' },
  )
  if (profileResult.error) throw profileResult.error

  return { recorded: true, duplicate: false, spinId }
}

// ---------------------------------------------------------------------------
// Reconcile client session fields we mirror server-side (bonus, multiplier).
// ---------------------------------------------------------------------------

export async function reconcileSession(
  wallet: string,
  sessionStart: number,
  body: Record<string, unknown>,
): Promise<ServerSpinState> {
  const supabase = getSupabase()
  const walletKey = normalizeAddress(wallet)
  const bonusSpins = Number(body.bonusSpins || 0)
  const selectedMultiplier = Number(body.selectedMultiplier || 1)

  const result = await supabase.from('spin_sessions').upsert(
    {
      wallet: walletKey,
      session_start: sessionStart,
      bonus_spins: bonusSpins,
      selected_multiplier: selectedMultiplier,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'wallet,session_start' },
  )
  if (result.error) throw result.error

  return loadServerState(walletKey, sessionStart)
}