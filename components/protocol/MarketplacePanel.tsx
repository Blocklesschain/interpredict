'use client'

import { ArrowLeft, ExternalLink, Search, ShieldAlert } from 'lucide-react'
import { ethers } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import { useWeb3 } from '@/app/context/Web3Context'
import type {
  AccountMarketState,
  MarketRuntime,
  OpenMarket,
  WorkspaceAction,
} from '@/lib/interpredictFrontend'
import {
  categoryLabel,
  MARKET_STATES,
  normalizePermanentURI,
  type ProtocolMarket,
} from '@/lib/interpredictProtocol'
import {
  Countdown,
  EmptyState,
  MarketSummaryCard,
  MarketThumbnail,
  StateBadge,
  formatDate,
  formatToken,
  inputClass,
  primaryButton,
  secondaryButton,
  useProtocolNow,
} from './ProtocolUI'

type Quote = {
  fee: bigint
  net: bigint
  shares: bigint
  currentPrice: bigint
  postTradePrice: bigint
}

const emptyRuntime: MarketRuntime = {
  paused: false,
  marketPaused: false,
  participantCount: 0,
  tradeCount: 0,
  resolutionMembershipEpoch: 0,
  adminVerificationDeadline: 0,
  resolutionQuorum: 0,
}

export function MarketplacePanel({
  markets,
  selected,
  accountState,
  runtimes,
  onOpen,
  onClose,
  perform,
}: {
  markets: ProtocolMarket[]
  selected: ProtocolMarket | null
  accountState: Record<number, AccountMarketState>
  runtimes: Record<number, MarketRuntime>
  onOpen: OpenMarket
  onClose: () => void
  perform: WorkspaceAction
}) {
  const { t, token, protocolPaused } = useWeb3()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [view, setView] = useState<'active' | 'inactive'>('active')
  const now = useProtocolNow()
  const active = markets.filter(
    market =>
      market.state === 5 &&
      market.tradingEndTime > now &&
      !protocolPaused &&
      !runtimes[market.id]?.paused,
  )
  const inactive = markets.filter(
    market =>
      market.state >= 6 ||
      (market.state === 5 &&
        (market.tradingEndTime <= now ||
          protocolPaused ||
          runtimes[market.id]?.paused)) ||
      (market.state === 3 && market.activeMarketCancelled),
  )
  const categories = [
    'All',
    ...new Set([...active, ...inactive].map(categoryLabel)),
  ]
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (view === 'active' ? active : inactive).filter(
      market =>
        (category === 'All' || categoryLabel(market) === category) &&
        (!query ||
          market.question.toLowerCase().includes(query) ||
          market.description.toLowerCase().includes(query)),
    )
  }, [active, category, inactive, search, view])

  if (selected) {
    return (
      <MarketDetail
        key={selected.id}
        market={selected}
        accountState={accountState[selected.id]}
        runtime={runtimes[selected.id] ?? emptyRuntime}
        onClose={onClose}
        perform={perform}
      />
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-2xl font-bold">{t('marketplace')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('exploreMarketsSub')}
          </p>
        </div>
        <label className="relative block w-full xl:max-w-sm">
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
      </div>

      <div className="mb-6 flex flex-col gap-4">
        <div role="tablist" aria-label="Market status" className="flex gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'active'}
            onClick={() => setView('active')}
            className={view === 'active' ? primaryButton : secondaryButton}
          >
            {t('activeTrades')} ({active.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'inactive'}
            onClick={() => setView('inactive')}
            className={view === 'inactive' ? primaryButton : secondaryButton}
          >
            {t('inactiveTrades')} ({inactive.length})
          </button>
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

      {visible.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map(market => (
            <MarketSummaryCard
              key={market.id}
              market={market}
              decimals={token.decimals}
              symbol={token.symbol}
              onOpen={onOpen}
              paused={protocolPaused || Boolean(runtimes[market.id]?.paused)}
            />
          ))}
        </div>
      ) : (
        <EmptyState>{t('noMarkets')}</EmptyState>
      )}
    </div>
  )
}

