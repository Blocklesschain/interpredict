import { NextRequest } from 'next/server'
import {
  requireAuth,
  normalizeAddress,
  ok,
  fail,
} from '@/lib/spin-to-win/server/helpers'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ALLOWED_PROVIDERS = ['x', 'telegram']

// GET: list this wallet's linked social accounts.
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

// POST: minimal link fallback (normally flows through /follow-check so an account
// is only marked verified after real follow verification).
export async function POST(request: NextRequest) {
  try {
    const { wallet } = await requireAuth(request)
    const walletKey = normalizeAddress(wallet)
    const body = await request.json().catch(() => ({}))
    const provider = String(body.provider || '')
    const handle = String(body.handle || '').trim().replace(/^@/, '').toLowerCase()
    const providerAccountId = String(body.providerAccountId || '')

    if (!ALLOWED_PROVIDERS.includes(provider)) {
      return fail('BAD_PROVIDER', 'provider must be x or telegram.')
    }
    if (!handle) return fail('MISSING_HANDLE', 'handle is required.')

    const supabase = getSupabase()
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