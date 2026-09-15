import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/spin-to-win/server/helpers'
import { getSupabase } from '@/lib/supabase'
import { TELEGRAM_CHANNEL } from '@/lib/spin-to-win/server/followCheck'

// Telegram bot webhook for Spin to Win social verification.
// Set your bot's webhook to:
//   https://<your-domain>/api/spin-to-win/telegram
// with the secret token env SPIN_TELEGRAM_WEBHOOK_SECRET. This endpoint does NOT
// use codes. When a user messages the bot (e.g. taps Start), it records the
// user's stable numeric id + username so the follow-check flow can later confirm
// they are a member of our channel via Bot API getChatMember.
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
    if (!message) return ok({ ignored: true })
    const from = message.from
    const chatId = String(message.chat?.id || from?.id || '')
    const telegramUserId = String(from?.id || '')
    if (!telegramUserId || !from?.username) return ok({ ignored: true })
    const username = String(from.username).replace(/^@/, '').toLowerCase()

    const supabase = getSupabase()
    const { error } = await supabase.from('telegram_identities').upsert(
      {
        username,
        user_id: telegramUserId,
        handle: username,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'username' },
    )
    if (error) throw error

    // No secret codes here — just a friendly nudge to join the channel.
    if (chatId) {
      const sent = await sendMessage(
        chatId,
        `Got it, @${username}! ✅ Now open @${TELEGRAM_CHANNEL}, join the channel, then return to the site and tap "Verify" with your username.`,
      )
      void sent
    }

    return ok({ recorded: true, telegramUserId, username })
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