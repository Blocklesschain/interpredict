// InterPredict V2 — Indexer Background Function
//
// Runs the incremental blockchain synchronizer independently of page requests.
// Scheduled via netlify.toml. Protected by INDEXER_SECRET.

import { schedule } from '@netlify/functions'

export const handler = schedule('*/5 * * * *', async () => {
  const secret = process.env.INDEXER_SECRET
  if (!secret) {
    console.error('[indexer-sync] INDEXER_SECRET is not configured.')
    return { statusCode: 500 }
  }

  // Import the indexer lazily so the function can be bundled.
  const { syncOnce } = await import('../../services/indexer/indexer.ts')

  try {
    const result = await syncOnce()
    console.info(
      JSON.stringify({
        operation: 'indexer-sync',
        status: 'ok',
        ...result,
      }),
    )
    return { statusCode: 200 }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      JSON.stringify({
        operation: 'indexer-sync',
        status: 'error',
        error: message,
      }),
    )
    return { statusCode: 500 }
  }
})