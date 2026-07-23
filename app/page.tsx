'use client'

import {
  ArrowRight,
  BadgeCheck,
  Gavel,
  Layers3,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWeb3 } from './context/Web3Context'
import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'
import {
  EmptyState,
  MarketSummaryCard,
  inputClass,
  primaryButton,
  secondaryButton,
} from '@/components/protocol/ProtocolUI'
import {
  categoryLabel,
  isActiveTradeMarket,
  isInactiveTradeMarket,
  type ProtocolMarket,
} from '@/lib/interpredictProtocol'

type MarketsResponse = {
  markets: ProtocolMarket[]
  nextCursor?: string | null
  protocolPaused?: boolean
  settlementToken?: {
    address: string
    symbol: string
    decimals: number
    proposalFee: string
    proposalSeed: string
    minimumTrade: string
  }
  error?: string
}
type MarketView = 'active' | 'inactive'
type SortMode = 'newest' | 'ending' | 'liquidity' | 'volume'

export default function HomePage() {
  const { t, token } = useWeb3()
  const [markets, setMarkets] = useState<ProtocolMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [protocolPaused, setProtocolPaused] = useState(false)
  const [indexedToken, setIndexedToken] = useState<{
    symbol: string
    decimals: number
  } | null>(null)
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  const [view, setView] = useState<MarketView>('active')
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('newest')
  const requestRef = useRef<AbortController | null>(null)

  const loadPage = useCallback(async (cursor: string, append: boolean) => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    setError('')
    try {
      const response = await fetch(
        `/api/markets?cursor=${encodeURIComponent(cursor)}&limit=50`,
        { cache: 'no-store', signal: controller.signal },
      )
      const body = (await response.json()) as MarketsResponse
      if (!response.ok) throw new Error(body.error || 'Market sync failed')
      if (!Array.isArray(body.markets)) {
        throw new Error('Market index returned an invalid response')
      }
      setMarkets(previous => {
        const indexed = new Map(
          (append ? previous : []).map(market => [market.id, market]),
        )
        for (const market of body.markets) indexed.set(market.id, market)
        return [...indexed.values()].sort((left, right) => right.id - left.id)
      })
      setNextCursor(body.nextCursor ?? null)
      setProtocolPaused(Boolean(body.protocolPaused))
      if (body.settlementToken) {
        setIndexedToken({
          symbol: body.settlementToken.symbol,
          decimals: body.settlementToken.decimals,
        })
      }
    } catch (caught) {
      if ((caught as { name?: string }).name === 'AbortError') return
      setError(caught instanceof Error ? caught.message : 'Market sync failed')
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        setLoading(false)
      }
    }
  }, [])

  const refresh = useCallback(
    () => loadPage('0', false),
    [loadPage],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => {
      window.clearTimeout(timer)
      requestRef.current?.abort()
    }
  }, [refresh])

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      15_000,
    )
    return () => window.clearInterval(timer)
  }, [])
  const active = markets.filter(
    market => !protocolPaused && isActiveTradeMarket(market, now),
  )
  const inactive = markets.filter(
    market =>
      isInactiveTradeMarket(market, now) ||
      (protocolPaused && market.state === 5),
  )
  const publicMarkets = [...active, ...inactive]
  const categories = [
    'All',
    ...new Set(publicMarkets.map(market => categoryLabel(market))),
  ]

  const visible = useMemo(() => {
    const source = view === 'active' ? active : inactive
    const query = search.trim().toLowerCase()
    const filtered = source.filter(
      market =>
        (category === 'All' || categoryLabel(market) === category) &&
        (!query ||
          market.question.toLowerCase().includes(query) ||
          market.description.toLowerCase().includes(query)),
    )
    return [...filtered].sort((a, b) => {
      if (sort === 'ending') return a.tradingEndTime - b.tradingEndTime
      if (sort === 'volume')
        return Number(BigInt(b.marketVolume) - BigInt(a.marketVolume))
      if (sort === 'liquidity') {
        const liquidity = (market: ProtocolMarket) =>
          market.balances.reduce((sum, value) => sum + BigInt(value || '0'), 0n)
        return Number(liquidity(b) - liquidity(a))
      }
      return b.id - a.id
    })
  }, [active, category, inactive, search, sort, view])

  const openMarket = (market: ProtocolMarket) => {
    window.location.href = `/app?market=${market.id}`
  }

  const architecture = [
    [
      Layers3,
      t('architectureProposal'),
      t('architectureProposalBody'),
    ],
    [
      BadgeCheck,
      t('architectureGovernance'),
      t('architectureGovernanceBody'),
    ],
    [WalletCards, t('architectureTrade'), t('architectureTradeBody')],
    [Gavel, t('architectureResolve'), t('architectureResolveBody')],
    [Sparkles, t('architectureClaim'), t('architectureClaimBody')],
  ] as const

  const ecosystem = [
    [Layers3, t('ecosystemCardOne'), t('ecosystemCardOneBody')],
    [ShieldCheck, t('ecosystemCardTwo'), t('ecosystemCardTwoBody')],
    [Gavel, t('ecosystemCardThree'), t('ecosystemCardThreeBody')],
  ] as const

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Navbar />

      <section className="light-leaks relative overflow-hidden px-4 pb-24 pt-40 sm:pt-48">
        <div className="cosmic-grid pointer-events-none absolute inset-0 -z-10 opacity-40" />
        <div className="mx-auto max-w-5xl text-center">
          <div className="glass mx-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            {t('heroEyebrow')}
          </div>
          <h1 className="mx-auto mt-7 max-w-4xl text-balance font-heading text-5xl font-black leading-[1.02] tracking-tight sm:text-7xl">
            {t('heroTitleLead')}{' '}
            <span className="gradient-text">{t('heroTitleAccent')}</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('exploreMarketsSub')} {t('heroBody')}
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/app" className={`${primaryButton} h-12 rounded-full px-7`}>
              {t('launchBtn')}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <a
              href="#architecture"
              className={`${secondaryButton} h-12 rounded-full px-7`}
            >
              {t('howItWorksBtn')}
            </a>
          </div>
        </div>
      </section>

      <section id="markets" className="scroll-mt-24 border-t border-border px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                {t('liveProtocolData')}
              </p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
                {t('exploreMarketsTitle')}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('exploreMarketsSub')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className={secondaryButton}
            >
              {t('refresh')}
            </button>
          </div>

          <div className="protocol-panel mb-7 grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative block">
              <span className="sr-only">{t('searchMarkets')}</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={t('searchMarkets')}
                className={`${inputClass} pl-10`}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <span>{t('sortBy')}</span>
              <select
                value={sort}
                onChange={event => setSort(event.target.value as SortMode)}
                className={inputClass}
              >
                <option value="newest">{t('newest')}</option>
                <option value="ending">{t('endingSoon')}</option>
                <option value="liquidity">{t('liquidity')}</option>
                <option value="volume">{t('volume')}</option>
              </select>
            </label>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div
              role="tablist"
              aria-label={t('marketActivity')}
              className="flex gap-2"
            >
              {([
                ['active', `${t('activeTrades')} (${active.length})`],
                ['inactive', `${t('inactiveTrades')} (${inactive.length})`],
              ] as const).map(([id, label]) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === id}
                  key={id}
                  onClick={() => setView(id)}
                  className={`focus-ring rounded-full px-4 py-2 text-sm font-bold ${
                    view === id
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {categories.map(item => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`focus-ring whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${
                    category === item
                      ? 'bg-[#FFD700] font-bold text-black'
                      : 'border border-border'
                  }`}
                >
                  {item === 'All' ? t('all') : item}
                </button>
              ))}
            </div>
          </div>

          {loading && !markets.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-live="polite">
              {[0, 1, 2].map(item => (
                <div
                  key={item}
                  className="protocol-panel h-[430px] animate-pulse bg-secondary/35"
                />
              ))}
              <span className="sr-only">{t('loadingMarkets')}</span>
            </div>
          ) : error && !markets.length ? (
            <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
              <p className="text-sm text-rose-200">{error}</p>
              <button
                type="button"
                onClick={() => void refresh()}
                className={`${primaryButton} mt-4`}
              >
                {t('retry')}
              </button>
            </div>
          ) : visible.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visible.map(market => (
                <MarketSummaryCard
                  key={market.id}
                  market={market}
                  decimals={indexedToken?.decimals ?? token.decimals}
                  symbol={indexedToken?.symbol ?? token.symbol}
                  onOpen={openMarket}
                  paused={protocolPaused || Boolean(market.marketPaused)}
                />
              ))}
            </div>
          ) : (
            <EmptyState>{t('noMarkets')}</EmptyState>
          )}
          {error && markets.length > 0 && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"
            >
              {error}
            </p>
          )}
          {nextCursor && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => void loadPage(nextCursor, true)}
                disabled={loading}
                className={secondaryButton}
              >
                {loading ? t('loadingMarkets') : t('loadMore')}
              </button>
            </div>
          )}
        </div>
      </section>

      <section
        id="architecture"
        className="relative scroll-mt-24 border-t border-border bg-secondary/15 px-4 py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              {t('architectureEyebrow')}
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-5xl">
              {t('architectureTitle')}
            </h2>
            <p className="mt-4 text-muted-foreground">{t('architectureSub')}</p>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {architecture.map(([Icon, title, body], index) => (
              <article
                key={title}
                className="protocol-panel animate-enter p-5 transition hover:-translate-y-1 hover:border-primary/30"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="ecosystem" className="scroll-mt-24 border-t border-border px-4 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              {t('ecosystemEyebrow')}
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-5xl">
              {t('ecosystemTitle')}
            </h2>
            <p className="mt-4 text-muted-foreground">{t('ecosystemSub')}</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {ecosystem.map(([Icon, title, body]) => (
              <article key={title} className="glass rounded-2xl p-7">
                <Icon className="size-7 text-primary" aria-hidden="true" />
                <h3 className="mt-5 text-xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
