import { NextRequest } from 'next/server'
import {
  normalizeAddress,
  ok,
  fail,
} from '@/lib/spin-to-win/server/helpers'
import { getSupabase } from '@/lib/supabase'

// Telegram bot webhook for Spin to Win social verification.
// Set your bot's webhook to:
//   https://<your-domain>/api/spin-to-win/telegram
// with the secret token env SPIN_TELEGRAM_WEBHOOK_SECRET. The bot will then
// confirm that a wallet's one-time code was sent by a specific Telegram user
// (stable numeric id) and store that as the verified social account.
export const dynamic = 'force-dynamic'

const BOT_TOKEN = process.env.SPIN_TELEGRAM_BOT_TOKEN || ''

const TELEGRAM_API = 'https://api.telegram.org'

export async function POST(request: NextRequest) {
  try {
    if (!BOT_TOKEN) {
      return fail('NOT_CONFIGURED', 'SPIN_TELEGRAM_BOT_TOKEN is not set.', 500)
    }

    const secret = request.headers.get('x-telegram-bot-api-secret-token') || ''
    const expectedSecret = process.env.SPIN_TELEGRAM_WEBHOOK_SECRET || ''
    if (!expectedSecret || secret !== expectedSecret) {
      return fail('FORBIDDEN', 'Invalid webhook secret.', 403)
    }

    const body = await request.json().catch(() => null)
    if (!body) return fail('BAD_PAYLOAD', 'Invalid Telegram update.', 400)

    const message = body.message
    if (!message) return ok({ ignored: true }) // not a user message

    const from = message.from
    const chatId = String(message.chat?.id || from?.id || '')
    const telegramUserId = String(from?.id || '')
    const username = String(from?.username || telegramUserId).replace(/^@/, '').toLowerCase()
    // Telegram forwards the code as-is (tokens are uppercase, no spaces).
    const text = String(message.text || '').trim().toUpperCase()

    if (!chatId || !text) return ok({ ignored: true })

    const supabase = getSupabase()
    const { data: pendingRows, error: readError } = await supabase
      .from('social_pending_links')
      .select('*')
      .eq('code', text)
      .eq('provider', 'telegram')
      .eq('used', false)
      .limit(1)
    if (readError) throw readError
    const pending = Array.isArray(pendingRows) ? pendingRows[0] : null

    if (!pending) {
      const denied = await sendMessage(chatId, 'That code is invalid or already used.')
      void denied
      return ok({ ignored: true })
    }
    if (Number(pending.expires_at) < Date.now()) {
      const expired = await sendMessage(chatId, 'That code has expired. Please request a new one.')
      void expired
      return ok({ ignored: true })
    }

    // Mark the code used.
    const { error: consumeError } = await supabase
      .from('social_pending_links')
      .update({ used: true })
      .eq('id', pending.id)
    if (consumeError) throw consumeError

    const walletKey = normalizeAddress(String(pending.wallet))

    // Insert (or update) the verified social link. The DB unique constraints on
    // (provider, provider_account_id) and (provider, handle) guarantee this
    // Telegram account can only ever be bound to one wallet — enforce friendly
    // errors here.
    const result = await supabase
      .from('social_account_links')
      .upsert(
        {
          wallet: walletKey,
          provider: 'telegram',
          provider_account_id: telegramUserId,
          handle: username,
          verified: true,
          verified_at: new Date().toISOString(),
        },
        { onConflict: 'provider,provider_account_id' },
      )
    if (result.error) {
      const msg = String(result.error.message || result.error.details || '').toLowerCase()
      if (msg.includes('wallet, provider') || msg.includes('duplicate key')) {
        const taken = await sendMessage(chatId, 'This Telegram account is already linked to another wallet.')
        void taken
        return ok({ ignored: true })
      }
      throw result.error
    }

    const sent = await sendMessage(
      chatId,
      `✅ Verified! Your Telegram (@${username}) is now linked to wallet ${walletKey.slice(0, 8)}…`,
    )
    void sent

    return ok({ verified: true, telegramUserId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Telegram webhook failed.'
    console.error('[spin/telegram] Error:', error)
    return fail('TELEGRAM_FAILED', message, 500)
  }
}

async function sendMessage(chatId: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    return res.ok
  } catch {
    return false
  }
}