function MarketDetail({
  market,
  accountState,
  runtime,
  onClose,
  perform,
}: {
  market: ProtocolMarket
  accountState?: AccountMarketState
  runtime: MarketRuntime
  onClose: () => void
  perform: WorkspaceAction
}) {
  const {
    account,
    roles,
    token,
    protocolPaused,
    readContract,
    approveSettlement,
    t,
  } = useWeb3()
  const [outcome, setOutcome] = useState(0)
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState('1')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteError, setQuoteError] = useState('')
  const [actionError, setActionError] = useState('')
  const now = useProtocolNow()
  const tradingOpen =
    market.state === 5 &&
    market.tradingEndTime > now &&
    !runtime.paused &&
    !protocolPaused

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(async () => {
      setQuote(null)
      setQuoteError('')
      if (!amount || !tradingOpen) return
      try {
        const gross = ethers.parseUnits(amount, token.decimals)
        if (gross < token.minimumTrade) {
          throw new Error(
            `Minimum trade is ${formatToken(token.minimumTrade, token.decimals)} ${token.symbol}`,
          )
        }
        const result = await readContract<{
          fee: bigint
          netAmount: bigint
          shares: bigint
          currentPrice: bigint
          postTradePrice: bigint
        }>('quoteBuy', [market.id, outcome, gross])
        if (cancelled) return
        if (
          result.fee === undefined ||
          result.netAmount === undefined ||
          result.shares === undefined ||
          result.currentPrice === undefined ||
          result.postTradePrice === undefined
        ) {
          throw new Error(
            'quoteBuy ABI outputs must retain their canonical V2 names',
          )
        }
        setQuote({
          fee: BigInt(result.fee),
          net: BigInt(result.netAmount),
          shares: BigInt(result.shares),
          currentPrice: BigInt(result.currentPrice),
          postTradePrice: BigInt(result.postTradePrice),
        })
      } catch (error) {
        if (!cancelled) {
          setQuoteError(error instanceof Error ? error.message : 'Quote unavailable')
        }
      }
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [
    amount,
    market.id,
    outcome,
    readContract,
    token.decimals,
    token.minimumTrade,
    token.symbol,
    tradingOpen,
  ])

  const slippagePercent = Number(slippage)
  const validSlippage =
    Number.isFinite(slippagePercent) &&
    slippagePercent >= 0 &&
    slippagePercent <= 50
  const minimumQuotedShares =
    quote && validSlippage
      ? (quote.shares *
          (10_000n - BigInt(Math.round(slippagePercent * 100)))) /
        10_000n
      : null

  const buy = async () => {
    setActionError('')
    try {
      if (!account) throw new Error(t('connectRequired'))
      if (!quote) throw new Error(quoteError || 'Enter a valid amount')
      if (!validSlippage || minimumQuotedShares === null) {
        throw new Error('Slippage must be between 0 and 50 percent')
      }
      const gross = ethers.parseUnits(amount, token.decimals)
      await approveSettlement(gross)
      await perform(
        'buyOutcome',
        [market.id, outcome, gross, minimumQuotedShares],
        `Buy ${market.outcomes[outcome]}`,
      )
      setAmount('')
      setQuote(null)
    } catch (error) {
      console.error('Trade failed:', error)
      setActionError(error instanceof Error ? error.message : 'Trade failed')
    }
  }

  const isCreator =
    account && market.creator.toLowerCase() === account.toLowerCase()
  const eligibleRequester =
    Boolean(accountState?.hasTraded) || Boolean(isCreator) || roles.isActiveDEC
  const abandoned =
    now >= market.tradingEndTime + 3_600
  const requestableState =
    market.state === 6 ||
    market.state === 7 ||
    (market.state === 5 && market.tradingEndTime <= now)
  const canRequest =
    Boolean(account) &&
    requestableState &&
    (eligibleRequester || abandoned)
  const winningShares =
    market.state === 13
      ? accountState?.shares[market.winningOutcome] ?? 0n
      : 0n
  const canClaimPayout =
    market.state === 13 &&
    (winningShares > 0n ||
      (BigInt(market.winningSharesRemaining) === 0n &&
        (accountState?.netContribution ?? 0n) > 0n)) &&
    !accountState?.payoutClaimed
  const isZeroWinningShareRefund =
    canClaimPayout && BigInt(market.winningSharesRemaining) === 0n
  const canClaimRefund =
    market.state === 3 &&
    market.activeMarketCancelled &&
    (accountState?.netContribution ?? 0n) > 0n
  const evidence = [
    ['Primary', market.primaryEvidenceURI],
    ['Backup', market.backupEvidenceURI],
  ].filter(([, uri]) => uri)

  return (
    <div>
      <button type="button" onClick={onClose} className={secondaryButton}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t('backToMarkets')}
      </button>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
        <article className="overflow-hidden rounded-2xl border border-border">
          <MarketThumbnail market={market} className="h-64 w-full" />
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                {categoryLabel(market)} ·{' '}
                {market.origin === 1 ? t('teamMarket') : t('communityMarket')}
              </span>
              <StateBadge
                market={market}
                paused={runtime.paused || protocolPaused}
              />
            </div>
            <h1 className="mt-4 text-2xl font-bold leading-tight sm:text-3xl">
              {market.question}
            </h1>
            {market.description && (
              <p className="mt-4 leading-relaxed text-muted-foreground">
                {market.description}
              </p>
            )}

            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <Detail label={t('origin')}>
                {market.origin === 1 ? t('teamMarket') : t('communityMarket')}
              </Detail>
              <Detail label={t('state')}>
                {MARKET_STATES[market.state] ?? market.state}
              </Detail>
              <Detail label={t('ends')}>
                {formatDate(market.tradingEndTime)}
              </Detail>
              <Detail label={t('participants')}>
                {runtime.participantCount}
              </Detail>
              <Detail label={t('volume')}>
                {formatToken(market.marketVolume, token.decimals)} {token.symbol}
              </Detail>
              <Detail label="Trades">{runtime.tradeCount}</Detail>
            </dl>

            <section className="mt-7 rounded-xl bg-secondary/35 p-4">
              <h2 className="font-bold">{t('resolutionCriteria')}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {market.resolutionCriteria}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {evidence.map(([label, uri]) => (
                  <a
                    key={label}
                    href={normalizePermanentURI(uri)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-primary hover:underline"
                  >
                    {label} evidence
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </section>

            <div className="mt-6 flex flex-wrap gap-3">
              {market.state === 5 && market.tradingEndTime <= now && (
                <button
                  type="button"
                  onClick={() =>
                    void perform(
                      'syncTradingClosed',
                      [market.id],
                      'Synchronize trading closure',
                    )
                  }
                  className={secondaryButton}
                >
                  Synchronize trading closure
                </button>
              )}
              {canRequest && (
                <button
                  type="button"
                  onClick={() =>
                    void perform(
                      'requestResolution',
                      [market.id],
                      t('requestResolution'),
                    )
                  }
                  className={primaryButton}
                >
                  {t('requestResolution')}
                </button>
              )}
              {market.state === 11 && (
                <button
                  type="button"
                  onClick={() =>
                    void perform('finalizeMarket', [market.id], 'Finalize market')
                  }
                  className={primaryButton}
                >
                  Finalize market
                </button>
              )}
              {canClaimPayout && (
                <button
                  type="button"
                  onClick={() =>
                    void perform(
                      'claimPayout',
                      [market.id],
                      t('claimPayout'),
                    )
                  }
                  className={primaryButton}
                >
                  {isZeroWinningShareRefund ? t('claimRefund') : t('claimPayout')}
                </button>
              )}
              {accountState?.payoutClaimed && (
                <span className="rounded-xl bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-400">
                  {t('claimed')}
                </span>
              )}
              {canClaimRefund && (
                <button
                  type="button"
                  onClick={() =>
                    void perform(
                      'claimCancellationRefund',
                      [market.id],
                      t('claimRefund'),
                    )
                  }
                  className={primaryButton}
                >
                  {t('claimRefund')}
                </button>
              )}
            </div>
          </div>
        </article>

        <aside className="h-fit rounded-2xl border border-border bg-secondary/20 p-5 xl:sticky xl:top-28">
          <h2 className="text-xl font-bold">Trade outcomes</h2>
          {runtime.paused || protocolPaused ? (
            <div className="mt-4 flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <ShieldAlert className="size-5 shrink-0" aria-hidden="true" />
              Trading is paused. Resolution and claims remain available where
              the contract permits them.
            </div>
          ) : !tradingOpen ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Trading is closed for this market.
            </p>
          ) : (
            <>
              <div className="mt-5 space-y-2" role="radiogroup" aria-label={t('outcome')}>
                {market.outcomes.map((label, index) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={outcome === index}
                    key={`${label}-${index}`}
                    onClick={() => setOutcome(index)}
                    className={`focus-ring flex w-full items-center justify-between rounded-xl border p-3 text-left text-sm ${
                      outcome === index
                        ? 'border-primary bg-primary/10'
                        : 'border-border'
                    }`}
                  >
                    <span>{label}</span>
                    <strong>
                      {(Number(BigInt(market.prices[index] || '0')) / 1e16).toFixed(1)}
                      %
                    </strong>
                  </button>
                ))}
              </div>
              <label className="mt-5 block text-sm font-semibold">
                {t('grossAmount')} ({token.symbol})
                <input
                  value={amount}
                  onChange={event => setAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder={formatToken(token.minimumTrade, token.decimals)}
                  className={`${inputClass} mt-1.5`}
                />
              </label>
              <label className="mt-4 block text-sm font-semibold">
                {t('slippage')} (%)
                <input
                  value={slippage}
                  onChange={event => setSlippage(event.target.value)}
                  inputMode="decimal"
                  className={`${inputClass} mt-1.5`}
                />
              </label>
              {quote && (
                <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-background/60 p-4 text-xs">
                  <Detail label={t('fee')}>
                    {formatToken(quote.fee, token.decimals)} {token.symbol}
                  </Detail>
                  <Detail label={t('netAmount')}>
                    {formatToken(quote.net, token.decimals)} {token.symbol}
                  </Detail>
                  <Detail label={t('estimatedShares')}>
                    {formatToken(quote.shares, token.decimals)}
                  </Detail>
                  <Detail label={t('minimumShares')}>
                    {minimumQuotedShares === null
                      ? '—'
                      : formatToken(minimumQuotedShares, token.decimals)}
                  </Detail>
                  <Detail label="Price impact">
                    {(Number(quote.currentPrice) / 1e16).toFixed(2)}% →{' '}
                    {(Number(quote.postTradePrice) / 1e16).toFixed(2)}%
                  </Detail>
                </dl>
              )}
              {(quoteError || actionError) && (
                <p role="alert" className="mt-3 text-xs text-rose-400">
                  {actionError || quoteError}
                </p>
              )}
              <button
                type="button"
                onClick={() => void buy()}
                disabled={!quote || !account}
                className={`${primaryButton} mt-5 w-full`}
              >
                {account ? t('approveAndBuy') : t('connectRequired')}
              </button>
              <p className="mt-3 text-xs text-muted-foreground">
                <Countdown timestamp={market.tradingEndTime} />
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

function Detail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold">{children}</dd>
    </div>
  )
}
