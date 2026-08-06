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