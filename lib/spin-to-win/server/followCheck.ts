// Server-only follow verification for the Spin to Win social connect flow.
//
// Option A approach (no codes):
//   - X:        does `username` follow @targetUsername? We resolve both usernames
//               to user ids, then scan @targetUsername's followers list for id.
//               Works with app-only OAuth for public accounts.
//   - Telegram: does `username` belong to our channel? The user first messages
//               the bot once (proving phone/account control); that binds their
//               numeric Telegram id. We then call Bot API getChatMember with the
//               channel handle to confirm membership.
import 'server-only'

const X_API = 'https://api.twitter.com/2'

export const X_TARGET_USERNAME = process.env.SPIN_X_TARGET_USERNAME || 'InterPredict'

const X_FOLLOWER_PAGES = Number(process.env.SPIN_X_FOLLOWER_PAGES || 3)

let xBearer: string | null = null

async function getXBearer(): Promise<string> {
  if (xBearer) return xBearer
  const direct = process.env.SPIN_X_BEARER_TOKEN?.trim()
  if (direct) {
    xBearer = direct
    return direct
  }
  const apiKey = process.env.SPIN_X_API_KEY?.trim()
  const apiSecret = process.env.SPIN_X_API_SECRET?.trim()
  if (!apiKey || !apiSecret) {
    throw new Error('X verification is not configured (set SPIN_X_API_KEY/SECRET or SPIN_X_BEARER_TOKEN).')
  }
  const basic = Buffer.from(`${encodeURIComponent(apiKey)}:${encodeURIComponent(apiSecret)}`).toString('base64')
  const res = await fetch('https://api.twitter.com/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`X OAuth token request failed (${res.status}).`)
  const json = await res.json()
  const token = json?.access_token
  if (!token) throw new Error('X OAuth token response missing access_token.')
  xBearer = token
  return token
}

async function xApiGet(path: string): Promise<any> {
  const token = await getXBearer()
  const res = await fetch(`${X_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (res.status === 403) {
    throw new Error('X API access denied. Verify the app has "Read" permission and the target account is public.')
  }
  if (!res.ok) throw new Error(`X API request failed (${res.status}).`)
  return res.json()
}

async function resolveXUser(username: string): Promise<{ id: string; username: string } | null> {
  const data = await xApiGet(`/users/by/username/${encodeURIComponent(username)}?user.fields=id,username`)
  const user = data?.data
  if (!user) return null
  return { id: String(user.id), username: String(user.username) }
}

async function userFollowsTarget(userId: string, targetId: string): Promise<boolean> {
  const maxPerPage = 1000
  let paginationToken: string | null = null
  for (let page = 0; page < X_FOLLOWER_PAGES; page += 1) {
    const suffix = paginationToken
      ? `?max_results=${maxPerPage}&pagination_token=${encodeURIComponent(paginationToken)}`
      : `?max_results=${maxPerPage}`
    const data = await xApiGet(`/users/${targetId}/followers${suffix}`)
    const rows = data?.data
    if (Array.isArray(rows) && rows.some((row: any) => String(row.id) === userId)) {
      return true
    }
    paginationToken = data?.meta?.next_token
    if (!paginationToken) break
  }
  return false
}

export async function checkXFollow(username: string): Promise<{
  ok: boolean
  userId?: string
  username?: string
  reason?: string
}> {
  try {
    const clean = username.trim().replace(/^@/, '').toLowerCase()
    const user = await resolveXUser(clean)
    if (!user) return { ok: false, reason: `No public X account found for @${clean}.` }
    const target = await resolveXUser(X_TARGET_USERNAME)
    if (!target) return { ok: false, reason: `Could not resolve our X account @${X_TARGET_USERNAME}.` }
    const follows = await userFollowsTarget(user.id, target.id)
    if (!follows) {
      return {
        ok: false,
        userId: user.id,
        username: user.username,
        reason: `@${user.username} is not following @${X_TARGET_USERNAME}. Please follow us and try again.`,
      }
    }
    return { ok: true, userId: user.id, username: user.username }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'X follow check failed.' }
  }
}

import 'server-only'
import { getSupabase } from '@/lib/supabase'

const TELEGRAM_API = 'https://api.telegram.org'
export const TELEGRAM_CHANNEL = process.env.SPIN_TELEGRAM_CHANNEL || 'InterPredict'

async function resolveTelegramUser(username: string): Promise<{ userId: string; handle: string } | null> {
  const supabase = getSupabase()
  const clean = username.trim().replace(/^@/, '').toLowerCase()
  const { data: rows } = await supabase
    .from('telegram_identities')
    .select('user_id, handle')
    .eq('username', clean)
    .limit(1)
  const row = Array.isArray(rows) ? rows[0] : null
  if (!row) return null
  return { userId: String(row.user_id), handle: String(row.handle || clean) }
}

async function tgApiPost(method: string, payload: Record<string, unknown>): Promise<any> {
  const botToken = process.env.SPIN_TELEGRAM_BOT_TOKEN || ''
  if (!botToken) throw new Error('SPIN_TELEGRAM_BOT_TOKEN is not set.')
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json?.ok !== true) {
    throw new Error(json?.description || `Telegram ${method} failed (${res.status}).`)
  }
  return json.result
}

export async function checkTelegramMembership(
  username: string,
): Promise<{
  ok: boolean
  userId?: string
  handle?: string
  status?: string
  reason?: string
}> {
  try {
    const identity = await resolveTelegramUser(username)
    if (!identity) {
      return {
        ok: false,
        reason: `No Telegram identity found for @${username}. Open the bot (@${process.env.SPIN_TELEGRAM_BOT_HANDLE || 'InterPredictVerifyBot'}) and tap Start / send any message first.`,
      }
    }
    const channelChatId = `@${TELEGRAM_CHANNEL}`
    const result = await tgApiPost('getChatMember', {
      chat_id: channelChatId,
      user_id: identity.userId,
    })
    const status = String(result?.status || '')
    if (status === 'member' || status === 'administrator' || status === 'creator') {
      return { ok: true, userId: identity.userId, handle: identity.handle, status }
    }
    return {
      ok: false,
      userId: identity.userId,
      handle: identity.handle,
      status,
      reason: `@${identity.handle} is not a member of our Telegram channel (@${TELEGRAM_CHANNEL}). Please join and try again.`,
    }
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error
          ? error.message
          : 'Telegram membership check failed. Make sure the bot is in the channel (as admin).',
    }
  }
}