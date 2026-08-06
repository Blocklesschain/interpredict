import 'server-only'
import { getStore } from '@netlify/blobs'

// ---------------------------------------------------------------------------
// Market type matching the shape the frontend already consumes via
// `{ allMarkets: Market[] }`.  Pools and prices are stored as strings
// (already .toString()'d from BigInt) so they survive JSON serialisation.
//
// `incompleteFields` tracks which contract calls failed during the last scan
// so the frontend can distinguish "genuinely empty" from "RPC was down".
// ---------------------------------------------------------------------------
export interface Market {
  id: number
  question: string
  description: string
  category: number
  customCategory: string
  thumbnailUri: string
  origin: number
  creator: string
  marketEndTime: number
  resolutionCriteria: string
  state: number
  outcomeLabels: string[]
  outcomePools: string[]   // wei values as decimal strings
  outcomePrices: string[]  // 1e18-scaled prices as decimal strings
  /** Which contract calls failed during the last scan (e.g. ["gP", "gPr2"]).  Empty = all fields loaded successfully. */
  incompleteFields?: string[]
}

export interface MarketsSnapshot {
  markets: Market[]
  updatedAt: string // ISO-8601 timestamp
  /** The latest block number seen during the scan (hex string).  Used for future incremental/delta refreshes. */
  lastIndexedBlock?: string
}

const STORE_NAME = 'markets-cache'
const SNAPSHOT_KEY = 'snapshot'
const REFRESH_LOCK_KEY = 'refresh-lock'

// How long a refresh lock lives before it's considered stale (seconds).
// Must be longer than the worst-case scan duration.  If a scan crashes the
// lock auto-expires so the next refresh attempt can proceed.
const REFRESH_LOCK_TTL_SECONDS = 120

// ---------------------------------------------------------------------------
// Snapshot read / write
// ---------------------------------------------------------------------------

/**
 * Read the cached market snapshot from Netlify Blobs.
 * Returns `null` when no snapshot has been written yet or the store is
 * unavailable (e.g. local dev without Netlify CLI).
 */
export async function getCachedMarkets(): Promise<MarketsSnapshot | null> {
  try {
    const store = getStore(STORE_NAME)
    const data = await store.get(SNAPSHOT_KEY, { type: 'json' })
    if (!data) return null

    // Lightweight validation – ensure the shape is what we expect.
    const snapshot = data as MarketsSnapshot
    if (!Array.isArray(snapshot.markets) || typeof snapshot.updatedAt !== 'string') {
      console.warn('[marketsCache] Stored snapshot has unexpected shape; ignoring.')
      return null
    }

    return snapshot
  } catch (error) {
    console.warn('[marketsCache] Failed to read cached markets:', error)
    return null
  }
}

/**
 * Persist a fresh market snapshot to Netlify Blobs.
 * Overwrites any previous snapshot.
 */
export async function setCachedMarkets(
  markets: Market[],
  lastIndexedBlock?: string,
): Promise<void> {
  const snapshot: MarketsSnapshot = {
    markets,
    updatedAt: new Date().toISOString(),
    lastIndexedBlock,
  }

  try {
    const store = getStore(STORE_NAME)
    await store.setJSON(SNAPSHOT_KEY, snapshot)
    console.info(
      `[marketsCache] Snapshot written: ${markets.length} markets` +
        (lastIndexedBlock ? `, block ${lastIndexedBlock}` : '') +
        ` at ${snapshot.updatedAt}`,
    )
  } catch (error) {
    console.error('[marketsCache] Failed to persist market snapshot:', error)
    throw error
  }
}

// ---------------------------------------------------------------------------
// Refresh lock — prevents two simultaneous requests from starting duplicate
// chain scans.  Uses Netlify Blobs so the lock is shared across all serverless
// function instances (unlike an in-memory flag).
// ---------------------------------------------------------------------------

/**
 * Try to acquire the refresh lock.  Returns `true` if this caller should
 * proceed with the scan, `false` if another refresh is already in progress.
 *
 * The lock auto-expires after REFRESH_LOCK_TTL_SECONDS so a crashed scan
 * doesn't block refreshes forever.
 */
export async function acquireRefreshLock(): Promise<boolean> {
  try {
    const store = getStore(STORE_NAME)
    const existing = await store.get(REFRESH_LOCK_KEY, { type: 'json' })

    if (existing) {
      const lock = existing as { acquiredAt: string }
      const acquiredMs = new Date(lock.acquiredAt).getTime()
      const ageSeconds = (Date.now() - acquiredMs) / 1000

      if (ageSeconds < REFRESH_LOCK_TTL_SECONDS) {
        console.info('[marketsCache] Refresh already in progress; skipping duplicate scan.')
        return false
      }

      console.warn(
        `[marketsCache] Stale refresh lock detected (${ageSeconds.toFixed(0)}s old); taking over.`,
      )
    }

    await store.setJSON(REFRESH_LOCK_KEY, { acquiredAt: new Date().toISOString() })
    return true
  } catch (error) {
    // If we can't check the lock, proceed anyway — better to risk a duplicate
    // scan than to block refreshes entirely.
    console.warn('[marketsCache] Could not check refresh lock; proceeding:', error)
    return true
  }
}

/**
 * Release the refresh lock after a scan completes (or fails).
 */
export async function releaseRefreshLock(): Promise<void> {
  try {
    const store = getStore(STORE_NAME)
    await store.delete(REFRESH_LOCK_KEY)
  } catch (error) {
    console.warn('[marketsCache] Failed to release refresh lock:', error)
  }
}