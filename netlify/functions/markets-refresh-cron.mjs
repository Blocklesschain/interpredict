// ---------------------------------------------------------------------------
// Netlify Scheduled Function — refreshes the markets cache incrementally.
//
// Runs every 45 seconds (configured in netlify.toml). Each invocation scans
// a single batch of markets (BATCH_SIZE markets) and merges them into the
// existing cache. Over multiple invocations, all markets are refreshed.
//
// This avoids the 10s Netlify serverless timeout by never scanning more than
// a few markets per invocation.
// ---------------------------------------------------------------------------

const BATCH_SIZE = 2 // markets per invocation (2 markets × 13 calls = 26 RPC calls, safe)

export const handler = async (_event) => {
  console.info('[Markets Cron] Scheduled refresh starting...')

  try {
    const siteUrl = process.env.URL || 'https://interpredict.netlify.app'
    const cronSecret = process.env.CRON_SECRET || ''

    // Step 1: Get the current cache to find the next startId
    let startId = 0
    try {
      const cacheResponse = await fetch(`${siteUrl}/api/markets`, {
        headers: { Accept: 'application/json' },
      })
      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json()
        const markets = cacheData?.allMarkets || []
        // Start from the next market after the last cached one
        // This creates a rolling refresh that cycles through all markets
        if (markets.length > 0) {
          const lastId = Math.max(...markets.map(m => m.id))
          // If we've scanned all markets, wrap around to 0
          startId = lastId >= markets.length - 1 ? 0 : lastId + 1
        }
      }
    } catch (e) {
      console.warn('[Markets Cron] Could not read cache for startId, defaulting to 0:', e.message)
    }

    // Step 2: Scan a batch of markets
    const refreshUrl = `${siteUrl}/api/markets/refresh?startId=${startId}&count=${BATCH_SIZE}`
    console.info(`[Markets Cron] Refreshing: ${refreshUrl}`)

    const response = await fetch(refreshUrl, {
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
      `[Markets Cron] Refresh complete: batch ${body.startId}-${body.endId - 1}, ${body.count} total markets in cache`,
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