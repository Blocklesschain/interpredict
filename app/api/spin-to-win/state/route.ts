import { NextRequest } from 'next/server'
import {
  requireAuth,
  currentSessionStart,
  ok,
  fail,
} from '@/lib/spin-to-win/server/helpers'
import {
  loadServerState,
  recordResult,
  reconcileSession,
} from '@/lib/spin-to-win/server/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { wallet } = await requireAuth(request)
    const url = new URL(request.url)
    const rawSession = url.searchParams.get('sessionStart')
    const sessionStart = rawSession ? Number(rawSession) : currentSessionStart()

    const state = await loadServerState(wallet, sessionStart)
    return ok(state, {})
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load state.'
    console.error('[spin/state] Error:', error)
    return fail('STATE_FAILED', message, 401)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { wallet, isAdmin } = await requireAuth(request)
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || '')

    if (action === 'record') {
      const sessionStart = Number(body.sessionStart || currentSessionStart())
      const result = await recordResult(wallet, sessionStart, body, isAdmin)
      return ok(result)
    }

    if (action === 'reconcile') {
      const sessionStart = Number(body.sessionStart || currentSessionStart())
      const state = await reconcileSession(wallet, sessionStart, body)
      return ok(state)
    }

    return fail('BAD_ACTION', `Unknown action '${action}'.`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'State update failed.'
    console.error('[spin/state] Error:', error)
    return fail('STATE_FAILED', message, 400)
  }
}