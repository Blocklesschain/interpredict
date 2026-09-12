import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import {
  requireAuth,
  normalizeAddress,
  ok,
  fail,
} from '@/lib/spin-to-win/server/helpers'
import { getSupabase } from '@/lib/supabase'
import { verifyTweet, parseTweetId } from '@/lib/spin-to-win/server/xVerify'

export const dynamic = 'force-dynamic'

const ALLOWED_PROVIDERS = ['x', 'telegram']
const PENDING_TTL_MS = 10 * 60 * 1000 // 10 minutes
const BOT_HANDLE = process.env.SPIN_TELEGRAM_BOT_HANDLE
function newCode(): string {
  // 8-char, unambiguous, uppercase.
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function GET(request: NextRequest) {
  try {
    const { wallet } = await requireAuth(request)
    const supabase = getSupabase()
    const { data: rows, error } = await supabase
      .from('social_account_links')
      .select('provider, handle, verified')
      .eq('wallet', normalizeAddress(wallet))
    if (error) throw error
    return ok({ links: Array.isArray(rows) ? rows : [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load social links.'
    console.error('[spin/social] Error:', error)
    return fail('SOCIAL_FAILED', message, 401)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { wallet } = await requireAuth(request)
    const walletKey = normalizeAddress(wallet)
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || '')
    const provider = String(body.provider || '')

    if (action === 'pending') {
      if (!ALLOWED_PROVIDERS.includes(provider)) {
        return fail('BAD_PROVIDER', 'provider must be x or telegram.')
      }
      const supabase = getSupabase()
      const code = newCode()
      const id = randomUUID()
      const { error: insertError } = await supabase.from('social_pending_links').insert({
        id,
        wallet: walletKey,
        provider,
        code,
        expires_at: Date.now() + PENDING_TTL_MS,
        used: false,
      })
      if (insertError) throw insertError
      return ok({
        code,
        expiresInSec: PENDING_TTL_MS / 1000,
        instructions:
          provider === 'telegram'
            ? `Open Telegram, message @${BOT_HANDLE} with exactly: ${code}`
            : `Post a tweet containing exactly: ${code} (then submit its URL)`,
      })
    }

    if (action === 'verify-x') {
      if (provider !== 'x') return fail('BAD_PROVIDER', "provider must be 'x'.")
      const tweetUrl = String(body.tweetUrl || '').trim()
      const claimedHandle = String(body.handle || '').trim().replace(/^@/, '').toLowerCase()
      if (!tweetUrl || !claimedHandle) return fail('MISSING_FIELDS', 'tweetUrl and handle are required.')

      const tweetId = parseTweetId(tweetUrl)
      if (!tweetId) return fail('BAD_TWEET_URL', 'Could not read a status id from that tweet URL.')

      const code = String(body.code || '')
      if (!code) return fail('MISSING_CODE', 'The one-time verification code is required.')

      const supabase = getSupabase()
      const { data: pendingRows, error: readError } = await supabase
        .from('social_pending_links')
        .select('*')
        .eq('code', code)
        .eq('provider', 'x')
        .eq('wallet', walletKey)
        .eq('used', false)
        .limit(1)
      if (readError) throw readError
      const pending = Array.isArray(pendingRows) ? pendingRows[0] : null
      if (!pending) return fail('BAD_CODE', 'The verification code is invalid or already used.', 422)
      if (Number(pending.expires_at) < Date.now()) {
        return fail('CODE_EXPIRED', 'The verification code has expired. Please request a new one.', 422)
      }

      const result = await verifyTweet({
        tweetId,
        claimedHandle,
        expectedCode: code,
      })
      if (!result.ok) {
        return fail('X_VERIFICATION_FAILED', result.reason || 'Could not verify the tweet.', 422)
      }

      // Mark the code used.
      const { error: consumeError } = await supabase
        .from('social_pending_links')
        .update({ used: true })
        .eq('id', pending.id)
      if (consumeError) throw consumeError

      // Bind the verified X account (checks uniqueness across wallets at the DB level).
      const linkResult = await supabase
        .from('social_account_links')
        .upsert(
          {
            wallet: walletKey,
            provider: 'x',
            provider_account_id: String(result.authorId || ''),
            handle: claimedHandle,
            verified: true,
            verified_at: new Date().toISOString(),
          },
          { onConflict: 'provider,provider_account_id' },
        )
      if (linkResult.error) {
        const msg = String(linkResult.error.message || linkResult.error.details || '').toLowerCase()
        if (msg.includes('duplicate')) {
          return fail('ACCOUNT_ALREADY_LINKED', 'This X account is already linked to another wallet.', 409)
        }
        throw linkResult.error
      }

      return ok({ verified: true, username: result.username, tweetId: result.tweetId })
    }

    if (action !== 'link') {
      return fail('BAD_ACTION', `Unknown action '${action}'.`)
    }

    const handle = String(body.handle || '').trim().replace(/^@/, '').toLowerCase()
    const providerAccountId = String(body.providerAccountId || '')

    if (action === 'link' && !ALLOWED_PROVIDERS.includes(provider)) {
      return fail('BAD_PROVIDER', 'provider must be x or telegram.')
    }
    if (action === 'link' && !handle) return fail('MISSING_HANDLE', 'handle is required.')

    const supabase = getSupabase()

    // If this wallet already linked the exact same handle, treat as idempotent success.
    if (providerAccountId) {
      const { data: mine } = await supabase
        .from('social_account_links')
        .select('provider, provider_account_id, handle')
        .eq('wallet', walletKey)
        .eq('provider', provider)
        .limit(1)
      const mineRow = Array.isArray(mine) ? mine[0] : null
      if (mineRow && String(mineRow.provider_account_id) === providerAccountId) {
        return ok({ linked: true, duplicate: false, alreadyMine: true })
      }
    }

    const { error } = await supabase.from('social_account_links').insert({
      wallet: walletKey,
      provider,
      provider_account_id: providerAccountId,
      handle,
      verified: false,
    })

    if (error) {
      const msg = String(error.message || error.details || '').toLowerCase()
      if (msg.includes('duplicate') || msg.includes('unique')) {
        return fail(
          'ACCOUNT_ALREADY_LINKED',
          'This social account or handle is already linked to another wallet.',
          409,
        )
      }
      throw error
    }

    return ok({ linked: true, duplicate: false, alreadyMine: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to link account.'
    console.error('[spin/social] Error:', error)
    return fail('SOCIAL_FAILED', message, 400)
  }
}