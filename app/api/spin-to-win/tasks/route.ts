import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import {
  requireAdmin,
  normalizeAddress,
  currentSessionStart,
  ok,
  fail,
} from '@/lib/spin-to-win/server/helpers'
import { getSupabase } from '@/lib/supabase'
import { defaultTasks } from '@/lib/spin-to-win/constants'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = getSupabase()
    const sessionStart = currentSessionStart()

    // Seed defaults lazily on first read so users always have the base session.
    const { data: existing } = await supabase.from('spin_tasks').select('id').limit(1)
    if (Array.isArray(existing) && existing.length === 0) {
      const seeds = defaultTasks(sessionStart)
      await supabase.from('spin_tasks').upsert(
        seeds.map((task) => ({
          id: task.id,
          kind: task.kind,
          title: task.title,
          description: task.description,
          href: task.href,
          active: task.active,
          created_session: task.createdSession,
          source: task.source,
        })),
        { onConflict: 'id' },
      )
    }

    const { data: rows, error } = await supabase
      .from('spin_tasks')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true })
    if (error) throw error

    const tasks = (Array.isArray(rows) ? rows : []).map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      description: row.description,
      href: row.href,
      active: row.active,
      createdSession: Number(row.created_session || 0),
      source: row.source,
    }))
    return ok({ sessionStart, tasks })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load tasks.'
    console.error('[spin/tasks] Error:', error)
    return fail('TASKS_FAILED', message, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    const body = await request.json().catch(() => ({}))
    const title = String(body.title || '').trim()
    const href = String(body.href || '').trim()
    const kind = String(body.kind || '')
    if (!title || !href || !kind) return fail('MISSING_FIELDS', 'title, href and kind are required.')

    const supabase = getSupabase()
    const id = `admin-${Date.now()}`
    const sessionStart = currentSessionStart()
    const { error } = await supabase.from('spin_tasks').insert({
      id,
      kind,
      title,
      description: String(body.description || 'New daily community task.'),
      href,
      active: true,
      created_session: sessionStart,
      source: 'admin',
    })
    if (error) throw error

    await supabase.from('admin_actions').insert({
      id: randomUUID(),
      admin_wallet: normalizeAddress(admin),
      action: 'create_task',
      target: id,
      payload: { title, href, kind },
    })

    return ok({ id }, {})
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create task failed.'
    console.error('[spin/tasks] Error:', error)
    return fail('TASKS_FAILED', message, 400)
  }
}