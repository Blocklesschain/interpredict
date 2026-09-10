import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import {
  requireAuth,
  normalizeAddress,
  currentSessionStart,
  ok,
  fail,
} from '@/lib/spin-to-win/server/helpers'
import { getSupabase } from '@/lib/supabase'
import { multipliers, TREASURY_ADDRESS_DEFAULT } from '@/lib/spin-to-win/constants'
import { verifyOnChainTransfer } from '@/lib/spin-to-win/server/rpc'

export const dynamic = 'force-dynamic'

const PAID_MULTIPLIER_VALUES = new Set([2, 5, 15, 50])

function treasuryRecipient(): string {
  return (process.env.SPIN_TREASURY_ADDRESS || TREASURY_ADDRESS_DEFAULT).toLowerCase()
}

export async function POST(request: NextRequest) {
  try {
    const { wallet } = await requireAuth(request)
    const walletKey = normalizeAddress(wallet)
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || '')

    if (action === 'intent') {
      const multiplier = Number(body.multiplier)
      const multiplierDef = multipliers.find((item) => item.value === multiplier)
      if (!multiplierDef || !PAID_MULTIPLIER_VALUES.has(multiplier)) {
        return fail('BAD_MULTIPLIER', 'A paid multiplier (X2, X5, X15, X50) is required.')
      }

      const sessionStart = currentSessionStart()
      const supabase = getSupabase()
      const purchaseId = randomUUID()
      const { error } = await supabase.from('multiplier_purchases').insert({
        id: purchaseId,
        wallet: walletKey,
        session_start: sessionStart,
        multiplier,
        cost_wei: multiplierDef.costWei,
        recipient: treasuryRecipient(),
        tx_hash: '',
        status: 'pending',
      })
      if (error) throw error

      return ok({
        purchaseId,
        recipient: treasuryRecipient(),
        cost: multiplierDef.costWei,
        costLabel: multiplierDef.cost,
        multiplier,
        status: 'pending',
      })
    }

    if (action === 'confirm') {
      const purchaseId = String(body.purchaseId || '')
      const txHash = String(body.txHash || '').trim()
      if (!purchaseId) return fail('MISSING_PURCHASE', 'purchaseId is required.')
      if (!txHash || !txHash.toLowerCase().startsWith('0x') || txHash.length !== 66) {
        return fail('BAD_TXHASH', 'A valid transaction hash is required.')
      }

      const supabase = getSupabase()
      const { data: rows, error: readError } = await supabase
        .from('multiplier_purchases')
        .select('*')
        .eq('id', purchaseId)
        .limit(1)
      if (readError) throw readError
      const purchase = Array.isArray(rows) ? rows[0] : null
      if (!purchase) return fail('NOT_FOUND', 'Purchase intent not found.')
      if (String(purchase.wallet) !== walletKey) {
        return fail('FORBIDDEN', 'This purchase does not belong to your wallet.', 403)
      }
      if (purchase.status !== 'pending') {
        return ok({ status: purchase.status, confirmed: purchase.status === 'confirmed' })
      }

      // Prove the payment actually happened on-chain before unlocking.
      const verification = await verifyOnChainTransfer({
        txHash,
        expectedSender: walletKey,
        expectedRecipient: treasuryRecipient(),
        expectedValueWei: String(purchase.cost_wei || '0'),
      })
      if (!verification.ok) {
        return fail(
          'PAYMENT_NOT_VERIFIED',
          verification.reason || 'Could not verify the on-chain payment.',
          422,
        )
      }

      const { error: updateError } = await supabase
        .from('multiplier_purchases')
        .update({ tx_hash: txHash, status: 'confirmed' })
        .eq('id', purchaseId)
      if (updateError) throw updateError

      const { error: sessionError } = await supabase.from('spin_sessions').upsert(
        {
          wallet: walletKey,
          session_start: Number(purchase.session_start || currentSessionStart()),
          selected_multiplier: Number(purchase.multiplier),
          multiplier_confirmed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wallet,session_start' },
      )
      if (sessionError) throw sessionError

      return ok({ status: 'confirmed', confirmed: true })
    }

    return fail('BAD_ACTION', `Unknown action '${action}'.`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Multiplier payment failed.'
    console.error('[spin/multiplier] Error:', error)
    return fail('MULTIPLIER_FAILED', message, 400)
  }
}