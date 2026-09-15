import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/spin-to-win/server/helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // A tiny configuration probe: report whether the server Supabase client is
    // wired (env set). Used by the client to decide whether to enable the
    // server-backed flow or fall back to local storage.
    const configured =
      Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_SECRET_KEY)
    return ok({ configured, service: 'spin-to-win' }, {})
  } catch {
    return fail('HEALTH_FAILED', 'Spin to Win backend unavailable.', 500)
  }
}