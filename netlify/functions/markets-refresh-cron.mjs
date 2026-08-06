// ---------------------------------------------------------------------------
// Netlify Scheduled Function — runs every 45 seconds to keep the markets
// cache fresh.  This is a plain .mjs file so Netlify can execute it directly
// without a build step.
//
// Configured in netlify.toml under [functions."markets-refresh-cron"].
//
// Strategy: calls the existing POST /api/markets/refresh endpoint on the
// live site.  This reuses the same CRON_SECRET auth, dedup lock, and scan
// logic already deployed as a Next.js API route — no code duplication.
//
// ⚠️ Free-tier scheduled functions have a 30-second execution limit.
// The HTTP call itself is fast (< 1s); the actual scan runs inside the
// Next.js serverless function which has a 10s limit.  If your scan exceeds
// 10s, reduce MARKET_BATCH_SIZE in lib/scanMarkets.ts or upgrade to
// Netlify Pro for longer timeouts.
// ---------------------------------------------------------------------------

export const handler = async (_event) => {
  console.info('[Markets Cron] Scheduled refresh starting...')

  try {
    const siteUrl = process.env.URL || 'https://interpredict.netlify.app'
    const cronSecret = process.env.CRON_SECRET || ''

    const response = await fetch(`${siteUrl}/api/markets/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cronSecret}`,
      },
    })

    const body = await response.json()

    if (!response.ok) {
      console.error('[Markets Cron] Refresh endpoint returned error:', body)
      return {
        statusCode: 500,
        body: JSON.stringify(body),
      }
    }

    console.info(
      `[Markets Cron] Refresh complete: ${body.count} markets at ${body.updatedAt}`,
    )

    return {
      statusCode: 200,
      body: JSON.stringify(body),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Markets Cron] Refresh failed:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: message }),
    }
  }
}