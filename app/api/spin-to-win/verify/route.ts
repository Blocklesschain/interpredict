import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import {
  requireAuth,
  requireAdmin,
  normalizeAddress,
  currentSessionStart,
  ok,
  fail,
} from '@/lib/spin-to-win/server/helpers'
import { getSupabase } from '@/lib/supabase'
import { getDayStart } from '@/lib/spin-to-win/constants'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || '')

    if (action === 'submit') {
      const { wallet } = await requireAuth(request)
      const walletKey = normalizeAddress(wallet)
      const taskId = String(body.taskId || '')
      const proofLink = String(body.proofLink || '').trim()
      if (!taskId) return fail('MISSING_TASK', 'taskId is required.')
      if (!proofLink) return fail('MISSING_PROOF', 'A proof link is required.')

      const supabase = getSupabase()
      const dayStart = getDayStart(Date.now())
      const { data: prior } = await supabase
        .from('spin_task_verifications')
        .select('id, verified')
        .eq('task_id', taskId)
        .eq('wallet', walletKey)
        .eq('day_start', dayStart)
        .limit(1)
      const existingRow = Array.isArray(prior) ? prior[0] : null
      if (existingRow && existingRow.verified) {
        return fail('ALREADY_VERIFIED', 'This task is already verified for today.')
      }

      const { error } = await supabase.from('spin_task_verifications').upsert(
        {
          id: existingRow ? String(existingRow.id) : randomUUID(),
          task_id: taskId,
          wallet: walletKey,
          day_start: dayStart,
          proof_link: proofLink,
          verified: Boolean(existingRow?.verified),
        },
        { onConflict: 'task_id,wallet,day_start' },
      )
      if (error) throw error
      return ok({ submitted: true }, {})
    }

    if (action === 'approve') {
      const admin = await requireAdmin(request)
      const adminKey = normalizeAddress(admin)
      const verificationId = String(body.verificationId || '')
      const approved = Boolean(body.approved)
      if (!verificationId) return fail('MISSING_ID', 'verificationId is required.')

      const supabase = getSupabase()
      const { data: rows, error: readError } = await supabase
        .from('spin_task_verifications')
        .select('*')
        .eq('id', verificationId)
        .limit(1)
      if (readError) throw readError
      const verification = Array.isArray(rows) ? rows[0] : null
      if (!verification) return fail('NOT_FOUND', 'Verification not found.')

      const { error: updateError } = await supabase
        .from('spin_task_verifications')
        .update({
          verified: approved,
          verified_by: adminKey,
          verified_at: approved ? new Date().toISOString() : null,
        })
        .eq('id', verificationId)
      if (updateError) throw updateError

      if (approved) {
        const now = Date.now()
        const sessionStart = currentSessionStart(now)
        const { data: sessions } = await supabase
          .from('spin_sessions')
          .select('bonus_spins')
          .eq('wallet', verification.wallet)
          .order('session_start', { ascending: false })
          .limit(1)
        const session = Array.isArray(sessions) ? sessions[0] : null
        const nextBonus = Math.max(0, Number(session?.bonus_spins || 0) + 2)
        const { error: grantError } = await supabase.from('spin_sessions').upsert(
          {
            wallet: verification.wallet,
            session_start: sessionStart,
            bonus_spins: nextBonus,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'wallet,session_start' },
        )
        if (grantError) throw grantError
      }

      await supabase.from('admin_actions').insert({
        id: randomUUID(),
        admin_wallet: adminKey,
        action: approved ? 'approve_task' : 'reject_task',
        target: verificationId,
        payload: { wallet: verification.wallet },
      })

      return ok({ approved }, {})
    }

    return fail('BAD_ACTION', `Unknown action '${action}'.`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed.'
    console.error('[spin/verify] Error:', error)
    return fail('VERIFY_FAILED', message, 400)
  }
}