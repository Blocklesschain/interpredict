import { NextRequest } from 'next/server'
import {
  requireAdmin,
  normalizeAddress,
  currentSessionStart,
  ok,
  fail,
} from '@/lib/spin-to-win/server/helpers'
import { getSupabase } from '@/lib/supabase'
import { recordResult } from '@/lib/spin-to-win/server/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    const supabase = getSupabase()

    const url = new URL(request.url)
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 100)))

    const { data: results, error } = await supabase
      .from('spin_results')
      .select('id, wallet, prize_label, multiplier, won_itp, won_spins, recorded_by, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error

    const { data: pending, error: pendingError } = await supabase
      .from('spin_task_verifications')
      .select('*')
      .eq('verified', false)
      .order('created_at', { ascending: true })
      .limit(100)
    if (pendingError) throw pendingError

    const { data: adminRows } = await supabase
      .from('admin_actions')
      .select('*')
      .eq('admin_wallet', normalizeAddress(admin))
      .order('created_at', { ascending: false })
      .limit(50)

    return ok({
      ledger: Array.isArray(results) ? results : [],
      pendingVerifications: Array.isArray(pending) ? pending : [],
      recentActions: Array.isArray(adminRows) ? adminRows : [],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load ledger.'
    console.error('[spin/admin] Error:', error)
    return fail('ADMIN_FAILED', message, 401)
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || '')

    if (action === 'record') {
      const sessionStart = Number(body.sessionStart || currentSessionStart())
      const result = await recordResult(normalizeAddress(admin), sessionStart, body, true)
      return ok(result)
    }

    return fail('BAD_ACTION', `Unknown action '${action}'.`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Admin record failed.'
    console.error('[spin/admin] Error:', error)
    return fail('ADMIN_FAILED', message, 400)
  }
}