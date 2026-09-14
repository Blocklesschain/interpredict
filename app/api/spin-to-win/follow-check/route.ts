import { NextRequest } from 'next/server'
import {
  requireAuth,
  normalizeAddress,
  ok,
  fail,
} from '@/lib/spin-to-win/server/helpers'
import { getSupabase } from '@/lib/supabase'
import { checkXFollow, checkTelegramMembership } from '@/lib/spin-to-win/server/followCheck'

export const dynamic = 'force-dynamic'

const ALLOWED_PROVIDERS = ['x', 'telegram']

// POST { provider, username } → verifies the user actually follows our X /
// Telegram channel using platform data (no codes), then records the verified
// social account. Returns a clear message if they are not following yet.
export async function POST(request: NextRequest) {
  try {
    const { wallet } = await requireAuth(request)
    const walletKey = normalizeAddress(wallet)
    const body = await request.json().catch(() => ({}))
    const provider = String(body.provider || '')
    const username = String(body.username || '').trim().replace(/^@/, '').toLowerCase()

    if (!ALLOWED_PROVIDERS.includes(provider)) {
      return fail('BAD_PROVIDER', 'provider must be x or telegram.')
    }
    if (!username) return fail('MISSING_USERNAME', 'username is required.')

    let result: { ok: boolean; userId?: string; username?: string; handle?: string; status?: string; reason?: string }
    if (provider === 'x') {
      result = await checkXFollow(username)
    } else {
      result = await checkTelegramMembership(username)
    }

    if (!result.ok) {
      return fail('NOT_FOLLOWING', result.reason || 'Could not verify the follow.', 422)
    }

    const supabase = getSupabase()
    const providerAccountId = result.userId || ''
    const handle = provider === 'x' ? String(result.username || username) : String(result.handle || username)

    const linkResult = await supabase
      .from('social_account_links')
      .upsert(
        {
          wallet: walletKey,
          provider,
          provider_account_id: providerAccountId,
          handle: handle.toLowerCase(),
          verified: true,
          verified_at: new Date().toISOString(),
        },
        { onConflict: 'provider,provider_account_id' },
      )
    if (linkResult.error) {
      const msg = String(linkResult.error.message || linkResult.error.details || '').toLowerCase()
      if (msg.includes('unique')) {
        return fail(
          'ACCOUNT_ALREADY_LINKED',
          'This social account or handle is already linked to another wallet.',
          409,
        )
      }
      throw linkResult.error
    }

    return ok({ verified: true, handle: handle.toLowerCase(), provider })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Follow verification failed.'
    console.error('[spin/follow-check] Error:', error)
    return fail('FOLLOW_CHECK_FAILED', message, 400)
  }
}