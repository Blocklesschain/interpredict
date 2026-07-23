'use client'

import { Clock, ImageOff, Users } from 'lucide-react'
import { ethers } from 'ethers'
import { useEffect, useState, type ReactNode } from 'react'
import { useWeb3 } from '@/app/context/Web3Context'
import {
  categoryLabel,
  MARKET_STATES,
  normalizePermanentURI,
  type ProtocolMarket,
} from '@/lib/interpredictProtocol'

export const inputClass =
  'focus-ring w-full rounded-xl border border-border bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground'

export const primaryButton =
  'focus-ring inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50'

export const secondaryButton =
  'focus-ring inline-flex items-center justify-center rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'

export function useProtocolNow(interval = 15_000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1_000))
  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(Math.floor(Date.now() / 1_000)),
      interval,
    )
    return () => window.clearInterval(timer)
  }, [interval])
  return now
}

export function formatToken(value: string | bigint, decimals: number, precision = 4) {
  try {
    const formatted = ethers.formatUnits(value, decimals)
    const [whole, fraction = ''] = formatted.split('.')
    const trimmed = fraction.slice(0, precision).replace(/0+$/, '')
    return trimmed ? `${whole}.${trimmed}` : whole
  } catch {
    return '0'
  }
}

export function formatDate(timestamp: number) {
  if (!timestamp) return '—'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp * 1000))
}

export function Countdown({ timestamp }: { timestamp: number }) {
  const { t } = useWeb3()
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      1_000,
    )
    return () => window.clearInterval(timer)
  }, [])
  const remaining = timestamp - now
  if (remaining <= 0) return <span>{t('expired')}</span>
  const days = Math.floor(remaining / 86_400)
  const hours = Math.floor((remaining % 86_400) / 3_600)
  const minutes = Math.floor((remaining % 3_600) / 60)
  return (
    <span>
      {days ? `${days}d ` : ''}
      {hours}h {minutes}m {t('secondsRemaining')}
    </span>
  )
}

export function MarketThumbnail({
  market,
  className = 'h-40 w-full',
}: {
  market: ProtocolMarket
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  if (failed || !market.thumbnailURI) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gradient-to-br from-primary/20 via-secondary to-[#FFD700]/15`}
        role="img"
        aria-label={`${market.question} thumbnail unavailable`}
      >
        <ImageOff className="size-7 text-muted-foreground" aria-hidden="true" />
      </div>
    )
  }
  return (
    <img
      src={normalizePermanentURI(market.thumbnailURI)}
      onError={() => setFailed(true)}
      alt={`${market.question} market thumbnail`}
      className={`${className} object-cover`}
    />
  )
}

export function StateBadge({
  market,
  paused = false,
}: {
  market: ProtocolMarket
  paused?: boolean
}) {
  const { t } = useWeb3()
  const label = paused ? t('paused') : MARKET_STATES[market.state] ?? `State ${market.state}`
  return (
    <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
      {label}
    </span>
  )
}

export function MarketSummaryCard({
  market,
  decimals,
  symbol,
  onOpen,
  paused = false,
}: {
  market: ProtocolMarket
  decimals: number
  symbol: string
  onOpen: (market: ProtocolMarket) => void
  paused?: boolean
}) {
  const { t } = useWeb3()
  const liquidity = market.balances.reduce(
    (sum, value) => sum + BigInt(value || '0'),
    0n,
  )
  return (
    <article className="protocol-panel animate-enter flex h-full flex-col overflow-hidden transition hover:-translate-y-1 hover:border-primary/35">
      <MarketThumbnail market={market} />
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            {categoryLabel(market)} · {market.origin === 1 ? t('teamMarket') : t('communityMarket')}
          </span>
          <StateBadge market={market} paused={paused} />
        </div>
        <h3 className="line-clamp-2 text-base font-bold leading-snug">
          {market.question}
        </h3>
        <div className="mt-4 space-y-2">
          {market.outcomes.map((outcome, index) => (
            <div
              key={`${outcome}-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg bg-background/55 px-3 py-2 text-xs"
            >
              <span className="truncate">{outcome}</span>
              <strong>
                {(Number(BigInt(market.prices[index] || '0')) / 1e16).toFixed(1)}%
              </strong>
            </div>
          ))}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div>
            <dt>{t('volume')}</dt>
            <dd className="font-semibold text-foreground">
              {formatToken(market.marketVolume, decimals)} {symbol}
            </dd>
          </div>
          <div>
            <dt>{t('liquidity')}</dt>
            <dd className="font-semibold text-foreground">
              {formatToken(liquidity, decimals)} {symbol}
            </dd>
          </div>
          <div className="col-span-2 flex items-center gap-1">
            <Clock className="size-3" aria-hidden="true" />
            <span>{formatDate(market.tradingEndTime)}</span>
          </div>
          {'participantCount' in market && (
            <div className="col-span-2 flex items-center gap-1">
              <Users className="size-3" aria-hidden="true" />
              <span>{String((market as ProtocolMarket & { participantCount?: number }).participantCount ?? 0)}</span>
            </div>
          )}
        </dl>
        <button
          type="button"
          onClick={() => onOpen(market)}
          className={`${primaryButton} mt-5 w-full`}
        >
          {t('openMarket')}
        </button>
      </div>
    </article>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block text-sm font-semibold">
      <span>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs font-normal text-muted-foreground">{hint}</span>}
    </label>
  )
}
