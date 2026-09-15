import { NextRequest } from 'next/server'
import {
  createChallenge,
  verifyChallenge,
  normalizeAddress,
  ok,
  fail,
} from '@/lib/spin-to-win/server/helpers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || '')
    const wallet = String(body.wallet || '')

    if (!wallet || !wallet.toLowerCase().startsWith('0x')) {
      return fail('MISSING_WALLET', 'A valid wallet address is required.')
    }
    const normalized = normalizeAddress(wallet)

    if (action === 'challenge') {
      const challenge = await createChallenge(normalized)
      return ok({ challenge })
    }

    if (action === 'verify') {
      const challengeId = String(body.challengeId || '')
      const signature = String(body.signature || '')
      if (!challengeId || !signature) {
        return fail('MISSING_CREDENTIALS', 'challengeId and signature are required.')
      }
      const session = await verifyChallenge(normalized, challengeId, signature)
      return ok(session)
    }

    return fail('BAD_ACTION', `Unknown action '${action}'.`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Auth failed.'
    console.error('[spin/auth] Error:', error)
    return fail('AUTH_FAILED', message, 401)
  }
}