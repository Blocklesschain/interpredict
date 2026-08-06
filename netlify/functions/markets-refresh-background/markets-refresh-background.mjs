// ---------------------------------------------------------------------------
// Netlify Background Function — has a 15-minute execution limit, plenty for
// scanning 34+ markets sequentially without rate-limiting the RPC gateway.
//
// Triggered by the GitHub Actions workflow (.github/workflows/markets-refresh.yml)
// which calls this function's URL every minute.
//
// Background functions are invoked via their URL:
//   https://<site>/.netlify/functions/markets-refresh-background
//
// They run asynchronously — the HTTP response is returned immediately while
// the function continues executing in the background for up to 15 minutes.
// ---------------------------------------------------------------------------

import { getStore } from '@netlify/blobs'
import { ethers } from 'ethers'

// ---------------------------------------------------------------------------
// Configuration (mirrors lib/scanMarkets.ts — duplicated here because
// Netlify Functions can't import Next.js TypeScript modules directly)
// ---------------------------------------------------------------------------

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ||
  '0x3E5936F13e1194380A66c3c1d75D4D7342299CfF'

const RPC_URL = 'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'
const RPC_AUTH_URL = 'https://evm-rpc.test-net.interlinklabs.ai/v1/auth'
const CHAIN_ID = '19042026'

const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000
const CALL_GAP_MS = 200
const RPC_CALL_TIMEOUT_MS = 10_000

// ---------------------------------------------------------------------------
// RPC Auth — same challenge/verify flow as interlinkServiceAuth.ts
// ---------------------------------------------------------------------------

let cachedToken = null
let tokenExpiresAt = 0

async function getBackendToken() {
  const now = Date.now()
  if (cachedToken && tokenExpiresAt > now + 30_000) {
    return cachedToken
  }

  const privateKey = process.env.SERVICE_WALLET_PRIVATE_KEY?.trim()
  if (!privateKey) throw new Error('SERVICE_WALLET_PRIVATE_KEY not configured')

  const wallet = new ethers.Wallet(privateKey)
  const address = wallet.address

  // Request challenge
  const challengeRes = await fetch(`${RPC_AUTH_URL}/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chainId: CHAIN_ID, walletAddress: address }),
  })
  const challengeJson = await challengeRes.json()
  if (!challengeRes.ok || !challengeJson.result) {
    throw new Error(`Challenge failed: ${JSON.stringify(challengeJson)}`)
  }

  const { challengeId, messageToSign } = challengeJson.result
  const signature = await wallet.signMessage(messageToSign)

  // Verify
  const verifyRes = await fetch(`${RPC_AUTH_URL}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: address, signature, challengeId }),
  })
  const verifyJson = await verifyRes.json()
  if (!verifyRes.ok || !verifyJson.result) {
    throw new Error(`Verify failed: ${JSON.stringify(verifyJson)}`)
  }

  cachedToken = verifyJson.result.accessToken
  tokenExpiresAt = now + (verifyJson.result.accessTokenExpiresInSec * 1000)
  return cachedToken
}

// ---------------------------------------------------------------------------
// RPC helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function ethCall(token, functionName, args, callLabel) {
  // Minimal ABI for the 5 functions we need
  const iface = new ethers.Interface([
    'function tm() view returns (uint256)',
    'function mb(uint256) view returns (string q, string d, uint8 cat, string cc, string tu, uint8 o, address cr, uint256 et, string rc, string pe, string be)',
    'function ms(uint256) view returns (uint8)',
    'function gL(uint256) view returns (string[])',
    'function gP(uint256) view returns (uint256[])',
    'function gPr2(uint256) view returns (uint256[])',
  ])

  const data = iface.encodeFunctionData(functionName, args)

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to: CONTRACT_ADDRESS, data }, 'latest'],
        }),
        signal: AbortSignal.timeout(RPC_CALL_TIMEOUT_MS),
      })

      const json = await response.json()

      if (json.error) {
        console.warn(`[bg-refresh] ${callLabel} attempt ${attempt}: ${json.error.message || JSON.stringify(json.error)}`)
        if (attempt < MAX_RETRY_ATTEMPTS) { await sleep(RETRY_DELAY_MS); continue }
        return null
      }

      if (!json.result || json.result === '0x') {
        console.warn(`[bg-refresh] ${callLabel} returned empty data`)
        if (attempt < MAX_RETRY_ATTEMPTS) { await sleep(RETRY_DELAY_MS); continue }
        return null
      }

      return { iface, raw: json.result }
    } catch (error) {
      console.warn(`[bg-refresh] ${callLabel} attempt ${attempt}: ${error.message}`)
      if (attempt < MAX_RETRY_ATTEMPTS) { await sleep(RETRY_DELAY_MS); continue }
      return null
    }
  }

  return null
}

function decodeCall(iface, functionName, raw) {
  if (!raw) return []
  try { return iface.decodeFunctionResult(functionName, raw) } catch { return [] }
}

// ---------------------------------------------------------------------------
// Main scan
// ---------------------------------------------------------------------------

