'use client'

import {
  Award,
  Factory,
  History,
  LayoutGrid,
  PlusCircle,
  Shield,
  Vote,
  WalletCards,
} from 'lucide-react'
import { ethers } from 'ethers'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useWeb3 } from '@/app/context/Web3Context'
import {
  CreatorPanel,
  HistoryPanel,
  PositionsPanel,
} from '@/components/protocol/AccountPanels'
import {
  AppShell,
  type WorkspaceTab,
} from '@/components/protocol/AppShell'
import { CreateMarketPanel } from '@/components/protocol/CreateMarketPanel'
import {
  AdminPanel,
  GovernancePanel,
  RewardsPanel,
} from '@/components/protocol/GovernancePanels'
import { MarketplacePanel } from '@/components/protocol/MarketplacePanel'
import { EmptyState } from '@/components/protocol/ProtocolUI'
import type {
  AccountMarketState,
  ChainActivity,
  DECAccount,
  DECMemberRow,
  MarketRuntime,
  WorkspaceAction,
} from '@/lib/interpredictFrontend'
import {
  INTERPREDICT_ABI,
  type ProtocolMarket,
} from '@/lib/interpredictProtocol'

const PAGE_SIZE = 50
const HISTORY_BLOCK_WINDOW = 20_000
const configuredDeploymentBlock = Number(
  process.env.NEXT_PUBLIC_CONTRACT_DEPLOYMENT_BLOCK ?? 0,
)
const CONTRACT_DEPLOYMENT_BLOCK =
  Number.isSafeInteger(configuredDeploymentBlock) &&
  configuredDeploymentBlock >= 0
    ? configuredDeploymentBlock
    : 0
const protocolInterface = new ethers.Interface(INTERPREDICT_ABI)

type MarketsPage = {
  markets?: ProtocolMarket[]
  nextCursor?: string | null
  protocolPaused?: boolean
  degraded?: boolean
  failedMarkets?: unknown[]
  error?: string
}

function namedTupleValue(value: unknown, key: string) {
  if (!value || (typeof value !== 'object' && !Array.isArray(value))) {
    throw new Error(`Contract result is missing the named "${key}" output`)
  }
  const tuple = value as Record<string, unknown>
  if (!(key in tuple)) {
    throw new Error(`Contract ABI is missing the named "${key}" output`)
  }
  return tuple[key]
}

function bigintValue(value: unknown) {
  return BigInt(String(value ?? 0))
}

function numberValue(value: unknown) {
  return Number(bigintValue(value))
}

function booleanValue(value: unknown) {
  return value === true
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
) {
  const results = new Array<PromiseSettledResult<R>>(values.length)
  let nextIndex = 0
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (nextIndex < values.length) {
        const index = nextIndex++
        try {
          results[index] = {
            status: 'fulfilled',
            value: await mapper(values[index]),
          }
        } catch (reason) {
          results[index] = { status: 'rejected', reason }
        }
      }
    },
  )
  await Promise.all(workers)
  return results
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return typeof error === 'string' ? error : 'Unable to load protocol data'
}

function eventTopic(name: string) {
  try {
    return protocolInterface.getEvent(name)?.topicHash
  } catch {
    return undefined
  }
}

function eventArgument(
  parsed: ethers.LogDescription,
  name: string,
): unknown {
  return (parsed.args as unknown as Record<string, unknown>)[name]
}

