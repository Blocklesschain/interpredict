'use client'

import {
  CheckCircle2,
  Clock,
  ExternalLink,
  History as HistoryIcon,
} from 'lucide-react'
import { useWeb3 } from '@/app/context/Web3Context'
import type {
  AccountMarketState,
  ChainActivity,
  MarketRuntime,
  OpenMarket,
  WorkspaceAction,
} from '@/lib/interpredictFrontend'
import {
  DECISION_REASONS,
  MARKET_STATES,
  type ProtocolMarket,
} from '@/lib/interpredictProtocol'
import {
  Countdown,
  EmptyState,
  formatDate,
  formatToken,
  primaryButton,
  secondaryButton,
  useProtocolNow,
} from './ProtocolUI'

export function PositionsPanel({
  markets,
  accountState,
  runtimes,
  onOpen,
  perform,
}: {
  markets: ProtocolMarket[]
  accountState: Record<number, AccountMarketState>
  runtimes: Record<number, MarketRuntime>
  onOpen: OpenMarket
  perform: WorkspaceAction
}) {
  const { account, roles, token, t } = useWeb3()
  const now = useProtocolNow()
  if (!account) return <EmptyState>{t('connectRequired')}</EmptyState>
  const positions = markets.filter(market => {
    const state = accountState[market.id]
    return (
      state &&
      (state.hasTraded ||
        state.netContribution > 0n ||
        state.shares.some(value => value > 0n))
    )
  })
  if (!positions.length) return <EmptyState>{t('noPositions')}</EmptyState>

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('positions')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Durable positions and claim state are read from the V2 contract.
      </p>
      <div className="mt-6 space-y-5">
        {positions.map(market => {
          const state = accountState[market.id]
          const winningShares =
            market.state === 13 ? state.shares[market.winningOutcome] ?? 0n : 0n
          const zeroWinningShareRefund =
            market.state === 13 &&
            BigInt(market.winningSharesRemaining) === 0n &&
            state.netContribution > 0n
          const canClaim =
            market.state === 13 &&
            (winningShares > 0n || zeroWinningShareRefund) &&
            !state.payoutClaimed
          const canRefund =
            market.state === 3 &&
            market.activeMarketCancelled &&
            state.netContribution > 0n
          const isCreator = market.creator.toLowerCase() === account.toLowerCase()
          const requestableState =
            market.state === 6 ||
            market.state === 7 ||
            (market.state === 5 && market.tradingEndTime <= now)
          const canRequest =
            requestableState &&
            (state.hasTraded ||
              isCreator ||
              roles.isActiveDEC ||
              now >= market.tradingEndTime + 3_600)
          return (
            <article key={market.id} className="rounded-2xl border border-border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    Market #{market.id} · {MARKET_STATES[market.state]}
                    {runtimes[market.id]?.paused ? ` · ${t('paused')}` : ''}
                  </p>
                  <h2 className="mt-1 font-bold">{market.question}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => onOpen(market)}
                  className={secondaryButton}
                >
                  {t('marketDetails')}
                </button>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                {market.outcomes.map((outcome, index) => (
                  <div key={`${outcome}-${index}`} className="rounded-xl bg-secondary/35 p-3">
                    <dt className="text-xs text-muted-foreground">{outcome}</dt>
                    <dd className="mt-1 font-bold">
                      {formatToken(state.shares[index] ?? 0n, token.decimals)}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex flex-wrap items-center gap-3">
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
                    Synchronize closure
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
                {canClaim && (
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
                    {zeroWinningShareRefund
                      ? t('claimRefund')
                      : t('claimPayout')}
                  </button>
                )}
                {state.payoutClaimed && (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    {t('claimed')}
                  </span>
                )}
                {market.state === 13 && winningShares === 0n && (
                  <span className="text-sm text-rose-400">
                    {t('losingPosition')}
                  </span>
                )}
                {canRefund && (
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
                    {t('claimRefund')} (
                    {formatToken(state.netContribution, token.decimals)}{' '}
                    {token.symbol})
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export function CreatorPanel({
  markets,
  onOpen,
  perform,
}: {
  markets: ProtocolMarket[]
  onOpen: OpenMarket
  perform: WorkspaceAction
}) {
  const { account, token, t } = useWeb3()
  const now = useProtocolNow()
  if (!account) return <EmptyState>{t('connectRequired')}</EmptyState>
  const created = markets.filter(
    market => market.creator.toLowerCase() === account.toLowerCase(),
  )
  if (!created.length) return <EmptyState>{t('noCreatedMarkets')}</EmptyState>
  return (
    <div>
      <h1 className="text-2xl font-bold">{t('creatorDashboard')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Proposal decisions, automatic refunds, fees, seed, and resolution state.
      </p>
      <div className="mt-6 space-y-5">
        {created.map(market => {
          const fees = BigInt(market.creatorFeesClaimable)
          const seedReturnable =
            !market.seedReturned &&
            (market.state === 13 ||
              (market.state === 3 && market.activeMarketCancelled))
          return (
            <article key={market.id} className="rounded-2xl border border-border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    #{market.id} · {MARKET_STATES[market.state]}
                  </p>
                  <h2 className="mt-1 font-bold">{market.question}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {DECISION_REASONS[market.decisionReason] ?? 'No decision'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpen(market)}
                  className={secondaryButton}
                >
                  {t('marketDetails')}
                </button>
              </div>

              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <Metric label={t('proposalStart')}>
                  {formatDate(market.proposalVotingStartedAt)}
                </Metric>
                <Metric label={t('proposalDeadline')}>
                  {market.proposalVotingDeadline ? (
                    <Countdown timestamp={market.proposalVotingDeadline} />
                  ) : (
                    '—'
                  )}
                </Metric>
                <Metric label={t('approvalVotes')}>
                  {market.approvalVotes}
                </Metric>
                <Metric label={t('rejectionVotes')}>
                  {market.rejectionVotes}
                </Metric>
                <Metric label={t('refundStatus')}>
                  {market.refundCompleted
                    ? `${formatToken(market.originalSeed, token.decimals)} ${token.symbol} refunded`
                    : 'Not completed'}
                </Metric>
                <Metric label={t('creatorFees')}>
                  {formatToken(market.creatorFeesEarned, token.decimals)} earned ·{' '}
                  {formatToken(
                    market.creatorFeesClaimed,
                    token.decimals,
                  )}{' '}
                  claimed
                </Metric>
                <Metric label={t('seedStatus')}>
                  {market.seedReturned
                    ? 'Returned'
                    : seedReturnable
                      ? 'Returnable'
                      : 'Locked'}
                </Metric>
                <Metric label={t('resolutionDeadline')}>
                  {formatDate(market.resolutionVotingDeadline)}
                </Metric>
              </dl>

              <div className="mt-5 flex flex-wrap gap-3">
                {market.state === 1 &&
                  now >= market.proposalVotingDeadline && (
                    <button
                      type="button"
                      onClick={() =>
                        void perform(
                          'finalizeProposalVoting',
                          [market.id],
                          t('finalizeProposal'),
                        )
                      }
                      className={primaryButton}
                    >
                      {t('finalizeProposal')}
                    </button>
                  )}
                {fees > 0n && (
                  <button
                    type="button"
                    onClick={() =>
                      void perform(
                        'claimCreatorFees',
                        [market.id],
                        t('claimCreatorFees'),
                      )
                    }
                    className={primaryButton}
                  >
                    {t('claimCreatorFees')} (
                    {formatToken(fees, token.decimals)} {token.symbol})
                  </button>
                )}
                {seedReturnable && (
                  <button
                    type="button"
                    onClick={() =>
                      void perform(
                        'returnCreatorSeed',
                        [market.id],
                        t('returnCreatorSeed'),
                      )
                    }
                    className={primaryButton}
                  >
                    {t('returnCreatorSeed')}
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export function HistoryPanel({
  chainActivities,
  chainLoading,
  chainError,
  chainRange,
  canLoadOlder,
  onLoadChain,
  onLoadOlder,
}: {
  chainActivities: ChainActivity[]
  chainLoading: boolean
  chainError: string
  chainRange: { fromBlock: number; toBlock: number; deploymentBlock: number } | null
  canLoadOlder: boolean
  onLoadChain: () => void
  onLoadOlder: () => void
}) {
  const { account, activities, t } = useWeb3()
  if (!account) return <EmptyState>{t('connectRequired')}</EmptyState>

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('history')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Wallet session records and chunked protocol event history.
          </p>
        </div>
        <button
          type="button"
          onClick={onLoadChain}
          disabled={chainLoading}
          className={secondaryButton}
        >
          <HistoryIcon className="size-4" aria-hidden="true" />
          {chainLoading ? '…' : t('loadChainHistory')}
        </button>
      </div>

      <section className="mt-7">
        <h2 className="font-bold">{t('sessionHistory')}</h2>
        {activities.length ? (
          <div className="mt-3 space-y-3">
            {activities.map(record => (
              <article
                key={record.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-border p-4 sm:flex-row"
              >
                <div>
                  <p className="font-semibold">{record.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {record.detail}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" aria-hidden="true" />
                    {new Date(record.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                      record.status === 'Success'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : record.status === 'Failed'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    {record.status}
                  </span>
                  {record.txHash && (
                    <a
                      href={`https://testnet-explorer.interlinklabs.ai/tx/${record.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open transaction in explorer"
                      className="focus-ring rounded-lg p-2 text-primary"
                    >
                      <ExternalLink className="size-4" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState>{t('noHistory')}</EmptyState>
          </div>
        )}
      </section>

      <section className="mt-9">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-bold">{t('chainHistory')}</h2>
            {chainRange && (
              <p className="mt-1 text-xs text-muted-foreground">
                Loaded blocks {chainRange.fromBlock.toLocaleString()}–
                {chainRange.toBlock.toLocaleString()}.
                {canLoadOlder
                  ? ` Earlier events remain available down to configured deployment block ${chainRange.deploymentBlock.toLocaleString()}.`
                  : ' The configured deployment range is complete.'}
              </p>
            )}
          </div>
          {canLoadOlder && (
            <button
              type="button"
              onClick={onLoadOlder}
              disabled={chainLoading}
              className={secondaryButton}
            >
              {chainLoading ? '…' : 'Load older events'}
            </button>
          )}
        </div>
        {chainError && (
          <p role="alert" className="mt-3 text-sm text-amber-300">
            {chainError}
          </p>
        )}
        {chainActivities.length ? (
          <div className="mt-3 space-y-3">
            {chainActivities.map(record => (
              <article key={record.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-semibold">{record.event}</p>
                  <span className="text-xs text-muted-foreground">
                    Block {record.blockNumber}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {record.detail}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {t('noHistory')}
          </p>
        )}
      </section>
    </div>
  )
}

function Metric({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-secondary/35 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{children}</dd>
    </div>
  )
}