async function scanAllMarkets() {
  const token = await getBackendToken()
  console.log('[bg-refresh] Token acquired, starting scan...')

  // Get latest block
  let lastIndexedBlock = '0x0'
  try {
    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
      signal: AbortSignal.timeout(RPC_CALL_TIMEOUT_MS),
    })
    const json = await res.json()
    if (json.result) lastIndexedBlock = json.result
  } catch (e) { console.warn('[bg-refresh] Failed to fetch block number:', e.message) }

  // Get total count
  const tmResult = await ethCall(token, 'tm', [], 'tm()')
  if (!tmResult) throw new Error('Failed to read total market count')
  const totalCount = Number(decodeCall(tmResult.iface, 'tm', tmResult.raw)[0])

  console.log(`[bg-refresh] Total markets: ${totalCount}, block: ${lastIndexedBlock}`)

  if (totalCount === 0) {
    await saveSnapshot([], lastIndexedBlock)
    return { count: 0, lastIndexedBlock }
  }

  const markets = []

  for (let marketId = 0; marketId < totalCount; marketId++) {
    console.log(`[bg-refresh] Scanning market ${marketId + 1}/${totalCount}...`)

    try {
      const mbResult = await ethCall(token, 'mb', [marketId], `mb(${marketId})`)
      await sleep(CALL_GAP_MS)

      const msResult = await ethCall(token, 'ms', [marketId], `ms(${marketId})`)
      await sleep(CALL_GAP_MS)

      const gLResult = await ethCall(token, 'gL', [marketId], `gL(${marketId})`)
      await sleep(CALL_GAP_MS)

      const gPResult = await ethCall(token, 'gP', [marketId], `gP(${marketId})`)
      await sleep(CALL_GAP_MS)

      const gPr2Result = await ethCall(token, 'gPr2', [marketId], `gPr2(${marketId})`)

      const incompleteFields = []
      if (!mbResult) incompleteFields.push('mb')
      if (!msResult) incompleteFields.push('ms')
      if (!gLResult) incompleteFields.push('gL')
      if (!gPResult) incompleteFields.push('gP')
      if (!gPr2Result) incompleteFields.push('gPr2')

      const mb = mbResult ? decodeCall(mbResult.iface, 'mb', mbResult.raw) : []
      const ms = msResult ? decodeCall(msResult.iface, 'ms', msResult.raw) : []
      const gL = gLResult ? decodeCall(gLResult.iface, 'gL', gLResult.raw) : []
      const gP = gPResult ? decodeCall(gPResult.iface, 'gP', gPResult.raw) : []
      const gPr2 = gPr2Result ? decodeCall(gPr2Result.iface, 'gPr2', gPr2Result.raw) : []

      const market = {
        id: marketId,
        question: String(mb[0] ?? ''),
        description: String(mb[1] ?? ''),
        category: Number(mb[2] ?? 0),
        customCategory: String(mb[3] ?? ''),
        thumbnailUri: String(mb[4] ?? ''),
        origin: Number(mb[5] ?? 0),
        creator: String(mb[6] ?? ethers.ZeroAddress),
        marketEndTime: Number(mb[7] ?? 0),
        resolutionCriteria: String(mb[8] ?? ''),
        state: Number(ms[0] ?? 0),
        outcomeLabels: Array.isArray(gL[0]) ? gL[0].map(String) : [],
        outcomePools: Array.isArray(gP[0]) ? gP[0].map(v => v.toString()) : [],
        outcomePrices: Array.isArray(gPr2[0]) ? gPr2[0].map(v => v.toString()) : [],
      }

      if (incompleteFields.length > 0) {
        market.incompleteFields = incompleteFields
        console.warn(`[bg-refresh] Market ${marketId} incomplete: ${incompleteFields.join(', ')}`)
      }

      markets.push(market)
    } catch (error) {
      console.error(`[bg-refresh] Failed to scan market ${marketId}:`, error.message)
    }
  }

  console.log(`[bg-refresh] Scan complete: ${markets.length}/${totalCount} markets`)
  await saveSnapshot(markets, lastIndexedBlock)
  return { count: markets.length, lastIndexedBlock }
}

async function saveSnapshot(markets, lastIndexedBlock) {
  const store = getStore('markets-cache')
  await store.setJSON('snapshot', {
    markets,
    updatedAt: new Date().toISOString(),
    lastIndexedBlock,
  })
  console.log(`[bg-refresh] Snapshot saved: ${markets.length} markets`)
}

// ---------------------------------------------------------------------------
// Netlify Background Function handler
// ---------------------------------------------------------------------------

export const handler = async (event) => {
  // Only accept POST with CRON_SECRET
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const secret = process.env.CRON_SECRET?.trim()
  if (secret) {
    const auth = event.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth
    if (token !== secret) {
      return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Unauthorised' }) }
    }
  }

  // Start scan in background — respond immediately
  // Netlify Background Functions continue running after the response is sent
  scanAllMarkets()
    .then(result => console.log('[bg-refresh] Background scan completed:', result))
    .catch(error => console.error('[bg-refresh] Background scan failed:', error))

  return {
    statusCode: 202,
    body: JSON.stringify({ ok: true, message: 'Scan started in background' }),
  }
}