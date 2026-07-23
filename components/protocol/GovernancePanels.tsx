'use client'

import { ExternalLink, Gavel, ShieldCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { useWeb3 } from '@/app/context/Web3Context'
import type {
  AccountMarketState,
  DECAccount,
  DECMemberRow,
  MarketRuntime,
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
  MarketThumbnail,
  formatDate,
  formatToken,
  inputClass,
  primaryButton,
  secondaryButton,
  useProtocolNow,
} from './ProtocolUI'

const resolutionFailures = ['None', 'No votes', 'Quorum not met', 'Tied vote']

export function GovernancePanel({
  markets,
  accountState,
  runtimes,
  perform,
}: {
  markets: ProtocolMarket[]
  accountState: Record<number, AccountMarketState>
  runtimes: Record<number, MarketRuntime>
  perform: WorkspaceAction
}) {
  const { account, roles, hasProtocolFunction, t } = useWeb3()
  const proposals = markets.filter(market => market.state === 1)
  const resolutions = markets.filter(
    market => market.state >= 6 && market.state <= 13,
  )
  const now = useProtocolNow()

  const settle = (market: ProtocolMarket) => {
    if (!account) return
    if (hasProtocolFunction('settleResolutionParticipation')) {
      void perform(
        'settleResolutionParticipation',
        [market.id, account],
        t('settleParticipation'),
      )
    } else {
      void perform(
        'settleMyResolutionParticipation',
        [market.id],
        t('settleParticipation'),
      )
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('governance')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Proposal review, frozen-snapshot resolution, quorum, escalation, and
        participation settlement.
      </p>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
          Proposal governance
        </h2>
        {proposals.length ? (
          <div className="mt-4 grid gap-5 xl:grid-cols-2">
            {proposals.map(market => {
              const state = accountState[market.id]
              const votingOpen = now < market.proposalVotingDeadline
              return (
                <article
                  key={market.id}
                  className="overflow-hidden rounded-2xl border border-border"
                >
                  <MarketThumbnail market={market} className="h-36 w-full" />
                  <div className="p-5">
                    <div className="flex flex-wrap justify-between gap-2 text-xs">
                      <span className="font-bold uppercase tracking-wider text-primary">
                        #{market.id} · {categoryLabel(market)}
                      </span>
                      <span>{votingOpen ? <Countdown timestamp={market.proposalVotingDeadline} /> : t('expired')}</span>
                    </div>
                    <h3 className="mt-2 font-bold">{market.question}</h3>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Creator {market.creator.slice(0, 8)}… · ends{' '}
                      {formatDate(market.tradingEndTime)}
                    </p>
                    <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                      {market.resolutionCriteria}
                    </p>
                    <EvidenceLinks market={market} />
                    <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <Metric label={t('approvalVotes')}>
                        {market.approvalVotes}
                      </Metric>
                      <Metric label={t('rejectionVotes')}>
                        {market.rejectionVotes}
                      </Metric>
                      <Metric label="Your vote">
                        {state?.proposalVote === 1
                          ? 'Approve'
                          : state?.proposalVote === 2
                            ? 'Reject'
                            : 'None'}
                      </Metric>
                    </dl>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {votingOpen && roles.isActiveDEC && !state?.proposalVote && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              void perform(
                                'voteOnProposal',
                                [market.id, 1],
                                t('voteApprove'),
                              )
                            }
                            className={primaryButton}
                          >
                            {t('voteApprove')}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void perform(
                                'voteOnProposal',
                                [market.id, 2],
                                t('voteReject'),
                              )
                            }
                            className={secondaryButton}
                          >
                            {t('voteReject')}
                          </button>
                        </>
                      )}
                      {!votingOpen && (
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
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState>{t('noGovernanceItems')}</EmptyState>
          </div>
        )}
      </section>

      <section className="mt-10 border-t border-border pt-9">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Gavel className="size-5 text-primary" aria-hidden="true" />
          Resolution governance
        </h2>
        {resolutions.length ? (
          <div className="mt-4 space-y-5">
            {resolutions.map(market => {
              const state = accountState[market.id]
              const runtime = runtimes[market.id]
              const deadline = market.resolutionVotingDeadline
              const adminDeadline =
                runtime?.adminVerificationDeadline ??
                market.adminVerificationDeadline
              const eligibleRequester =
                Boolean(state?.hasTraded) ||
                (Boolean(account) &&
                  market.creator.toLowerCase() === account.toLowerCase()) ||
                roles.isActiveDEC
              const requestableState =
                market.state === 6 ||
                market.state === 7 ||
                (market.state === 5 && market.tradingEndTime <= now)
              const canRequest =
                Boolean(account) &&
                requestableState &&
                (eligibleRequester ||
                  now >= market.tradingEndTime + 3_600)
              const canVote =
                market.state === 9 &&
                now < deadline &&
                state?.resolutionEligible &&
                !state.resolutionVote
              const canSettle =
                market.state === 13 &&
                Boolean(state?.resolutionVote) &&
                !state?.reputationSettled
              return (
                <article key={market.id} className="rounded-2xl border border-border p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-primary">
                        #{market.id} · {MARKET_STATES[market.state]}
                      </p>
                      <h3 className="mt-1 font-bold">{market.question}</h3>
                    </div>
                    <span className="rounded-full border border-border px-3 py-1 text-xs">
                      {resolutionFailures[market.resolutionFailure] ?? 'Pending'}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                    {market.resolutionCriteria}
                  </p>
                  <EvidenceLinks market={market} />

                  <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                    <Metric label={t('snapshot')}>
                      {market.resolutionSnapshot}
                    </Metric>
                    <Metric label={t('quorum')}>
                      {runtime?.resolutionQuorum || market.resolutionQuorum}
                    </Metric>
                    <Metric label={t('voterProgress')}>
                      {market.resolutionVoterCount}/
                      {runtime?.resolutionQuorum || market.resolutionQuorum}
                    </Metric>
                    <Metric label="Membership epoch">
                      {runtime?.resolutionMembershipEpoch ||
                        market.resolutionMembershipEpoch ||
                        '—'}
                    </Metric>
                    <Metric label="Resolution requester">
                      {market.resolutionRequester || '—'}
                    </Metric>
                    <Metric label={t('resolutionDeadline')}>
                      {deadline ? <Countdown timestamp={deadline} /> : '—'}
                    </Metric>
                  </dl>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {market.outcomes.map((label, index) => (
                      <button
                        type="button"
                        key={`${label}-${index}`}
                        disabled={!canVote}
                        onClick={() =>
                          void perform(
                            'voteOnResolution',
                            [market.id, index],
                            `Vote ${label}`,
                          )
                        }
                        className={`focus-ring flex items-center justify-between rounded-xl border p-3 text-sm ${
                          state?.resolutionVote === index + 1
                            ? 'border-primary bg-primary/10'
                            : 'border-border'
                        } disabled:cursor-not-allowed disabled:opacity-70`}
                      >
                        <span>{label}</span>
                        <strong>
                          {String(state?.resolutionCounts[index] ?? 0n)}
                        </strong>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
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
                    {market.state === 9 && now >= deadline && (
                      <button
                        type="button"
                        onClick={() =>
                          void perform(
                            'finalizeResolutionVoting',
                            [market.id],
                            t('finalizeResolution'),
                          )
                        }
                        className={primaryButton}
                      >
                        {t('finalizeResolution')}
                      </button>
                    )}
                    {market.state === 10 &&
                      adminDeadline > 0 &&
                      now >= adminDeadline && (
                        <button
                          type="button"
                          onClick={() =>
                            void perform(
                              'executeAdminVerificationTimeout',
                              [market.id],
                              t('executeAdminTimeout'),
                            )
                          }
                          className={primaryButton}
                        >
                          {t('executeAdminTimeout')}
                        </button>
                      )}
                    {market.state === 11 && (
                      <button
                        type="button"
                        onClick={() =>
                          void perform(
                            'finalizeMarket',
                            [market.id],
                            'Finalize market',
                          )
                        }
                        className={primaryButton}
                      >
                        Finalize market
                      </button>
                    )}
                    {canSettle && (
                      <button
                        type="button"
                        onClick={() => settle(market)}
                        className={primaryButton}
                      >
                        {t('settleParticipation')}
                      </button>
                    )}
                  </div>
                  {market.state === 10 && adminDeadline > 0 && (
                    <p className="mt-4 text-xs text-muted-foreground">
                      Administrator verification deadline:{' '}
                      {formatDate(adminDeadline)}
                    </p>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState>{t('noGovernanceItems')}</EmptyState>
          </div>
        )}
      </section>
    </div>
  )
}

export function RewardsPanel({
  member,
  markets,
  accountState,
  perform,
}: {
  member: DECAccount | null
  markets: ProtocolMarket[]
  accountState: Record<number, AccountMarketState>
  perform: WorkspaceAction
}) {
  const { account, token, hasProtocolFunction, t } = useWeb3()
  if (!account) return <EmptyState>{t('connectRequired')}</EmptyState>
  if (!member?.exists) {
    return (
      <EmptyState>
        This wallet is not in the DEC membership registry. Membership is
        controlled by the DEC manager role.
      </EmptyState>
    )
  }
  const unsettled = markets.filter(
    market =>
      market.state === 13 &&
      Boolean(accountState[market.id]?.resolutionVote) &&
      !accountState[market.id]?.reputationSettled,
  )
  const settle = (market: ProtocolMarket) => {
    if (hasProtocolFunction('settleResolutionParticipation')) {
      void perform(
        'settleResolutionParticipation',
        [market.id, account],
        `${t('settleParticipation')} #${market.id}`,
      )
    } else {
      void perform(
        'settleMyResolutionParticipation',
        [market.id],
        `${t('settleParticipation')} #${market.id}`,
      )
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('rewards')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The reputation threshold controls new reward eligibility. Rewards
        already vested in storage remain withdrawable after suspension,
        removal, or a reputation decrease.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={t('reputation')}>
          {String(member.reputation)}
        </Metric>
        <Metric label="Membership">
          {member.removed
            ? 'Removed'
            : member.active
              ? t('active')
              : t('inactive')}
        </Metric>
        <Metric label="Honest / incorrect">
          {String(member.honestResolutionVotes)} /{' '}
          {String(member.incorrectResolutionVotes)}
        </Metric>
        <Metric label={t('eligibleRewards')}>
          {formatToken(member.claimableRewards, token.decimals)} {token.symbol}
        </Metric>
        <Metric label="Total earned">
          {formatToken(member.totalRewardsEarned, token.decimals)} {token.symbol}
        </Metric>
        <Metric label="Total claimed">
          {formatToken(member.totalRewardsClaimed, token.decimals)} {token.symbol}
        </Metric>
        <Metric label="Proposal participation">
          {String(member.proposalVotes)}
        </Metric>
        <Metric label="Resolution participation">
          {String(member.resolutionVotes)}
        </Metric>
      </div>
      <button
        type="button"
        disabled={member.claimableRewards === 0n}
        onClick={() =>
          void perform('claimDECRewards', [], t('claimRewards'))
        }
        className={`${primaryButton} mt-6`}
      >
        {t('claimRewards')}
      </button>

      <section className="mt-10 border-t border-border pt-8">
        <h2 className="font-bold">Unsettled resolution participation</h2>
        {unsettled.length ? (
          <div className="mt-4 space-y-3">
            {unsettled.map(market => (
              <div
                key={market.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
              >
                <div>
                  <p className="text-xs text-primary">Market #{market.id}</p>
                  <p className="font-semibold">{market.question}</p>
                </div>
                <button
                  type="button"
                  onClick={() => settle(market)}
                  className={primaryButton}
                >
                  {t('settleParticipation')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No finalized vote needs settlement.
          </p>
        )}
      </section>
    </div>
  )
}

export function AdminPanel({
  markets,
  runtimes,
  members,
  perform,
}: {
  markets: ProtocolMarket[]
  runtimes: Record<number, MarketRuntime>
  members: DECMemberRow[]
  perform: WorkspaceAction
}) {
  const { roles, protocolPaused, t } = useWeb3()
  const now = useProtocolNow()
  const [marketId, setMarketId] = useState(markets[0]?.id ?? 0)
  const [outcome, setOutcome] = useState(0)
  const [reason, setReason] = useState('')
  const [evidence, setEvidence] = useState('')
  const [memberAddress, setMemberAddress] = useState('')
  const [error, setError] = useState('')
  const selected = markets.find(market => market.id === marketId) ?? markets[0]
  const selectedRuntime = selected ? runtimes[selected.id] : undefined
  const adminDeadline = selected?.adminVerificationDeadline ?? 0
  const adminExpired =
    Boolean(selected?.state === 10 && adminDeadline) && now >= adminDeadline
  const bindingDECOutcome =
    selected?.state === 10 && selected.resolutionFailure === 0
  const confirmationOutcome =
    bindingDECOutcome && selected ? selected.leadingOutcome : outcome
  const canCancelSelected =
    Boolean(selected && [5, 6, 7, 9, 10].includes(selected.state)) &&
    !bindingDECOutcome &&
    !adminExpired

  if (!roles.isAdmin && !roles.isDECManager && !roles.canPause) {
    return <EmptyState>This wallet has no protocol administration role.</EmptyState>
  }

  const invoke = async (
    method: string,
    args: unknown[],
    label: string,
  ) => {
    setError('')
    try {
      await perform(method, args, label)
    } catch (caught) {
      console.error(`${label} failed:`, caught)
      setError(caught instanceof Error ? caught.message : `${label} failed`)
    }
  }

  const validateEvidence = () => {
    if (!reason.trim()) throw new Error('A reason is required')
    if (!/^(https:\/\/[^\s]+|ipfs:\/\/[^\s]+|ar:\/\/[^\s]+)$/.test(evidence)) {
      throw new Error('Use a complete https://, ipfs://, or ar:// evidence URI')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('administration')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Emergency controls, evidence-based verification, cancellation, and DEC
        membership management.
      </p>

      {roles.isAdmin && (
        <section className="mt-7 rounded-2xl border border-border p-5">
          <h2 className="font-bold">{t('protocolPause')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Current status: {protocolPaused ? t('paused') : t('active')}.
            Claims and resolution remain available according to contract rules.
          </p>
          <button
            type="button"
            onClick={() =>
              void invoke(
                protocolPaused ? 'unpauseProtocol' : 'pauseProtocol',
                [],
                protocolPaused ? t('unpauseProtocol') : t('pauseProtocol'),
              )
            }
            className={`${protocolPaused ? primaryButton : secondaryButton} mt-4`}
          >
            {protocolPaused ? t('unpauseProtocol') : t('pauseProtocol')}
          </button>
        </section>
      )}

      {roles.isAdmin && selected && (
        <section className="mt-6 rounded-2xl border border-border p-5">
          <h2 className="font-bold">Market controls</h2>
          <label className="mt-4 block text-sm font-semibold">
            Market
            <select
              value={selected.id}
              onChange={event => {
                const nextId = Number(event.target.value)
                const nextMarket = markets.find(market => market.id === nextId)
                setMarketId(nextId)
                setOutcome(
                  nextMarket?.resolutionFailure === 0
                    ? nextMarket.leadingOutcome
                    : 0,
                )
              }}
              className={`${inputClass} mt-1.5`}
            >
              {markets.map(market => (
                <option key={market.id} value={market.id}>
                  #{market.id} · {market.question.slice(0, 70)}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-3 text-sm text-muted-foreground">
            {MARKET_STATES[selected.state]} ·{' '}
            {protocolPaused
              ? `${t('protocolPause')}: ${t('paused')}`
              : selectedRuntime?.marketPaused
                ? `${t('pauseMarket')}: ${t('paused')}`
                : t('active')}
          </p>

          {selected.state === 5 && (
            <button
              type="button"
              onClick={() =>
                void invoke(
                  selectedRuntime?.marketPaused ? 'resumeMarket' : 'pauseMarket',
                  [selected.id],
                  selectedRuntime?.marketPaused
                    ? t('resumeMarket')
                    : t('pauseMarket'),
                )
              }
              className={`${secondaryButton} mt-4`}
            >
              {selectedRuntime?.marketPaused
                ? t('resumeMarket')
                : t('pauseMarket')}
            </button>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              {t('reason')}
              <textarea
                value={reason}
                onChange={event => setReason(event.target.value)}
                rows={3}
                className={`${inputClass} mt-1.5 resize-y`}
              />
            </label>
            <label className="text-sm font-semibold">
              {t('evidenceUri')}
              <input
                value={evidence}
                onChange={event => setEvidence(event.target.value)}
                placeholder="https://, ipfs://, or ar://"
                className={`${inputClass} mt-1.5`}
              />
            </label>
          </div>

          {selected.state === 10 && !adminExpired && (
            <div className="mt-4">
              <label className="block text-sm font-semibold">
                {t('outcome')}
                <select
                  value={confirmationOutcome}
                  onChange={event => setOutcome(Number(event.target.value))}
                  disabled={bindingDECOutcome}
                  className={`${inputClass} mt-1.5`}
                >
                  {selected.outcomes.map((label, index) => (
                    <option key={`${label}-${index}`} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  try {
                    validateEvidence()
                    void invoke(
                      'confirmOutcome',
                      [
                        selected.id,
                        confirmationOutcome,
                        reason.trim(),
                        evidence.trim(),
                      ],
                      t('confirmOutcome'),
                    )
                  } catch (caught) {
                    setError(
                      caught instanceof Error ? caught.message : 'Invalid input',
                    )
                  }
                }}
                className={`${primaryButton} mt-4`}
              >
                {t('confirmOutcome')}
              </button>
            </div>
          )}

          {selected.state === 10 && adminExpired && (
            <button
              type="button"
              onClick={() =>
                void invoke(
                  'executeAdminVerificationTimeout',
                  [selected.id],
                  t('executeAdminTimeout'),
                )
              }
              className={`${primaryButton} mt-4`}
            >
              {t('executeAdminTimeout')}
            </button>
          )}

          {canCancelSelected && (
            <button
              type="button"
              onClick={() => {
                try {
                  validateEvidence()
                  void invoke(
                    'cancelActiveMarket',
                    [selected.id, reason.trim(), evidence.trim()],
                    t('cancelMarket'),
                  )
                } catch (caught) {
                  setError(
                    caught instanceof Error ? caught.message : 'Invalid input',
                  )
                }
              }}
              className="focus-ring mt-4 inline-flex rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-500"
            >
              {t('cancelMarket')}
            </button>
          )}
        </section>
      )}

      {roles.isDECManager && (
        <section className="mt-6 rounded-2xl border border-border p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Users className="size-5 text-primary" aria-hidden="true" />
            DEC membership
          </h2>
          <label className="mt-4 block text-sm font-semibold">
            {t('memberAddress')}
            <input
              value={memberAddress}
              onChange={event => setMemberAddress(event.target.value)}
              className={`${inputClass} mt-1.5 font-mono`}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ['addDECMember', t('addMember')],
              ['setDECMemberActive', t('activateMember')],
              ['setDECMemberActive', t('suspendMember')],
              ['removeDECMember', t('removeMember')],
            ].map(([method, label], index) => (
              <button
                type="button"
                key={`${method}-${label}`}
                disabled={!memberAddress}
                onClick={() => {
                  const args =
                    method === 'setDECMemberActive'
                      ? [memberAddress, index === 1]
                      : [memberAddress]
                  void invoke(method, args, label)
                }}
                className={secondaryButton}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">{t('memberAddress')}</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">{t('reputation')}</th>
                  <th className="p-3">Proposal votes</th>
                  <th className="p-3">Resolution votes</th>
                  <th className="p-3">Stored rewards</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map(member => (
                  <tr key={member.address}>
                    <td className="p-3 font-mono text-xs">{member.address}</td>
                    <td className="p-3">
                      {member.removed
                        ? 'Removed'
                        : member.active
                          ? t('active')
                          : t('inactive')}
                    </td>
                    <td className="p-3">{String(member.reputation)}</td>
                    <td className="p-3">{String(member.proposalVotes)}</td>
                    <td className="p-3">{String(member.resolutionVotes)}</td>
                    <td className="p-3">{String(member.storedRewards)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-rose-400">
          {error}
        </p>
      )}
    </div>
  )
}

function EvidenceLinks({ market }: { market: ProtocolMarket }) {
  const values = [
    ['Primary evidence', market.primaryEvidenceURI],
    ['Backup evidence', market.backupEvidenceURI],
  ].filter(([, value]) => value)
  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {values.map(([label, value]) => (
        <a
          key={label}
          href={normalizePermanentURI(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring inline-flex items-center gap-1 rounded-lg text-xs font-semibold text-primary hover:underline"
        >
          {label}
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      ))}
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