function describeEvent(parsed: ethers.LogDescription) {
  const details: string[] = []
  const marketId = eventArgument(parsed, 'marketId')
  const outcomeIndex = eventArgument(parsed, 'outcomeIndex')
  const vote = eventArgument(parsed, 'vote')
  const amount =
    eventArgument(parsed, 'amount') ??
    eventArgument(parsed, 'grossAmount') ??
    eventArgument(parsed, 'reward')
  const shares = eventArgument(parsed, 'shares')
  const reputation = eventArgument(parsed, 'reputation')
  const honest = eventArgument(parsed, 'honest')

  if (marketId !== undefined) details.push(`Market #${String(marketId)}`)
  if (outcomeIndex !== undefined) {
    details.push(`outcome ${numberValue(outcomeIndex) + 1}`)
  }
  if (vote !== undefined) details.push(`vote ${String(vote)}`)
  if (amount !== undefined) details.push(`amount ${String(amount)}`)
  if (shares !== undefined) details.push(`shares ${String(shares)}`)
  if (reputation !== undefined) {
    details.push(`reputation ${String(reputation)}`)
  }
  if (honest !== undefined) details.push(honest ? 'honest' : 'incorrect')
  return details.join(' · ') || 'Wallet activity recorded on-chain'
}

export default function ProtocolWorkspacePage() {
  const {
    account,
    contractAddress,
    hasProtocolFunction,
    isConfigured,
    isCorrectNetwork,
    provider,
    readContract,
    refreshWalletState,
    roles,
    runTransaction,
    t,
  } = useWeb3()
  const [activeTab, setActiveTab] = useState('marketplace')
  const [markets, setMarkets] = useState<ProtocolMarket[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [apiProtocolPaused, setApiProtocolPaused] = useState(false)
  const [marketLoading, setMarketLoading] = useState(true)
  const [marketError, setMarketError] = useState('')
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    const value = new URLSearchParams(window.location.search).get('market')
    return value && /^\d+$/.test(value) ? Number(value) : null
  })
  const initialMarketIdRef = useRef(selectedMarketId)
  const [accountState, setAccountState] = useState<
    Record<number, AccountMarketState>
  >({})
  const [accountLoading, setAccountLoading] = useState(false)
  const [accountError, setAccountError] = useState('')
  const [member, setMember] = useState<DECAccount | null>(null)
  const [members, setMembers] = useState<DECMemberRow[]>([])
  const [accountRefresh, setAccountRefresh] = useState(0)
  const [chainActivities, setChainActivities] = useState<ChainActivity[]>([])
  const [chainLoading, setChainLoading] = useState(false)
  const [chainError, setChainError] = useState('')
  const [chainRange, setChainRange] = useState<{
    fromBlock: number
    toBlock: number
    deploymentBlock: number
  } | null>(null)
  const [canLoadOlder, setCanLoadOlder] = useState(false)
  const marketAbortRef = useRef<AbortController | null>(null)

  const runtimes = useMemo<Record<number, MarketRuntime>>(
    () =>
      Object.fromEntries(
        markets.map(market => [
          market.id,
          {
            paused: apiProtocolPaused || Boolean(market.marketPaused),
            marketPaused: Boolean(market.marketPaused),
            participantCount: market.participantCount ?? 0,
            tradeCount: market.tradeCount ?? 0,
            resolutionMembershipEpoch: market.resolutionMembershipEpoch,
            adminVerificationDeadline: market.adminVerificationDeadline,
            resolutionQuorum: market.resolutionQuorum,
          },
        ]),
      ),
    [apiProtocolPaused, markets],
  )

  const selectedMarket =
    markets.find(market => market.id === selectedMarketId) ?? null

  const loadMarkets = useCallback(async (
    cursor = '0',
    append = false,
    exactMarketId?: number,
  ) => {
    marketAbortRef.current?.abort()
    const controller = new AbortController()
    marketAbortRef.current = controller
    setMarketLoading(true)
    setMarketError('')

    try {
      const response = await fetch(
        exactMarketId === undefined
          ? `/api/markets?cursor=${encodeURIComponent(cursor)}&limit=${PAGE_SIZE}`
          : `/api/markets?id=${exactMarketId}`,
        { cache: 'no-store', signal: controller.signal },
      )
      const payload = (await response.json()) as MarketsPage
      if (!response.ok) {
        throw new Error(payload.error || `Market index failed (${response.status})`)
      }
      if (!Array.isArray(payload.markets)) {
        throw new Error('Market index returned an invalid response')
      }
      const pageMarkets = payload.markets
      setMarkets(previous => {
        const indexed = new Map(
          (append ? previous : []).map(market => [market.id, market]),
        )
        for (const market of pageMarkets) indexed.set(market.id, market)
        return [...indexed.values()].sort((left, right) => right.id - left.id)
      })
      if (exactMarketId === undefined) {
        setNextCursor(payload.nextCursor ?? null)
      }
      setApiProtocolPaused(Boolean(payload.protocolPaused))
      setMarketError(
        payload.degraded
          ? `${payload.failedMarkets?.length ?? 0} market reads failed on this page.`
          : '',
      )
    } catch (error) {
      if (controller.signal.aborted) return
      console.error('Market index load failed:', error)
      setMarketError(errorMessage(error))
    } finally {
      if (!controller.signal.aborted) setMarketLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        await loadMarkets()
        if (initialMarketIdRef.current !== null) {
          await loadMarkets('0', true, initialMarketIdRef.current)
        }
      })()
    }, 0)
    return () => {
      window.clearTimeout(timer)
      marketAbortRef.current?.abort()
    }
  }, [loadMarkets])

  const readMember = useCallback(
    async (address: string): Promise<DECAccount> => {
      const [rawMember, rawRewards] = await Promise.all([
        readContract<unknown>('decMembers', [address]),
        readContract<unknown>('decRewardsView', [address]),
      ])
      const storedRewards = bigintValue(
        namedTupleValue(rawMember, 'storedRewards'),
      )
      return {
        exists: booleanValue(namedTupleValue(rawMember, 'exists')),
        active: booleanValue(namedTupleValue(rawMember, 'active')),
        removed: booleanValue(namedTupleValue(rawMember, 'removed')),
        joinedAt: numberValue(namedTupleValue(rawMember, 'joinedAt')),
        proposalVotes: bigintValue(
          namedTupleValue(rawMember, 'proposalVotes'),
        ),
        resolutionVotes: bigintValue(
          namedTupleValue(rawMember, 'resolutionVotes'),
        ),
        honestResolutionVotes: bigintValue(
          namedTupleValue(rawMember, 'honestResolutionVotes'),
        ),
        incorrectResolutionVotes: bigintValue(
          namedTupleValue(rawMember, 'incorrectResolutionVotes'),
        ),
        reputation: bigintValue(namedTupleValue(rawMember, 'reputation')),
        totalRewardsEarned: bigintValue(
          namedTupleValue(rawMember, 'totalRewardsEarned'),
        ),
        totalRewardsClaimed: bigintValue(
          namedTupleValue(rawMember, 'totalRewardsClaimed'),
        ),
        storedRewards,
        claimableRewards: bigintValue(
          namedTupleValue(rawRewards, 'claimable'),
        ),
      }
    },
    [readContract],
  )

  const loadAccountData = useCallback(async () => {
    if (!account || !isCorrectNetwork || !isConfigured) {
      setAccountState({})
      setMember(null)
      setMembers([])
      setAccountError('')
      setAccountLoading(false)
      return
    }

    setAccountLoading(true)
    setAccountError('')
    try {
      const results = await mapWithConcurrency(markets, 4, async market => {
        const [
          shares,
          resolutionCounts,
          netContribution,
          hasTraded,
          payoutClaimed,
          proposalVote,
          resolutionVote,
          reputationSettled,
          rewardVested,
          resolutionEligible,
        ] = await Promise.all([
          Promise.all(
            market.outcomes.map((_, index) =>
              readContract<unknown>('userShares', [market.id, account, index]),
            ),
          ),
          Promise.all(
            market.outcomes.map((_, index) =>
              readContract<unknown>('resolutionVoteCounts', [
                market.id,
                index,
              ]),
            ),
          ),
          readContract<unknown>('userNetContribution', [market.id, account]),
          readContract<unknown>('hasTradedInMarket', [market.id, account]),
          readContract<unknown>('hasClaimedPayout', [market.id, account]),
          readContract<unknown>('proposalVotes', [market.id, account]),
          readContract<unknown>('resolutionVotes', [market.id, account]),
          readContract<unknown>('resolutionReputationSettled', [
            market.id,
            account,
          ]),
          hasProtocolFunction('decMarketRewardClaimed')
            ? readContract<unknown>('decMarketRewardClaimed', [
                market.id,
                account,
              ])
            : Promise.resolve(false),
          market.resolutionRequestedAt > 0 &&
          hasProtocolFunction('isResolutionVoterEligible')
            ? readContract<unknown>('isResolutionVoterEligible', [
                market.id,
                account,
              ])
            : Promise.resolve(false),
        ])
        const state: AccountMarketState = {
          shares: shares.map(bigintValue),
          netContribution: bigintValue(netContribution),
          hasTraded: booleanValue(hasTraded),
          payoutClaimed: booleanValue(payoutClaimed),
          proposalVote: numberValue(proposalVote),
          resolutionVote: numberValue(resolutionVote),
          resolutionCounts: resolutionCounts.map(bigintValue),
          reputationSettled: booleanValue(reputationSettled),
          rewardVested: booleanValue(rewardVested),
          resolutionEligible: booleanValue(resolutionEligible),
        }
        return [market.id, state] as const
      })

      const nextState: Record<number, AccountMarketState> = {}
      const failures: unknown[] = []
      for (const result of results) {
        if (result.status === 'fulfilled') {
          nextState[result.value[0]] = result.value[1]
        } else {
          failures.push(result.reason)
        }
      }
      setAccountState(nextState)
      if (failures.length) {
        console.error('Some account market reads failed:', failures)
        setAccountError(
          `${failures.length} account market ${
            failures.length === 1 ? 'read' : 'reads'
          } failed. Refresh to retry.`,
        )
      }

      const currentMember = await readMember(account)
      setMember(currentMember)

      if (roles.isAdmin || roles.isDECManager) {
        const addresses = Array.from(
          await readContract<readonly string[]>('getDECMemberList'),
        )
        const memberResults = await mapWithConcurrency(
          addresses,
          4,
          async address => ({ ...(await readMember(address)), address }),
        )
        const nextMembers: DECMemberRow[] = []
        const memberFailures: unknown[] = []
        for (const result of memberResults) {
          if (result.status === 'fulfilled') nextMembers.push(result.value)
          else memberFailures.push(result.reason)
        }
        setMembers(nextMembers)
        if (memberFailures.length) {
          console.error('Some DEC member reads failed:', memberFailures)
          setAccountError(current =>
            [
              current,
              `${memberFailures.length} DEC member reads failed.`,
            ]
              .filter(Boolean)
              .join(' '),
          )
        }
      } else {
        setMembers([])
      }
    } catch (error) {
      console.error('Account data load failed:', error)
      setAccountError(errorMessage(error))
    } finally {
      setAccountLoading(false)
    }
  }, [
    account,
    hasProtocolFunction,
    isConfigured,
    isCorrectNetwork,
    markets,
    readContract,
    readMember,
    roles.isAdmin,
    roles.isDECManager,
  ])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAccountData(), 0)
    return () => window.clearTimeout(timer)
  }, [accountRefresh, loadAccountData])

  const perform = useCallback<WorkspaceAction>(
    async (method, args, label) => {
      await runTransaction(method, args, label)
      try {
        await refreshWalletState()
      } catch (error) {
        console.error('Wallet refresh after transaction failed:', error)
        setAccountError(errorMessage(error))
      }
      await loadMarkets()
      setAccountRefresh(value => value + 1)
    },
    [loadMarkets, refreshWalletState, runTransaction],
  )

  const openMarket = useCallback((market: ProtocolMarket) => {
    setSelectedMarketId(market.id)
    setActiveTab('marketplace')
    window.history.replaceState(null, '', `/app?market=${market.id}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const closeMarket = useCallback(() => {
    setSelectedMarketId(null)
    window.history.replaceState(null, '', '/app')
  }, [])

  const refresh = useCallback(async () => {
    await loadMarkets()
    try {
      await refreshWalletState()
    } catch (error) {
      console.error('Wallet refresh failed:', error)
      setAccountError(errorMessage(error))
    }
    setAccountRefresh(value => value + 1)
  }, [loadMarkets, refreshWalletState])

  const loadChainHistory = useCallback(async (older = false) => {
    if (!account || !provider || !isCorrectNetwork || !isConfigured) {
      setChainError(t('connectRequired'))
      return
    }
    setChainLoading(true)
    setChainError('')
    try {
      const latestBlock =
        older && chainRange
          ? chainRange.fromBlock - 1
          : await provider.getBlockNumber()
      if (latestBlock < CONTRACT_DEPLOYMENT_BLOCK) {
        setCanLoadOlder(false)
        return
      }
      const fromBlock = Math.max(
        CONTRACT_DEPLOYMENT_BLOCK,
        latestBlock - HISTORY_BLOCK_WINDOW + 1,
      )
      const accountTopic = ethers.zeroPadValue(account, 32)
      const marketAccountEventNames = [
        'OutcomePurchased',
        'PayoutClaimed',
        'CancellationRefundClaimed',
        'CreatorFeesClaimed',
        'CreatorSeedReturned',
        'ProposalVoteCast',
        'ResolutionVoteCast',
        'ResolutionParticipationSettled',
        'CommunityMarketProposed',
        'TeamMarketCreated',
        'ResolutionRequested',
        'ProposalRefunded',
        'ActiveMarketCancelled',
        'OutcomeConfirmed',
        'MarketPauseChanged',
      ]
      const directAccountEventNames = [
        'DECRewardsClaimed',
        'DECReputationUpdated',
        'DECMemberStatusChanged',
      ]
      const marketAccountTopics = marketAccountEventNames
        .map(eventTopic)
        .filter((topic): topic is string => Boolean(topic))
      const directAccountTopics = directAccountEventNames
        .map(eventTopic)
        .filter((topic): topic is string => Boolean(topic))

      const [marketLogs, directLogs] = await Promise.all([
        marketAccountTopics.length
          ? provider.getLogs({
              address: contractAddress,
              fromBlock,
              toBlock: latestBlock,
              topics: [marketAccountTopics, null, accountTopic],
            })
          : Promise.resolve([]),
        directAccountTopics.length
          ? provider.getLogs({
              address: contractAddress,
              fromBlock,
              toBlock: latestBlock,
              topics: [directAccountTopics, accountTopic],
            })
          : Promise.resolve([]),
      ])

      const activities = [...marketLogs, ...directLogs]
        .map(log => {
          const parsed = protocolInterface.parseLog(log)
          if (!parsed) return null
          return {
            id: `${log.transactionHash}-${log.index}`,
            event: parsed.name,
            detail: describeEvent(parsed),
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
          } satisfies ChainActivity
        })
        .filter((activity): activity is ChainActivity => Boolean(activity))
        .sort((left, right) => right.blockNumber - left.blockNumber)
      setChainActivities(previous => {
        const indexed = new Map(
          (older ? previous : []).map(activity => [activity.id, activity]),
        )
        for (const activity of activities) indexed.set(activity.id, activity)
        return [...indexed.values()].sort(
          (left, right) => right.blockNumber - left.blockNumber,
        )
      })
      setChainRange(previous => ({
        fromBlock: older && previous
          ? Math.min(previous.fromBlock, fromBlock)
          : fromBlock,
        toBlock: older && previous ? previous.toBlock : latestBlock,
        deploymentBlock: CONTRACT_DEPLOYMENT_BLOCK,
      }))
      setCanLoadOlder(fromBlock > CONTRACT_DEPLOYMENT_BLOCK)
    } catch (error) {
      console.error('Bounded chain history scan failed:', error)
      setChainError(
        `${errorMessage(error)}. The scan is limited to the latest ${HISTORY_BLOCK_WINDOW.toLocaleString()} blocks.`,
      )
    } finally {
      setChainLoading(false)
    }
  }, [
    account,
    chainRange,
    contractAddress,
    isConfigured,
    isCorrectNetwork,
    provider,
    t,
  ])

  const tabs = useMemo<WorkspaceTab[]>(() => {
    const items: WorkspaceTab[] = [
      { id: 'marketplace', label: t('marketplace'), icon: LayoutGrid },
      { id: 'create', label: t('createMarket'), icon: PlusCircle },
      { id: 'positions', label: t('positions'), icon: WalletCards },
      { id: 'creator', label: t('creatorDashboard'), icon: Factory },
      { id: 'governance', label: t('governance'), icon: Vote },
      { id: 'rewards', label: t('rewards'), icon: Award },
      { id: 'history', label: t('history'), icon: History },
    ]
    if (roles.isAdmin || roles.isDECManager || roles.canPause) {
      items.splice(items.length - 1, 0, {
        id: 'admin',
        label: t('administration'),
        icon: Shield,
      })
    }
    return items
  }, [roles.canPause, roles.isAdmin, roles.isDECManager, t])

  const visibleTab = tabs.some(tab => tab.id === activeTab)
    ? activeTab
    : 'marketplace'
  let panel: React.ReactNode
  switch (visibleTab) {
    case 'create':
      panel = <CreateMarketPanel perform={perform} />
      break
    case 'positions':
      panel = (
        <PositionsPanel
          markets={markets}
          accountState={accountState}
          runtimes={runtimes}
          onOpen={openMarket}
          perform={perform}
        />
      )
      break
    case 'creator':
      panel = (
        <CreatorPanel
          markets={markets}
          onOpen={openMarket}
          perform={perform}
        />
      )
      break
    case 'governance':
      panel = (
        <GovernancePanel
          markets={markets}
          accountState={accountState}
          runtimes={runtimes}
          perform={perform}
        />
      )
      break
    case 'rewards':
      panel = (
        <RewardsPanel
          member={member}
          markets={markets}
          accountState={accountState}
          perform={perform}
        />
      )
      break
    case 'admin':
      panel = (
        <AdminPanel
          markets={markets}
          runtimes={runtimes}
          members={members}
          perform={perform}
        />
      )
      break
    case 'history':
      panel = (
        <HistoryPanel
          chainActivities={chainActivities}
          chainLoading={chainLoading}
          chainError={chainError}
          chainRange={chainRange}
          canLoadOlder={canLoadOlder}
          onLoadChain={() => void loadChainHistory(false)}
          onLoadOlder={() => void loadChainHistory(true)}
        />
      )
      break
    default:
      panel = (
        <MarketplacePanel
          markets={markets}
          selected={selectedMarket}
          accountState={accountState}
          runtimes={runtimes}
          onOpen={openMarket}
          onClose={closeMarket}
          perform={perform}
        />
      )
  }

  return (
    <AppShell
      tabs={tabs}
      activeTab={visibleTab}
      onTabChange={setActiveTab}
      onRefresh={() => void refresh()}
      refreshing={marketLoading || accountLoading}
    >
      {(marketError || accountError) && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"
        >
          {[marketError, accountError].filter(Boolean).join(' ')}
        </div>
      )}
      {marketLoading && !markets.length ? (
        <EmptyState>{t('loadingMarkets')}</EmptyState>
      ) : (
        panel
      )}
      {nextCursor && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => void loadMarkets(nextCursor, true)}
            disabled={marketLoading}
            className="focus-ring inline-flex rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:border-primary/40 hover:text-primary disabled:opacity-50"
          >
            {marketLoading ? t('loadingMarkets') : t('loadMore')}
          </button>
        </div>
      )}
    </AppShell>
  )
}
