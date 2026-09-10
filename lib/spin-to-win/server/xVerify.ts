// Server-only helper for verifying an X (Twitter) account ownership during the
// Spin to Win social link flow. Uses the X API v2 to confirm that a specific
// tweet (containing a one-time code) was authored by the claimed handle.
import 'server-only'

const API = 'https://api.twitter.com/2'

let cachedBearer: string | null = null

// Build an OAuth 2.0 app-only bearer token from SPIN_X_API_KEY + SPIN_X_API_SECRET
// using the client_credentials grant. If you'd rather supply a ready-made
// bearer token, set SPIN_X_BEARER_TOKEN directly.
async function getBearerToken(): Promise<string> {
  if (cachedBearer) return cachedBearer

  const direct = process.env.SPIN_X_BEARER_TOKEN?.trim()
  if (direct) {
    cachedBearer = direct
    return direct
  }

  const apiKey = process.env.SPIN_X_API_KEY?.trim()
  const apiSecret = process.env.SPIN_X_API_SECRET?.trim()
  if (!apiKey || !apiSecret) {
    throw new Error('X verification is not configured (set SPIN_X_BEARER_TOKEN or SPIN_X_API_KEY/SECRET).')
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
  if (!res.ok) {
    throw new Error(`X OAuth token request failed (${res.status}).`)
  }
  const json = await res.json()
  const token = json?.access_token
  if (!token) throw new Error('X OAuth token response missing access_token.')
  cachedBearer = token
  return token
}

async function apiGet(path: string, token: string): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`X API request failed (${res.status}).`)
  return res.json()
}

export interface XVerificationResult {
  ok: boolean
  reason?: string
  tweetId?: string
  authorId?: string
  username?: string
}

/**
 * Fetch a tweet by its numeric status id and verify that:
 *  - the author's username matches the claimed handle, and
 *  - the tweet text contains the expected one-time code.
 */
export async function verifyTweet(params: {
  tweetId: string
  claimedHandle: string
  expectedCode: string
}): Promise<XVerificationResult> {
  const { tweetId, claimedHandle, expectedCode } = params
  try {
    const token = await getBearerToken()

    const tweetData = await apiGet(
      `/tweets/${tweetId}?tweet.fields=author_id,text,created_at`,
      token,
    )
    const tweet = tweetData?.data
    if (!tweet) return { ok: false, reason: 'Tweet not found.' }
    const authorId = String(tweet.author_id || '')
    const text = String(tweet.text || '')

    // Fetch the author's username (always, to avoid depending on expansions).
    let username = ''
    if (authorId) {
      const userData = await apiGet(`/users/${authorId}?user.fields=username`, token)
      username = String(userData?.data?.username || '')
    }
    if (!username) return { ok: false, reason: 'Could not resolve tweet author.' }

    if (username.toLowerCase() !== claimedHandle.toLowerCase()) {
      return { ok: false, reason: 'Tweet author does not match the claimed handle.' }
    }
    if (!text.toUpperCase().includes(expectedCode.toUpperCase())) {
      return { ok: false, reason: 'Tweet does not contain the required verification code.' }
    }

    return { ok: true, tweetId, authorId, username }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'X verification failed.'
    return { ok: false, reason: message }
  }
}

export function parseTweetId(url: string): string | null {
  const match = url
    .trim()
    // Matches x.com/<handle>/status/<id> and twitter.com variants
    .match(/(?:x|twitter)\.com\/[A-Za-z0-9_]+\/status\/(\d+)/i)
  return match ? match[1] : null
}