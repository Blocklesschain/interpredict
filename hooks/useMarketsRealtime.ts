// Supabase Realtime hooks for markets and wallet activity.

'use client'

import { useEffect, useRef } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { MarketDto } from '@/types/market'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

let client: SupabaseClient | null = null

function getClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return client
}

export function useMarketsRealtime(onChange: (market: MarketDto) => void) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const supabase = getClient()
    if (!supabase) return

    const channel = supabase
      .channel('markets-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'markets' },
        (payload) => {
          onChangeRef.current(payload.new as unknown as MarketDto)
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'markets' },
        (payload) => {
          onChangeRef.current(payload.new as unknown as MarketDto)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
}

export function useMarketRealtime(id: number, onChange: (market: MarketDto) => void) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const supabase = getClient()
    if (!supabase) return

    const channel = supabase
      .channel(`market-${id}-realtime`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'markets', filter: `id=eq.${id}` },
        (payload) => {
          onChangeRef.current(payload.new as unknown as MarketDto)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])
}

export function useWalletActivityRealtime(wallet: string, onActivity: () => void) {
  const onActivityRef = useRef(onActivity)
  onActivityRef.current = onActivity

  useEffect(() => {
    const supabase = getClient()
    if (!supabase || !wallet) return

    const normalized = wallet.toLowerCase()

    const channel = supabase
      .channel(`wallet-${normalized}-realtime`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'participations', filter: `participant=eq.${normalized}` },
        () => onActivityRef.current(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'resolution_votes', filter: `voter=eq.${normalized}` },
        () => onActivityRef.current(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [wallet])
}
