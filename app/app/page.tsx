'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useWeb3 } from '../context/Web3Context'
import { ethers } from 'ethers'
import { Layers, Hourglass, PlusCircle, Shield, History, Wallet, Menu, X, LogOut, ArrowRight, Users, Upload, Cpu, Gavel, CheckCircle2, Coins, Trophy, Award, Globe, RefreshCw } from 'lucide-react'
import { Logo } from '@/components/logo'
import Link from 'next/link'
import { getValidToken } from '@/lib/interlinkAuth'
import contractABI from '@/lib/interpredictAbi.json'
import { LanguageSelector } from '@/components/LanguageSelector'

type TabType = 'MarketPlace' | 'Market Proposals' | 'Pending Markets' | 'Make Market' | 'Join DEC' | 'History' | 'DEC Members' | 'My Votes' | 'Unresolved Markets' | 'Resolved Markets' | 'DEC Rewards' | 'Creator Dashboard'
  | 'DEC Requests' | 'DEC Resolution Voting' | 'Resolution Centre'

interface SmartMarket {
  id: number
  question: string
  description: string
  category: number
  customCategory: string
  thumbnailUri: string
  origin: number
  creator: string
  marketEndTime: number
  state: number
  resolutionCriteria: string
  outcomeLabels: string[]
  outcomePools: string[]
  outcomePrices: string[]
  totalVolume: string
  participantCount: number
  creatorFeesEarned: string
  creatorFeesClaimed: string
  creatorSeedClaimed: string
  cancelled: boolean
  cancelReason: string
  proposalVotingDeadline: number
  approvalVotes: number
  rejectionVotes: number
  proposalFinalized: boolean
  proposalDecision: number
  hasCurrentWalletVoted: boolean
  currentWalletProposalVote: number
  hasCurrentWalletVotedOnResolution: boolean
  currentWalletResolutionVote: number
  resolutionVotingDeadline: number
  activeDECSnapshot: number
  resolutionQuorum: number
  totalResolutionVotes: number
  decSelectedOutcome: number
  confirmedOutcome: number
  outcomeConfirmed: boolean
  finalized: boolean
}

interface MyPosition {
  marketId: number
  question: string
  marketState: number
  confirmedOutcome: number
  shares: string[]
  stakes: string[]
  totalStake: string
  claimablePayout: string
  claimedPayout: string
  claimed: boolean
  marketEndTime: number
  outcomeLabels: string[]
  outcomePools: string[]
}

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x3E5936F13e1194380A66c3c1d75D4D7342299CfF"

const CATEGORY_NAMES = [
  'Sports', 'Politics', 'Crypto', 'Blockchain', 'Technology',
  'AI', 'Economics', 'Finance', 'Business', 'Science',
  'Climate', 'Entertainment', 'Culture', 'Health', 'RealEstate',
  'Gaming', 'Web3', 'Other'
]

const STATE_NAMES = [
  'Proposed', 'DEC Voting', 'Rejected', 'Cancelled', 'Approved',
  'Active', 'Closed', 'Unresolved', 'ResReq', 'DEC Res Voting',
  'Admin Ver', 'Confirmed', 'Finalized', 'Resolved'
]

function getOutcomePercentage(market: SmartMarket, outcomeIndex: number): string {
  try {
    const pools = Array.isArray(market.outcomePools) ? market.outcomePools : []
    const totalPool = pools.reduce((sum, value) => sum + BigInt(value || '0'), BigInt(0))

    if (totalPool > BigInt(0)) {
      const selectedPool = BigInt(pools[outcomeIndex] || '0')
      const basisPoints = (selectedPool * BigInt(10000)) / totalPool
      return (Number(basisPoints) / 100).toFixed(2)
    }

    const contractPrice = Number(market.outcomePrices?.[outcomeIndex] || 0)
    if (Number.isFinite(contractPrice) && contractPrice > 0) {
      return (contractPrice <= 1 ? contractPrice * 100 : contractPrice / 1e16).toFixed(2)
    }
  } catch (error) {
    console.warn(`Unable to calculate market depth for market ${market.id}:`, error)
  }

  return '0.00'
}


function getTotalMarketVolume(market: SmartMarket): string {
  try {
    const contractTotalVolume = BigInt(market.totalVolume || '0')

    if (contractTotalVolume > BigInt(0)) {
      return Number(ethers.formatEther(contractTotalVolume)).toFixed(1)
    }

    const pools = Array.isArray(market.outcomePools) ? market.outcomePools : []
    const totalPool = pools.reduce((sum, value) => sum + BigInt(value || '0'), BigInt(0))
    return Number(ethers.formatEther(totalPool)).toFixed(1)
  } catch (error) {
    console.warn(`Unable to calculate total volume for market ${market.id}:`, error)
    return '0.0'
  }
}

function MarketThumbnail({
  src,
  question,
}: {
  src?: string
  question: string
}) {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [src])

  if (!src || imageFailed) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Logo className="size-8 rounded-lg" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={`${question} thumbnail`}
      className="w-full h-full object-cover"
      onError={() => setImageFailed(true)}
    />
  )
}

export default function DAppPortal() {
  const { walletAddress, connectWallet, disconnectWallet, txStatus, setTxStatus, historyLogs,
    getWalletBalance,
    createMarketOnChain, joinDecOnChain, approveDecRequestOnChain, castVoteOnChain, placeBetOnChain,
    initializeMarketOnChain, claimPayoutOnChain, requestResolutionOnChain,
    resolveMarketOnChain, claimDecRewardsOnChain,
    claimCreatorFeesOnChain, claimCreatorSeedOnChain,
    voteOnResolutionOnChain, finalizeResolutionVotingOnChain,
    finalizeProposalVotingOnChain, t } = useWeb3()

  const [activeTab, setActiveTab] = useState<TabType>('MarketPlace')
  const [stakeAmount, setStakeAmount] = useState<string>('0.1')
  const [marketDesc, setMarketDesc] = useState('')
  const [outcomes, setOutcomes] = useState<string[]>(['YES', 'NO'])
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date(); d.setHours(d.getHours() + 2); return d.toISOString().split('T')[0]
  })
  const [endTime, setEndTime] = useState<string>('23:59')
  const [marketImage, setMarketImage] = useState<string | null>(null)
  const [marketImageFile, setMarketImageFile] = useState<File | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false)
  const [selectedCategory, setSelectedCategory] = useState<number>(0)
  const [resolutionCriteria, setResolutionCriteria] = useState('')
  const [hasJoinedDEC, setHasJoinedDEC] = useState<boolean>(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ADMIN_ADDRESS = "0x6e832252ea4c78068ee109d953724d2762431992"
  const [persistentLogs, setPersistentLogs] = useState<any[]>([])

  const [allOnChainMarkets, setAllOnChainMarkets] = useState<SmartMarket[]>([])
  const [blockchainDecList, setBlockchainDecList] = useState<string[]>([])
  const [pendingDecRequests, setPendingDecRequests] = useState<{ address: string; requestedAt: string }[]>([])
  const [myPositions, setMyPositions] = useState<MyPosition[]>([])
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [oracleAddress, setOracleAddress] = useState<string | null>(null)
  const [decRewardsClaimable, setDecRewardsClaimable] = useState<string>('0')
  const [decPoolTotal, setDecPoolTotal] = useState<string>('0')
  const [decMemberCount, setDecMemberCount] = useState<number>(0)
  const [claimedMarkets, setClaimedMarkets] = useState<number[]>([])
  const [nowSec, setNowSec] = useState<number>(() => Math.floor(Date.now() / 1000))
  const [walletBalance, setWalletBalance] = useState<string>('0')
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  useEffect(() => {
    if (toastMsg) { const t = setTimeout(() => setToastMsg(null), 4000); return () => clearTimeout(t) }
  }, [toastMsg])

  useEffect(() => {
    const interval = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(interval)
  }, [])

  const scanBlockchainRegistry = useCallback(async () => {
    setHasJoinedDEC(false)
    setMyPositions([])
    setIsScanning(true)

    try {
      let baseMarkets: SmartMarket[] = []

      try {
        const PAGE_SIZE = 5
        const MAX_PAGE_ATTEMPTS = 3
        const PAGE_REQUEST_TIMEOUT_MS = 28_000
        const PAGE_GAP_MS = 800
        const FINAL_RETRY_GAP_MS = 1_500

        const byId = new Map<number, SmartMarket>()

        const normalizeMarket = (rawMarket: any): SmartMarket => ({
          ...rawMarket,
          id: Number(rawMarket.id ?? rawMarket.marketId ?? 0),
          thumbnailUri:
            rawMarket.thumbnailUri ||
            rawMarket.thumbnailURI ||
            rawMarket.thumbnailUrl ||
            rawMarket.thumbnailURL ||
            '',
          outcomeLabels: Array.isArray(rawMarket.outcomeLabels)
            ? rawMarket.outcomeLabels.map(String)
            : [],
          outcomePools: Array.isArray(rawMarket.outcomePools)
            ? rawMarket.outcomePools.map(String)
            : [],
          outcomePrices: Array.isArray(rawMarket.outcomePrices)
            ? rawMarket.outcomePrices.map(String)
            : [],
          hasCurrentWalletVoted: Boolean(rawMarket.hasCurrentWalletVoted),
          currentWalletProposalVote: Number(rawMarket.currentWalletProposalVote || 0),
          hasCurrentWalletVotedOnResolution: Boolean(rawMarket.hasCurrentWalletVotedOnResolution),
          currentWalletResolutionVote: Number(rawMarket.currentWalletResolutionVote || 0)
        })

        const publishMarkets = () => {
          baseMarkets = Array.from(byId.values()).sort((a, b) => a.id - b.id)
          setAllOnChainMarkets(baseMarkets)

          try {
            sessionStorage.setItem(
              'interpredict_public_markets',
              JSON.stringify(baseMarkets)
            )
          } catch {
            // sessionStorage may be unavailable in restricted browsers.
          }
        }

        const mergePageMarkets = (pageData: any) => {
          const pageMarkets = Array.isArray(pageData?.allMarkets)
            ? pageData.allMarkets
            : []

          for (const rawMarket of pageMarkets) {
            const market = normalizeMarket(rawMarket)
            byId.set(market.id, market)
          }

          publishMarkets()
        }

        const getExpectedPageCount = (
          pageData: any,
          requestedStart: number,
          totalMarketsFallback = 0
        ) => {
          const pagination = pageData?.pagination || {}
          const totalMarkets = Number(
            pagination.totalMarkets ?? totalMarketsFallback
          )
          const pageStart = Number(
            pagination.start ?? requestedStart
          )
          const pageLimit = Number(
            pagination.limit ?? PAGE_SIZE
          )

          return Math.max(
            0,
            Math.min(pageLimit, totalMarkets - pageStart)
          )
        }

        const isIncompletePage = (
          pageData: any,
          requestedStart: number,
          totalMarketsFallback = 0
        ) => {
          const expectedCount = getExpectedPageCount(
            pageData,
            requestedStart,
            totalMarketsFallback
          )
          const loadedCount = Array.isArray(pageData?.allMarkets)
            ? pageData.allMarkets.length
            : 0

          return loadedCount < expectedCount
        }

        // Show the last successfully loaded market set immediately while fresh
        // pages are requested. This prevents the marketplace from flashing empty.
        try {
          const cachedMarkets = sessionStorage.getItem(
            'interpredict_public_markets'
          )

          if (cachedMarkets) {
            const parsedMarkets = JSON.parse(cachedMarkets)

            if (Array.isArray(parsedMarkets)) {
              for (const rawMarket of parsedMarkets) {
                const market = normalizeMarket(rawMarket)
                byId.set(market.id, market)
              }

              publishMarkets()
            }
          }
        } catch {
          // Ignore malformed or unavailable browser cache.
        }

        const fetchMarketPage = async (
          start: number
        ): Promise<any> => {
          let lastError: unknown = null

          for (
            let attempt = 1;
            attempt <= MAX_PAGE_ATTEMPTS;
            attempt++
          ) {
            const controller = new AbortController()
            const timeoutId = window.setTimeout(
              () => controller.abort(),
              PAGE_REQUEST_TIMEOUT_MS
            )

            try {
              const response = await fetch(
                `/api/markets?start=${start}&limit=${PAGE_SIZE}`,
                {
                  method: 'GET',
                  cache: 'no-store',
                  headers: {
                    Accept: 'application/json'
                  },
                  signal: controller.signal
                }
              )

              const json = await response.json().catch(() => null)

              if (!response.ok) {
                throw new Error(
                  json?.error ||
                  `Markets page ${start} returned HTTP ${response.status}`
                )
              }

              if (!json || !json.pagination) {
                throw new Error(
                  `Markets page ${start} returned an invalid response`
                )
              }

              const expectedCount = getExpectedPageCount(json, start)
              const loadedCount = Array.isArray(json.allMarkets)
                ? json.allMarkets.length
                : 0

              // A partial page is still useful. Return it, render the markets
              // that did load, continue to later pages, and retry this page later.
              if (loadedCount < expectedCount) {
                console.warn(
                  `[Markets] Page ${start} was incomplete: ` +
                  `${loadedCount}/${expectedCount} markets loaded`,
                  json?.diagnostics?.skippedMarkets || []
                )
              }

              return json
            } catch (error) {
              lastError = error

              console.warn(
                `[Markets] Page ${start}, attempt ${attempt}/${MAX_PAGE_ATTEMPTS} failed:`,
                error
              )

              if (attempt < MAX_PAGE_ATTEMPTS) {
                await new Promise(resolve =>
                  setTimeout(resolve, attempt * 1_200)
                )
              }
            } finally {
              window.clearTimeout(timeoutId)
            }
          }

          throw lastError || new Error(
            `Unable to load markets page starting at ${start}`
          )
        }

        // The first page tells us how many markets exist in total.
        // Even when this page is partial, its successfully loaded markets are
        // rendered and every later page is still requested.
        const firstPage = await fetchMarketPage(0)
        const totalMarkets = Number(
          firstPage.pagination.totalMarkets || 0
        )

        const incompletePageStarts: number[] = []
        const failedPageStarts: number[] = []

        mergePageMarkets(firstPage)

        if (isIncompletePage(firstPage, 0, totalMarkets)) {
          incompletePageStarts.push(0)
        }

        const remainingPageStarts: number[] = []

        for (
          let start = PAGE_SIZE;
          start < totalMarkets;
          start += PAGE_SIZE
        ) {
          remainingPageStarts.push(start)
        }

        // Load every later page independently. A failed or partial page cannot
        // block active markets that live on another page.
        for (const start of remainingPageStarts) {
          try {
            await new Promise(resolve =>
              setTimeout(resolve, PAGE_GAP_MS)
            )

            const pageData = await fetchMarketPage(start)

            mergePageMarkets(pageData)

            if (isIncompletePage(pageData, start, totalMarkets)) {
              incompletePageStarts.push(start)
            }
          } catch (pageError) {
            failedPageStarts.push(start)

            console.warn(
              `[Markets] Page starting at ${start} is temporarily unavailable:`,
              pageError
            )
          }
        }

        // Retry both completely failed pages and partially loaded pages after
        // all other pages have had a chance to render.
        const retryPageStarts = Array.from(
          new Set([
            ...failedPageStarts,
            ...incompletePageStarts
          ])
        )

        if (retryPageStarts.length > 0) {
          await new Promise(resolve =>
            setTimeout(resolve, FINAL_RETRY_GAP_MS)
          )

          for (const start of retryPageStarts) {
            try {
              const retryData = await fetchMarketPage(start)

              // Always publish whatever the retry recovered. Never discard a
              // useful partial response.
              mergePageMarkets(retryData)

              if (isIncompletePage(retryData, start, totalMarkets)) {
                console.warn(
                  `[Markets] Page ${start} remained incomplete after final retry.`,
                  retryData?.diagnostics?.skippedMarkets || []
                )
              }
            } catch (retryError) {
              console.error(
                `[Markets] Final retry failed for page starting at ${start}:`,
                retryError
              )
            }

            await new Promise(resolve =>
              setTimeout(resolve, PAGE_GAP_MS)
            )
          }
        }

        if (baseMarkets.length < totalMarkets) {
          setToastMsg(
            `Loaded ${baseMarkets.length} of ${totalMarkets} markets. ` +
            'Some markets are temporarily unavailable; refresh shortly.'
          )
        }
      } catch (error) {
        console.error('Paginated markets API fetch failed:', error)

        // Keep cached or already-loaded markets visible. Only show the full
        // failure message when nothing at all could be restored or fetched.
        if (baseMarkets.length === 0) {
          setToastMsg(
            'Market data is temporarily unavailable. Please refresh shortly.'
          )
        }
      }

      if (walletAddress) {
        try {
          const decRes = await fetch(`/api/dec-membership?address=${walletAddress}`, { cache: 'no-store' })
          if (decRes && decRes.ok) {
            const decData = await decRes.json()
            if (decData.isDecMember) setHasJoinedDEC(true)
            if (decData.allDecMembers?.length) setBlockchainDecList(decData.allDecMembers)
          }
        } catch (e) { console.warn('DEC API failed:', e) }
        if (walletAddress.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
          try {
            const reqRes = await fetch('/api/dec-requests', { cache: 'no-store' })
            if (reqRes.ok) {
              const reqData = await reqRes.json()
              setPendingDecRequests(reqData.pending || [])
            }
          } catch (e) { console.warn('DEC requests fetch failed:', e) }
        }
      }

      const shouldUsePublicAPI = !walletAddress || typeof window === 'undefined' || !(window as any).ethereum
      if (shouldUsePublicAPI) return

      const iface = new ethers.Interface(contractABI)
      const ethCall = async (data: string): Promise<string | null> => {
        try {
          const result: string = await (window as any).ethereum.request({
            method: 'eth_call',
            params: [{ to: CONTRACT_ADDRESS, data }, 'latest']
          })
          return result && result !== '0x' ? result : null
        } catch { return null }
      }

      // Shared market data and wallet history come from the authenticated API.
      // Only lightweight wallet-specific reads continue below.


      // Check DEC membership
      const decHex = await ethCall(iface.encodeFunctionData("iad", [walletAddress]))
      if (decHex) {
        const isMember = iface.decodeFunctionResult("iad", decHex)[0]
        setHasJoinedDEC(isMember)
      }

      // Admin DEC list
      if (walletAddress.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
        const membersHex = await ethCall(iface.encodeFunctionData("gAD"))
        if (membersHex) {
          const members = iface.decodeFunctionResult("gAD", membersHex)[0]
          setBlockchainDecList(Array.from(members as string[]))
        }
      }

      // DEC rewards
      if (hasJoinedDEC) {
        const poolHex = await ethCall(iface.encodeFunctionData("drp"))
        const membersHex = await ethCall(iface.encodeFunctionData("tdm"))
        const pool = poolHex ? BigInt(iface.decodeFunctionResult("drp", poolHex)[0].toString()) : BigInt(0)
        const members = membersHex ? BigInt(iface.decodeFunctionResult("tdm", membersHex)[0].toString()) : BigInt(0)
        setDecPoolTotal(pool.toString())
        setDecMemberCount(Number(members))
        if (members > BigInt(0)) {
          const sharePerMember = pool / members
          setDecRewardsClaimable(sharePerMember.toString())
        }
      }

      // Fetch wallet balance through the authenticated provider
      try {
        const bal = await getWalletBalance(walletAddress)
        setWalletBalance(bal)
      } catch { }

      // Wallet participation history is loaded by /api/markets from SP and WC events.
      // This preserves winning, losing, and already-claimed positions after balances change.

    } catch (err: any) {
      console.warn("Scan error:", err?.message || err)
    } finally {
      setIsScanning(false)
    }
  }, [walletAddress])

  useEffect(() => { scanBlockchainRegistry() }, [scanBlockchainRegistry])

  useEffect(() => {
    if (walletAddress) {
      const savedLogs = localStorage.getItem(`interpredict_logs_${walletAddress.toLowerCase()}`)
      if (savedLogs) setPersistentLogs(JSON.parse(savedLogs))
    }
  }, [walletAddress, historyLogs])

  useEffect(() => {
    if (walletAddress) {
      const decKey = `interpredict_dec_joined_${walletAddress.toLowerCase()}`
      if (localStorage.getItem(decKey) === 'true') setHasJoinedDEC(true)
    }
  }, [walletAddress])

  useEffect(() => {
    if (walletAddress) {
      const saved = localStorage.getItem(`interpredict_claimed_${walletAddress.toLowerCase()}`)
      if (saved) { try { setClaimedMarkets(JSON.parse(saved)) } catch { setClaimedMarkets([]) } }
    } else { setClaimedMarkets([]) }
  }, [walletAddress])

  const isOracle = !!walletAddress && walletAddress.toLowerCase() === ADMIN_ADDRESS.toLowerCase()
  const isDecMember = hasJoinedDEC || walletAddress?.toLowerCase() === ADMIN_ADDRESS.toLowerCase()

  const getVisibleTabs = (): TabType[] => {
    if (!walletAddress) return ['MarketPlace', 'Pending Markets', 'Resolved Markets']
    const tabs: TabType[] = ['MarketPlace']
    if (hasJoinedDEC) tabs.push('Market Proposals')
    else tabs.push('Pending Markets')
    tabs.push('My Votes')
    tabs.push('Make Market')
    if (hasJoinedDEC) {
      tabs.push('DEC Resolution Voting')
      tabs.push('DEC Rewards')
    }
    if (!hasJoinedDEC) tabs.push('Join DEC')
    tabs.push('Unresolved Markets')
    tabs.push('Resolved Markets')
    tabs.push('History')
    tabs.push('Creator Dashboard')
    if (walletAddress.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) tabs.push('DEC Members')
    if (walletAddress.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
      tabs.push('DEC Requests')
      tabs.push('Resolution Centre')
    }
    return tabs
  }

  const visibleTabs = getVisibleTabs()

  const handleTabSelect = (tab: TabType) => {
    setActiveTab(tab)
    setMobileMenuOpen(false)
  }

  const handleRefreshDApp = async () => {
    setMobileMenuOpen(false)
    setToastMsg('Refreshing dApp data...')

    await scanBlockchainRegistry()

    setToastMsg('dApp refreshed successfully.')
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setMarketImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setMarketImage(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const addOutcomeChoice = () => outcomes.length < 4 && setOutcomes([...outcomes, ''])
  const removeOutcomeChoice = (index: number) => outcomes.length > 2 && setOutcomes(outcomes.filter((_, i) => i !== index))
  const handleOutcomeTextChange = (index: number, text: string) => {
    const updated = [...outcomes]; updated[index] = text; setOutcomes(updated)
  }

  const handleCreateMarketSubmit = async () => {
    if (!marketDesc || !endDate || !endTime || !resolutionCriteria) return
    const [hours, minutes] = endTime.split(':').map(Number)
    const endDateTime = new Date(endDate)
    endDateTime.setHours(hours, minutes, 0, 0)
    const marketEndTimeInSeconds = Math.floor(endDateTime.getTime() / 1000)
    let thumbnailUrl = ''
    if (marketImageFile) {
      setIsUploadingImage(true)
      try {
        const formData = new FormData()
        formData.append('file', marketImageFile)
        const uploadRes = await fetch('/api/upload-thumbnail', { method: 'POST', body: formData })
        const uploadJson = await uploadRes.json()
        if (!uploadRes.ok) {
          setToastMsg(uploadJson.error || 'Image upload failed')
          setIsUploadingImage(false)
          return
        }
        thumbnailUrl = uploadJson.url
      } catch (err: any) {
        setToastMsg('Image upload failed: ' + (err.message || 'unknown error'))
        setIsUploadingImage(false)
        return
      }
      setIsUploadingImage(false)
    }

    const success = await createMarketOnChain(marketDesc, marketEndTimeInSeconds, outcomes, selectedCategory, thumbnailUrl, resolutionCriteria)
    if (success) { setMarketDesc(''); setOutcomes(['YES', 'NO']); setMarketImage(null); setMarketImageFile(null); setResolutionCriteria('') }
  }

  const handleJoinCommitteeSubmit = async () => {
    const success = await joinDecOnChain()
    if (success) {
      setHasJoinedDEC(true)
      localStorage.setItem(`interpredict_dec_joined_${walletAddress?.toLowerCase()}`, 'true')
      scanBlockchainRegistry()
    }
  }

  const executeTradeAction = async (marketId: number, outcomeIndex: number) => {
    if (!walletAddress) return connectWallet()
    // Check balance before trading
    const stakeWei = BigInt(ethers.parseEther(stakeAmount || '0').toString())
    if (stakeWei > BigInt(walletBalance)) {
      setToastMsg(`Insufficient balance. You have ${formatEther(walletBalance)} tITL but need ${stakeAmount} tITL.`)
      return
    }
    const ok = await placeBetOnChain(marketId, outcomeIndex, stakeAmount)
    if (ok) {
      const mkt = allOnChainMarkets.find(m => m.id === marketId)
      let addWei = BigInt(0)
      try { addWei = ethers.parseEther(stakeAmount || '0') } catch { }
      setMyPositions((prev) => {
        const existing = prev.find(p => p.marketId === marketId)
        if (existing) {
          return prev.map(p => p.marketId === marketId ? {
            ...p,
            shares: p.shares.map((s, i) => i === outcomeIndex ? (BigInt(s) + addWei).toString() : s),
            stakes: p.stakes.map((s, i) => i === outcomeIndex ? (BigInt(s || '0') + ethers.parseEther(stakeAmount || '0')).toString() : s),
            totalStake: (BigInt(p.totalStake || '0') + ethers.parseEther(stakeAmount || '0')).toString()
          } : p)
        }
        return [...prev, {
          marketId,
          question: mkt?.question || `Market #${marketId}`,
          marketState: mkt?.state ?? 5,
          confirmedOutcome: mkt?.confirmedOutcome ?? 0,
          shares: mkt?.outcomeLabels?.map((_, i) => i === outcomeIndex ? addWei.toString() : '0') || [],
          stakes: mkt?.outcomeLabels?.map((_, i) => i === outcomeIndex ? ethers.parseEther(stakeAmount || '0').toString() : '0') || [],
          totalStake: ethers.parseEther(stakeAmount || '0').toString(),
          claimablePayout: '0',
          claimedPayout: '0',
          claimed: false,
          marketEndTime: mkt?.marketEndTime ?? 0,
          outcomeLabels: mkt?.outcomeLabels || [],
          outcomePools: mkt?.outcomePools || []
        }]
      })
      setActiveTab('My Votes')
    }
    scanBlockchainRegistry()
  }

  const handleCashOut = async (marketId: number) => {
    const ok = await claimPayoutOnChain(marketId)
    if (ok && walletAddress) {
      setClaimedMarkets((prev) => {
        const updated = prev.includes(marketId) ? prev : [...prev, marketId]
        localStorage.setItem(`interpredict_claimed_${walletAddress.toLowerCase()}`, JSON.stringify(updated))
        return updated
      })
      scanBlockchainRegistry()
    }
  }

  const handleEnterProposalVoting = async (marketId: number) => {
    const ok = await initializeMarketOnChain(marketId)
    if (ok) scanBlockchainRegistry()
  }

  const handleFinalizeProposalVoting = async (marketId: number) => {
    const ok = await finalizeProposalVotingOnChain(marketId)
    if (ok) scanBlockchainRegistry()
  }

  const handleProposalVote = async (
    marketId: number,
    support: boolean
  ) => {
    await castVoteOnChain(marketId, support)
    await scanBlockchainRegistry()
  }

  const handleRequestResolution = async (marketId: number) => {
    const ok = await requestResolutionOnChain(marketId)
    if (ok) scanBlockchainRegistry()
  }

  const handleResolutionVote = async (marketId: number, outcomeIndex: number) => {
    const ok = await voteOnResolutionOnChain(marketId, outcomeIndex)
    if (ok) await scanBlockchainRegistry()
  }

  const handleFinalizeResolutionVoting = async (marketId: number) => {
    const ok = await finalizeResolutionVotingOnChain(marketId)
    if (ok) await scanBlockchainRegistry()
  }

  const handleResolveMarket = async (marketId: number, winningOutcome: number) => {
    const ok = await resolveMarketOnChain(marketId, winningOutcome)
    if (ok) await scanBlockchainRegistry()
  }

  const handleClaimDecRewards = async () => {
    const ok = await claimDecRewardsOnChain()
    if (ok) scanBlockchainRegistry()
  }

  const handleClaimCreatorFees = async (marketId: number) => {
    const ok = await claimCreatorFeesOnChain(marketId)
    if (ok) scanBlockchainRegistry()
  }

  const handleClaimCreatorSeed = async (marketId: number) => {
    const ok = await claimCreatorSeedOnChain(marketId)
    if (ok) scanBlockchainRegistry()
  }

  const handleApproveDecRequest = async (address: string) => {
    const ok = await approveDecRequestOnChain(address)
    if (ok) {
      setPendingDecRequests((prev) => prev.filter(r => r.address.toLowerCase() !== address.toLowerCase()))
      scanBlockchainRegistry()
    }
  }

  const getTabLabel = (tab: TabType): string => {
    const map: Record<TabType, string> = {
      'MarketPlace': t('marketPlace'), 'Pending Markets': t('pendingMarkets'),
      'Market Proposals': 'Market Proposals', 'Make Market': t('makeMarket'),
      'Join DEC': t('joinDec'), 'History': t('history'), 'DEC Members': t('adminPanel'),
      'DEC Requests': 'DEC Requests', 'DEC Resolution Voting': 'DEC Resolution Voting',
      'Resolution Centre': 'Resolution Centre', 'My Votes': 'My Votes', 'Unresolved Markets': 'Unresolved Markets',
      'Resolved Markets': 'Resolved Markets', 'DEC Rewards': 'DEC Rewards',
      'Creator Dashboard': 'Creator Dashboard'
    }
    return map[tab] || tab
  }

  const activeMarkets = allOnChainMarkets.filter(m => m.state === 5 && m.marketEndTime > nowSec)
  const inactiveMarkets = allOnChainMarkets.filter(m => (m.state === 5 && m.marketEndTime <= nowSec) || m.state >= 6)
  const pendingProposals = allOnChainMarkets.filter(m => m.state === 0 || m.state === 1)
  const awaitingResolutionMarkets = allOnChainMarkets.filter(m =>
    (m.state === 5 && m.marketEndTime <= nowSec) ||
    m.state === 6 ||
    m.state === 7 ||
    m.state === 8
  )
  const resolutionVotingMarkets = allOnChainMarkets.filter(m => m.state === 9)
  const adminVerificationMarkets = allOnChainMarkets.filter(m => m.state === 10)
  const confirmedMarkets = allOnChainMarkets.filter(m => m.state === 11)
  const finalizedMarkets = allOnChainMarkets.filter(m => m.state === 12 || m.state === 13)
  const unresolvedMarkets = allOnChainMarkets.filter(m => m.state >= 6 && m.state <= 11 || (m.state === 5 && m.marketEndTime <= nowSec))
  const resolvedMarkets = finalizedMarkets
  const creatorMarkets = allOnChainMarkets.filter(m => m.creator?.toLowerCase() === walletAddress?.toLowerCase())
  const positionByMarketId = new Map(myPositions.map(position => [position.marketId, position]))

  const activePositions = myPositions.filter(p => p.marketState === 5 && p.marketEndTime > nowSec)
  const endedPositions = myPositions.filter(p => p.marketState >= 6 || (p.marketState === 5 && p.marketEndTime <= nowSec))

  const formatExpiryDate = (endTimeSec: number): string =>
    new Date(endTimeSec * 1000).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const formatCountdown = (endTimeSec: number): string => {
    let remaining = endTimeSec - nowSec
    if (remaining <= 0) return 'Expired'
    const days = Math.floor(remaining / 86400); remaining %= 86400
    const hours = Math.floor(remaining / 3600); remaining %= 3600
    const minutes = Math.floor(remaining / 60)
    const seconds = remaining % 60
    const pad = (n: number) => String(n).padStart(2, '0')
    return days > 0 ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s` : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
  }

  const formatEther = (val: string) => {
    try {
      return Number(ethers.formatEther(val || "0")).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      })
    } catch {
      return "0"
    }
  }

  return (
    <div className="min-h-screen bg-[#060117] text-slate-100 font-sans antialiased overflow-x-hidden pb-12">
      <header className="fixed top-0 inset-x-0 h-20 bg-[#0d0022]/90 backdrop-blur-md border-b border-purple-950/40 z-40 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto h-full flex items-center gap-2 sm:gap-4">
          <Link
            href="/"
            aria-label="Go to InterPredict homepage"
            className="flex shrink-0 items-center gap-2.5 group"
          >
            <Logo className="size-9 rounded-xl" />
            <span className="hidden sm:inline font-heading text-lg font-bold tracking-tight text-white group-hover:text-primary transition-colors">
              InterPredict
            </span>
          </Link>

          <div
            className="
              ml-auto shrink-0
              [&_button]:max-sm:w-10
              [&_button]:max-sm:min-w-10
              [&_button]:max-sm:px-2
              [&_button]:max-sm:justify-center
              [&_button>span:last-child]:max-sm:hidden
            "
          >
            <LanguageSelector />
          </div>

          {walletAddress ? (
            <div className="min-w-0 flex shrink items-center bg-purple-950/30 border border-purple-900/40 rounded-full px-1.5 sm:pr-1.5 sm:pl-4 py-1.5 gap-1.5 sm:gap-3">
              <span className="inline font-mono text-[10px] sm:text-xs text-emerald-400 whitespace-nowrap">
                {Number(formatEther(walletBalance)).toFixed(1)} tITL
              </span>
              <span className="hidden sm:block w-px h-4 bg-purple-900/40" />
              <span className="hidden sm:inline font-mono text-xs text-purple-300 whitespace-nowrap">
                {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
              </span>
              <button
                onClick={disconnectWallet}
                aria-label="Disconnect wallet"
                className="shrink-0 p-2 bg-purple-900/40 hover:bg-rose-950/40 rounded-full text-slate-400 hover:text-rose-400 transition-colors"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="shrink-0 flex items-center gap-2 px-3 sm:px-5 py-2.5 bg-gradient-to-r from-primary to-purple-600 text-xs sm:text-sm font-semibold rounded-full border border-purple-500/20 shadow-lg"
            >
              <Wallet className="size-3.5" />
              <span className="hidden min-[360px]:inline">{t('connectBtn')}</span>
            </button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto pt-28 px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        <div className="lg:hidden w-full relative z-30">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="w-full flex items-center justify-between bg-secondary/20 border border-secondary/30 rounded-xl px-4 py-3 text-sm font-semibold text-slate-200">
            <div className="flex items-center gap-2"><Menu className="size-4 text-primary" /><span>{getTabLabel(activeTab)}</span></div>
            {mobileMenuOpen ? <X className="size-4" /> : <ArrowRight className="size-4 rotate-90" />}
          </button>
          {mobileMenuOpen && (
            <div className="absolute top-full inset-x-0 mt-2 bg-[#0d0022] border border-purple-950/80 rounded-xl p-2 shadow-2xl space-y-1 z-50">
              <button
                onClick={handleRefreshDApp}
                disabled={isScanning}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold text-primary hover:bg-purple-950/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`size-4 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Refreshing dApp...' : 'Refresh dApp'}</span>
              </button>

              <div className="h-px bg-purple-950/60 my-1" />

              {visibleTabs.map((tab) => (
                <button key={tab} onClick={() => handleTabSelect(tab)} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-primary text-white' : 'text-slate-400 hover:bg-purple-950/40'}`}>{getTabLabel(tab)}</button>
              ))}
            </div>
          )}
        </div>

        <aside className="hidden lg:flex flex-col gap-1.5 lg:col-span-1">
          <button
            onClick={handleRefreshDApp}
            disabled={isScanning}
            className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl font-semibold text-sm border border-purple-500/20 bg-purple-950/20 text-primary hover:bg-purple-950/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <RefreshCw className={`size-4 shrink-0 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Refreshing dApp...' : 'Refresh dApp'}</span>
          </button>

          <div className="h-px bg-purple-950/50 my-1" />

          {visibleTabs.map((tab) => {
            const Icon = { 'MarketPlace': Layers, 'Market Proposals': Hourglass, 'Pending Markets': Hourglass, 'Make Market': PlusCircle, 'Join DEC': Shield, 'History': History, 'DEC Requests': Shield, 'DEC Members': Users, 'My Votes': Cpu, 'Unresolved Markets': Gavel, 'DEC Resolution Voting': Users, 'Resolution Centre': Shield, 'Resolved Markets': CheckCircle2, 'DEC Rewards': Coins, 'Creator Dashboard': Award }[tab]
            return (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2.5 px-4 py-3.5 rounded-xl font-semibold text-sm border transition-all ${activeTab === tab ? 'bg-primary text-white border-primary/50 shadow-md' : 'text-slate-400 border-transparent hover:bg-secondary/40'}`}>
                <Icon className="size-4 shrink-0" /><span>{getTabLabel(tab)}</span>
              </button>
            )
          })}
        </aside>

        <section className="lg:col-span-3 bg-secondary/10 border border-secondary/20 rounded-2xl p-5 sm:p-6 min-h-[500px] flex flex-col justify-between shadow-inner w-full overflow-hidden">
          <div className="w-full">
            <div className="mb-6 border-b border-purple-950/40 pb-5">
              <h2 className="text-lg sm:text-xl font-bold font-heading">{t('statusPanel')}</h2>
              <p className="text-purple-400 text-[10px] sm:text-xs font-semibold tracking-wide mt-1">{t('taglineSub')}</p>
            </div>

            {/* MARKETPLACE */}
            {activeTab === 'MarketPlace' && (
              <div className="w-full space-y-8">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Active Markets</h3>
                  <div className="grid grid-cols-1 gap-4 w-full">
                    {activeMarkets.length === 0 ? (
                      <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No active markets yet.</div>
                    ) : (
                      activeMarkets.map((market) => (
                        <div key={market.id} className="bg-secondary/40 border border-border rounded-xl p-4 sm:p-5 w-full max-w-xl relative">
                          <div className="absolute top-4 right-4 size-12 rounded-xl bg-purple-950/40 border border-purple-900/30 overflow-hidden">
                            <MarketThumbnail
                              src={market.thumbnailUri}
                              question={market.question}
                            />
                          </div>
                          <div className="flex justify-between items-center mb-3 pr-14">
                            <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-[10px] font-bold tracking-wider uppercase">
                              {market.origin === 1 ? 'Team' : 'Community'} #{market.id}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">{CATEGORY_NAMES[market.category] || 'Other'}</span>
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-slate-200 mb-3 leading-snug pr-14">{market.question}</h4>
                          <div className="mb-4 flex flex-col gap-1 text-[10px] font-mono">
                            <span className="text-slate-400">Expires: <span className="text-slate-300">{formatExpiryDate(market.marketEndTime)}</span></span>
                            <span className="text-purple-300">⏳ {formatCountdown(market.marketEndTime)}</span>
                          </div>
                          {/* Market depth */}
                          {market.outcomeLabels?.length > 0 && (
                            <div className="mb-3 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                {market.outcomeLabels.map((label, oi) => (
                                  <div key={oi} className="bg-black/20 border border-purple-900/30 rounded-lg p-2 text-center">
                                    <p className="text-[10px] font-mono text-slate-400">{label}</p>
                                    <p className="text-xs font-bold text-slate-200">{getOutcomePercentage(market, oi)}%</p>
                                    <p className="text-[9px] font-mono text-slate-500">
                                      {Number(formatEther(market.outcomePools?.[oi] || '0')).toFixed(1)} tITL
                                    </p>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center justify-between rounded-lg border border-purple-900/30 bg-black/20 px-3 py-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Volume</span>
                                <span className="text-xs font-bold font-mono text-purple-300">{getTotalMarketVolume(market)} tITL</span>
                              </div>
                            </div>
                          )}
                          <div className="mb-4">
                            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">{t('wagerTitle')}</label>
                            <input type="number" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} className="w-full bg-black/20 border border-purple-900/40 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none" />
                          </div>
                          <div className={`grid gap-3 ${market.outcomeLabels?.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-' + Math.min(market.outcomeLabels?.length || 2, 4)}`}>
                            {market.outcomeLabels?.map((label, oi) => (
                              <button key={oi} onClick={() => executeTradeAction(market.id, oi)}
                                className="py-2.5 bg-gradient-to-r from-purple-700 to-indigo-600 text-white font-bold text-xs rounded-lg uppercase">
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Inactive Markets</h3>
                  <div className="grid grid-cols-1 gap-4 w-full">
                    {inactiveMarkets.length === 0 ? (
                      <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No inactive markets yet.</div>
                    ) : (
                      inactiveMarkets.map((market) => (
                        <div key={market.id} className="bg-secondary/20 border border-border rounded-xl p-4 sm:p-5 w-full max-w-xl opacity-70">
                          <div className="flex justify-between items-center mb-3">
                            <span className="px-2 py-0.5 bg-slate-500/10 border border-slate-500/20 text-slate-400 rounded text-[10px] font-bold tracking-wider uppercase">#{market.id}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{STATE_NAMES[market.state] || 'Unknown'}</span>
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-slate-300 leading-snug mb-2">{market.question}</h4>
                          <div className="flex flex-col gap-1 text-[10px] font-mono">
                            <span className="text-slate-500">Ended: <span className="text-slate-400">{formatExpiryDate(market.marketEndTime)}</span></span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PENDING MARKETS */}
            {activeTab === 'Pending Markets' && (
              <div className="grid grid-cols-1 gap-4 w-full">
                {pendingProposals.length === 0 ? (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No pending proposals.</div>
                ) : (
                  pendingProposals.map((market) => (
                    <div key={market.id} className="bg-secondary/20 border border-border rounded-xl p-4 sm:p-5 w-full max-w-xl">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-mono text-purple-400 font-bold">#{market.id}</span>
                        <span className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded font-bold uppercase">{STATE_NAMES[market.state]}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-300 leading-normal">{market.question}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* MARKET PROPOSALS (DEC members) */}
            {activeTab === 'Market Proposals' && (
              <div className="grid grid-cols-1 gap-4 w-full">
                {pendingProposals.length === 0 ? (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No proposals to vote on.</div>
                ) : (
                  pendingProposals.map((market) => {
                    const votingOpen = market.state === 1 && market.proposalVotingDeadline > nowSec
                    return (
                      <div key={market.id} className="bg-secondary/30 border border-purple-500/20 rounded-xl p-4 sm:p-5 w-full max-w-xl">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-mono text-primary font-bold">Proposal #{market.id}</span>
                          <span className="text-[11px] font-mono text-yellow-400">
                            {market.state === 0
                              ? 'Awaiting Entry'
                              : votingOpen
                                ? 'Voting Active'
                                : 'Voting Ended'}
                          </span>
                        </div>
                        <p className="text-sm font-semibold mb-3 text-slate-200">{market.question}</p>

                        {market.state === 1 && market.proposalVotingDeadline > 0 && (
                          <div className="mb-3 rounded-lg border border-purple-900/30 bg-black/20 p-3 text-[10px] font-mono">
                            <div className="flex flex-wrap justify-between gap-2 text-slate-400">
                              <span>
                                Approve: <span className="text-emerald-400">{market.approvalVotes}</span>
                              </span>
                              <span>
                                Reject: <span className="text-rose-400">{market.rejectionVotes}</span>
                              </span>
                            </div>
                            <p className="mt-2 text-purple-300">
                              {votingOpen
                                ? `Voting ends in ${formatCountdown(market.proposalVotingDeadline)}`
                                : `Voting ended ${formatExpiryDate(market.proposalVotingDeadline)}`}
                            </p>
                          </div>
                        )}

                        {market.state === 0 ? (
                          <button onClick={() => handleEnterProposalVoting(market.id)} className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg uppercase">Enter DEC Voting</button>
                        ) : votingOpen ? (
                          market.hasCurrentWalletVoted ? (
                            <div className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center">
                              <p className="text-xs font-bold uppercase text-emerald-400">
                                Vote Submitted
                              </p>
                              <p className="mt-1 text-[10px] font-mono text-slate-400">
                                This wallet has already voted {market.currentWalletProposalVote === 1 ? 'Approve' : market.currentWalletProposalVote === 2 ? 'Reject' : ''} on this proposal.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => handleProposalVote(market.id, true)}
                                className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleProposalVote(market.id, false)}
                                className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg"
                              >
                                Reject
                              </button>
                            </div>
                          )
                        ) : (
                          <button onClick={() => handleFinalizeProposalVoting(market.id)} className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg uppercase">Finalize Voting</button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* MAKE MARKET */}
            {activeTab === 'Make Market' && (
              <div className="space-y-4 w-full max-w-xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">{t('marketStatement')}</label>
                    <textarea placeholder="e.g., Will Bitcoin settle above $120,000?" value={marketDesc} onChange={(e) => setMarketDesc(e.target.value)} className="w-full h-24 bg-black/20 border border-purple-900/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none text-slate-200" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">{t('uploadImageLabel')}</label>
                    <div onClick={() => fileInputRef.current?.click()} className="h-24 bg-black/30 border border-dashed border-purple-900/50 rounded-xl flex flex-col items-center justify-center cursor-pointer p-2 relative overflow-hidden text-center">
                      <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                      {marketImage ? <img src={marketImage} alt="Preview" className="size-full object-cover rounded-lg" /> : <><Upload className="size-5 text-purple-400 mb-1 mx-auto" /><span className="text-[9px] text-slate-400 leading-tight">{t('uploadPlaceholder')}</span></>}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1.5">Category</label>
                  <select value={selectedCategory} onChange={(e) => setSelectedCategory(Number(e.target.value))} className="w-full bg-black/20 border border-purple-900/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary text-slate-200">
                    {CATEGORY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">{t('votingEndDate')}</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-black/20 border border-purple-900/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary text-slate-200" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">Time</label>
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-black/20 border border-purple-900/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary text-slate-200" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1.5">Resolution Criteria</label>
                  <textarea placeholder="Describe how this market will be resolved..." value={resolutionCriteria} onChange={(e) => setResolutionCriteria(e.target.value)} className="w-full h-20 bg-black/20 border border-purple-900/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none text-slate-200" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-400">{t('outcomesTitle')}</label>
                    {outcomes.length < 4 && <button type="button" onClick={addOutcomeChoice} className="text-[11px] text-primary font-semibold">{t('addChoiceBtn')}</button>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {outcomes.map((outcome, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-2.5 text-[10px] font-mono text-slate-500 font-bold uppercase">#{idx + 1}</span>
                          <input type="text" value={outcome} placeholder={`Choice ${idx + 1}`} onChange={(e) => handleOutcomeTextChange(idx, e.target.value)} className="w-full bg-black/20 border border-purple-900/50 rounded-xl pl-10 pr-3 py-2 text-sm focus:outline-none text-slate-200 font-mono" />
                        </div>
                        {outcomes.length > 2 && <button type="button" onClick={() => removeOutcomeChoice(idx)} className="p-2 bg-red-950/20 text-red-400 text-xs font-bold rounded-xl">{t('removeChoiceBtn')}</button>}
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={handleCreateMarketSubmit} disabled={isUploadingImage} className="w-full py-3 bg-gradient-to-r from-primary to-purple-600 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50">
                  {isUploadingImage ? 'Uploading image...' : walletAddress?.toLowerCase() === ADMIN_ADDRESS.toLowerCase() ? 'Create Team Market (11 tITL)' : 'Propose Community Market (11 tITL)'}
                </button>
              </div>
            )}

            {/* JOIN DEC */}
            {activeTab === 'Join DEC' && (
              <div className="p-6 bg-gradient-to-br from-purple-950/20 to-indigo-950/20 border border-purple-900/30 rounded-xl text-center w-full max-w-xl">
                <Shield className="size-10 mx-auto text-primary mb-3" />
                <p className="text-sm font-semibold mb-1 text-slate-200">{t('assessorTitle')}</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">DEC membership requires a 0.1 tITL native-token payment and admin approval. Admin wallets are not charged.</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">Submit a request to join the DEC Committee. An admin will review and approve it.</p>
                <button onClick={handleJoinCommitteeSubmit} className="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl">{t('assessorBtn')}</button>
              </div>
            )}

            {/* MY VOTES */}
            {activeTab === 'My Votes' && (
              <div className="space-y-8 w-full">
                {myPositions.length === 0 ? (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">You haven't placed any predictions yet.</div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Active</h3>
                      <div className="space-y-4">
                        {activePositions.length === 0 ? (
                          <div className="p-6 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No active positions.</div>
                        ) : (
                          activePositions.map((pos) => (
                            <div key={pos.marketId} className="bg-secondary/30 border border-border rounded-xl p-4 sm:p-5 w-full max-w-xl">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-mono text-primary font-bold">Market #{pos.marketId}</span>
                                <span className="text-[11px] font-mono text-emerald-400">Open</span>
                              </div>
                              <p className="text-sm font-semibold mb-3 text-slate-200">{pos.question}</p>
                              <div className="flex flex-wrap gap-3 text-[11px] font-mono text-slate-400 mb-2">
                                {pos.outcomeLabels?.map((label, oi) => (
                                  <span key={oi}>{label}: {formatEther(pos.shares[oi] || '0')} tITL</span>
                                ))}
                              </div>
                              <div className="flex flex-col gap-1 text-[10px] font-mono">
                                <span className="text-slate-400">Expires: <span className="text-slate-300">{formatExpiryDate(pos.marketEndTime)}</span></span>
                                <span className="text-purple-300">⏳ {formatCountdown(pos.marketEndTime)}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Inactive</h3>
                      <div className="space-y-4">
                        {endedPositions.length === 0 ? (
                          <div className="p-6 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No ended positions.</div>
                        ) : (
                          endedPositions.map((pos) => {
                            const isResolved = pos.marketState >= 11
                            const winOutcome = pos.confirmedOutcome
                            const winningShares = BigInt(pos.shares[winOutcome] || '0')
                            const hasWinningShares = isResolved && winningShares > BigInt(0)
                            const didWin = isResolved && (hasWinningShares || pos.claimed)
                            const payoutWei = BigInt(pos.claimed ? pos.claimedPayout : pos.claimablePayout || '0')
                            const stakeWei = BigInt(pos.totalStake || '0')
                            const profitPercent = stakeWei > BigInt(0)
                              ? Number(((payoutWei - stakeWei) * BigInt(10000)) / stakeWei) / 100
                              : 0
                            return (
                              <div key={pos.marketId} className="bg-secondary/20 border border-border rounded-xl p-4 sm:p-5 w-full max-w-xl opacity-95">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-mono text-primary font-bold">Market #{pos.marketId}</span>
                                  <span className="text-[11px] font-mono text-slate-400">{isResolved ? 'Resolved' : 'Trading Closed'}</span>
                                </div>
                                <p className="text-sm font-semibold mb-3 text-slate-200">{pos.question}</p>
                                <div className="flex flex-wrap gap-3 text-[11px] font-mono text-slate-400 mb-2">
                                  {pos.outcomeLabels?.map((label, oi) => (
                                    <span key={oi}>{label}: {formatEther(pos.shares[oi] || '0')} tITL</span>
                                  ))}
                                </div>
                                <p className="text-[10px] font-mono text-slate-500 mb-3">Ended: {formatExpiryDate(pos.marketEndTime)}</p>
                                {isResolved ? (
                                  pos.claimed || claimedMarkets.includes(pos.marketId) ? (
                                    <div className="space-y-2">
                                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-emerald-300">Won: {formatEther(pos.claimedPayout)} tITL</div>
                                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-emerald-300">Return: {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%</div>
                                      </div>
                                      <div className="w-full py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg uppercase flex items-center justify-center gap-1.5">
                                        <CheckCircle2 className="size-3.5" /> Claimed
                                      </div>
                                    </div>
                                  ) : didWin ? (
                                    <div className="space-y-2">
                                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-emerald-300">Winning Amount: {formatEther(pos.claimablePayout)} tITL</div>
                                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-emerald-300">Return: {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%</div>
                                      </div>
                                      <button onClick={() => handleCashOut(pos.marketId)} className="w-full py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg uppercase">Cash Out</button>
                                    </div>
                                  ) : (
                                    <div className="w-full py-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-lg uppercase text-center">Lost</div>
                                  )
                                ) : pos.marketState === 9 ? (
                                  <div className="w-full py-2.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs font-bold rounded-lg uppercase text-center">DEC Resolution Voting</div>
                                ) : pos.marketState === 10 ? (
                                  <div className="w-full py-2.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold rounded-lg uppercase text-center">Awaiting Admin Verification</div>
                                ) : pos.marketState === 11 ? (
                                  <div className="w-full py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-lg uppercase text-center">Outcome Confirmed</div>
                                ) : pos.marketState === 8 ? (
                                  <div className="w-full py-2.5 bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold rounded-lg uppercase text-center">Resolution Requested</div>
                                ) : (
                                  <button onClick={() => handleRequestResolution(pos.marketId)} className="w-full py-2.5 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded-lg uppercase">Request Resolution</button>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* UNRESOLVED MARKETS */}
            {activeTab === 'Unresolved Markets' && (
              <div className="space-y-4 w-full">
                {!walletAddress ? (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">Connect your wallet.</div>
                ) : awaitingResolutionMarkets.length === 0 ? (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No markets awaiting a resolution request.</div>
                ) : (
                  <>
                    <p className="text-[10px] text-slate-500 mb-2">Expired markets that can still enter the resolution process.</p>
                    {awaitingResolutionMarkets.map((market) => (
                      <div key={market.id} className="bg-secondary/30 border border-yellow-500/20 rounded-xl p-4 sm:p-5 w-full max-w-xl">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-mono text-primary font-bold">Market #{market.id}</span>
                          <span className="text-[11px] font-mono text-yellow-400">{STATE_NAMES[market.state] || 'Ended'}</span>
                        </div>
                        <p className="text-sm font-semibold mb-2 text-slate-200">{market.question}</p>
                        {market.resolutionCriteria && <p className="text-[11px] text-slate-400 mb-3">Criteria: {market.resolutionCriteria}</p>}
                        <div className="flex flex-wrap gap-3 text-[11px] font-mono text-slate-400 mb-2">
                          {market.outcomeLabels?.map((label, oi) => (
                            <span key={oi}>{label}: {formatEther(market.outcomePools?.[oi] || '0')} tITL</span>
                          ))}
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 mb-3">Ended: {formatExpiryDate(market.marketEndTime)}</p>
                        {market.state === 8 ? (
                          <div className="w-full py-2.5 bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold rounded-lg uppercase text-center">Resolution Requested</div>
                        ) : (
                          <button onClick={() => handleRequestResolution(market.id)} className="w-full py-2.5 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded-lg uppercase">Request Resolution</button>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* DEC RESOLUTION VOTING */}
            {activeTab === 'DEC Resolution Voting' && hasJoinedDEC && (
              <div className="space-y-4 w-full">
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 max-w-xl">
                  <h3 className="text-sm font-bold text-slate-200">Resolution Voting Queue</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Review the market criteria carefully and vote for the outcome supported by the available evidence.</p>
                </div>
                {resolutionVotingMarkets.length === 0 ? (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No markets are currently in DEC resolution voting.</div>
                ) : resolutionVotingMarkets.map((market) => (
                  <div key={market.id} className="bg-secondary/30 border border-purple-500/25 rounded-xl p-4 sm:p-5 w-full max-w-xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-mono text-primary font-bold">Market #{market.id}</span>
                      <span className="text-[11px] font-mono text-purple-300">DEC Resolution Voting</span>
                    </div>
                    <p className="text-sm font-semibold mb-2 text-slate-200">{market.question}</p>
                    {market.resolutionCriteria && <p className="text-[11px] text-slate-400 mb-3">Criteria: {market.resolutionCriteria}</p>}
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center text-[10px] font-mono">
                      <div className="rounded-lg bg-black/20 border border-purple-900/30 p-2"><span className="block text-slate-500">Votes</span><strong className="text-slate-200">{market.totalResolutionVotes}</strong></div>
                      <div className="rounded-lg bg-black/20 border border-purple-900/30 p-2"><span className="block text-slate-500">Quorum</span><strong className="text-slate-200">{market.resolutionQuorum}</strong></div>
                      <div className="rounded-lg bg-black/20 border border-purple-900/30 p-2"><span className="block text-slate-500">Snapshot</span><strong className="text-slate-200">{market.activeDECSnapshot}</strong></div>
                    </div>
                    <div className={`mb-4 rounded-lg border p-3 text-center font-mono ${market.resolutionVotingDeadline > nowSec ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                      <span className="block text-[10px] uppercase tracking-wider text-slate-400">Voting time remaining</span>
                      <strong className={`mt-1 block text-sm ${market.resolutionVotingDeadline > nowSec ? 'text-yellow-300' : 'text-red-300'}`}>
                        {market.resolutionVotingDeadline > 0 ? formatCountdown(market.resolutionVotingDeadline) : 'Deadline unavailable'}
                      </strong>
                      {market.resolutionVotingDeadline > 0 && (
                        <span className="mt-1 block text-[10px] text-slate-500">Ends {formatExpiryDate(market.resolutionVotingDeadline)}</span>
                      )}
                    </div>
                    {market.hasCurrentWalletVotedOnResolution ? (
                      <div className="w-full py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-lg uppercase text-center">Vote Submitted</div>
                    ) : (
                      <div className={`grid gap-2 ${market.outcomeLabels?.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
                        {market.outcomeLabels?.map((label, oi) => (
                          <button key={oi} onClick={() => handleResolutionVote(market.id, oi)} className="py-2.5 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded-lg uppercase">Vote {label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ADMIN RESOLUTION CENTRE */}
            {activeTab === 'Resolution Centre' && isOracle && (
              <div className="space-y-7 w-full">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 max-w-xl">
                  <h3 className="text-sm font-bold text-slate-200">Admin Resolution Centre</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Finalize DEC voting, verify the selected outcome, and complete market settlement according to the current on-chain state.</p>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">DEC Voting in Progress</h3>
                  <div className="space-y-4">
                    {resolutionVotingMarkets.length === 0 ? <div className="p-6 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No DEC resolution votes to finalize.</div> : resolutionVotingMarkets.map((market) => (
                      <div key={market.id} className="bg-secondary/30 border border-yellow-500/20 rounded-xl p-4 sm:p-5 max-w-xl">
                        <p className="text-sm font-semibold text-slate-200">{market.question}</p>
                        <p className="text-[11px] text-slate-400 mt-2">Votes {market.totalResolutionVotes} / Quorum {market.resolutionQuorum}</p>
                        <p className={`text-[11px] font-mono mt-1 mb-3 ${market.resolutionVotingDeadline > nowSec ? 'text-yellow-300' : 'text-red-300'}`}>
                          {market.resolutionVotingDeadline > 0
                            ? `Voting ${market.resolutionVotingDeadline > nowSec ? 'ends in' : 'ended'} ${formatCountdown(market.resolutionVotingDeadline)}`
                            : 'Voting deadline unavailable'}
                        </p>
                        <button disabled={market.resolutionVotingDeadline > nowSec} onClick={() => handleFinalizeResolutionVoting(market.id)} className="w-full py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg uppercase">{market.resolutionVotingDeadline > nowSec ? 'Voting Still in Progress' : 'Finalize DEC Resolution Voting'}</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Awaiting Admin Verification</h3>
                  <div className="space-y-4">
                    {adminVerificationMarkets.length === 0 ? <div className="p-6 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No markets awaiting admin verification.</div> : adminVerificationMarkets.map((market) => (
                      <div key={market.id} className="bg-secondary/30 border border-blue-500/20 rounded-xl p-4 sm:p-5 max-w-xl">
                        <p className="text-sm font-semibold mb-2 text-slate-200">{market.question}</p>
                        <p className="text-[11px] text-slate-400 mb-3">DEC selected: <strong className="text-blue-300">{market.outcomeLabels?.[market.decSelectedOutcome] || `Outcome ${market.decSelectedOutcome}`}</strong></p>
                        <div className={`grid gap-2 ${market.outcomeLabels?.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
                          {market.outcomeLabels?.map((label, oi) => (
                            <button key={oi} onClick={() => handleResolveMarket(market.id, oi)} className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg uppercase">Confirm {label}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Outcome Confirmed</h3>
                  <div className="space-y-4">
                    {confirmedMarkets.length === 0 ? <div className="p-6 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No confirmed markets awaiting finalization.</div> : confirmedMarkets.map((market) => (
                      <div key={market.id} className="bg-secondary/30 border border-emerald-500/20 rounded-xl p-4 sm:p-5 max-w-xl">
                        <p className="text-sm font-semibold text-slate-200">{market.question}</p>
                        <p className="text-[11px] text-emerald-300 mt-2 mb-3">Confirmed outcome: {market.outcomeLabels?.[market.confirmedOutcome] || `Outcome ${market.confirmedOutcome}`}</p>
                        <button onClick={() => handleResolveMarket(market.id, market.confirmedOutcome)} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg uppercase">Finalize Market</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* RESOLVED MARKETS */}
            {activeTab === 'Resolved Markets' && (
              <div className="space-y-4 w-full">
                {resolvedMarkets.length === 0 ? (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No resolved markets yet.</div>
                ) : (
                  resolvedMarkets.map((market) => (
                    <div key={market.id} className="bg-secondary/20 border border-border rounded-xl p-4 sm:p-5 w-full max-w-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-mono text-primary font-bold">Market #{market.id}</span>
                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold tracking-wider uppercase">
                          {market.outcomeLabels?.[market.confirmedOutcome] || 'Resolved'} Won
                        </span>
                      </div>
                      <p className="text-sm font-semibold mb-3 text-slate-200">{market.question}</p>
                      <div className="flex flex-wrap gap-3 text-[11px] font-mono text-slate-400 mb-2">
                        {market.outcomeLabels?.map((label, oi) => (
                          <span key={oi}>{label}: {formatEther(market.outcomePools?.[oi] || '0')} tITL</span>
                        ))}
                      </div>
                      <p className="text-[10px] font-mono text-slate-500 mb-3">Ended: {formatExpiryDate(market.marketEndTime)}</p>
                      {walletAddress && (() => {
                        const position = positionByMarketId.get(market.id)
                        if (!position) return null

                        const winningShares = BigInt(position.shares?.[market.confirmedOutcome] || '0')
                        const hasWon = winningShares > BigInt(0) || position.claimed
                        const hasClaimed = position.claimed || claimedMarkets.includes(market.id)

                        if (!hasWon) {
                          return (
                            <div className="w-full py-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-lg uppercase text-center">
                              Lost
                            </div>
                          )
                        }

                        if (hasClaimed) {
                          return (
                            <div className="w-full py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg uppercase flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="size-3.5" /> Claimed
                            </div>
                          )
                        }

                        return (
                          <button onClick={() => handleCashOut(market.id)} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg uppercase">Cash Out</button>
                        )
                      })()}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* HISTORY */}
            {activeTab === 'History' && (
              <div className="space-y-4 w-full">
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3 font-mono">{t('ledgerTitle')}</h4>
                {persistentLogs.length === 0 ? (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">{t('noLogs')}</div>
                ) : (
                  <div className="space-y-3">
                    {persistentLogs.map((log) => (
                      <div key={log.id} className="bg-black/30 border border-purple-950/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold bg-purple-950 border border-purple-900 px-2 py-0.5 rounded text-purple-300">{log.type}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{log.timestamp}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-200 leading-snug">{log.description}</p>
                          <p className="text-xs text-slate-400 font-mono">{log.detail}</p>
                        </div>
                        <div className="shrink-0 sm:text-right">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase border ${log.status === 'Success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>● {log.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* DEC MEMBERS (Admin) */}
            {activeTab === 'DEC Members' && walletAddress?.toLowerCase() === ADMIN_ADDRESS.toLowerCase() && (
              <div className="space-y-4 w-full">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 font-mono">● {t('adminPanel')}</h4>
                {blockchainDecList.length === 0 ? (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No DEC members registered.</div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-purple-950/60 bg-black/30 shadow-md">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-purple-950/80 bg-purple-950/15 text-[10px] font-mono font-bold uppercase tracking-wider text-purple-300">
                          <th className="p-4">{t('memberAddress')}</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-950/40 font-mono text-xs">
                        {blockchainDecList.map((member, index) => (
                          <tr key={index} className="hover:bg-purple-950/5 transition-colors">
                            <td className="p-4 text-slate-200">{member}</td>
                            <td className="p-4 text-emerald-400">Active</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'DEC Requests' && walletAddress?.toLowerCase() === ADMIN_ADDRESS.toLowerCase() && (
              <div className="space-y-4 w-full">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 font-mono">● Pending DEC Requests</h4>
                {pendingDecRequests.length === 0 ? (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No pending requests.</div>
                ) : (
                  <div className="space-y-3">
                    {pendingDecRequests.map((req) => (
                      <div key={req.address} className="bg-secondary/30 border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-mono text-slate-200">{req.address}</p>
                          <p className="text-[10px] text-slate-500 font-mono">Requested: {new Date(req.requestedAt).toLocaleString()}</p>
                        </div>
                        <button onClick={() => handleApproveDecRequest(req.address)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg uppercase shrink-0">
                          Approve
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* DEC REWARDS */}
            {activeTab === 'DEC Rewards' && hasJoinedDEC && (
              <div className="space-y-6 w-full max-w-xl">
                <div className="p-6 bg-gradient-to-br from-purple-950/30 to-indigo-950/20 border border-purple-900/30 rounded-2xl">
                  <div className="flex items-center gap-2.5 mb-4">
                    <Coins className="size-6 text-primary" />
                    <h3 className="text-sm font-bold text-slate-100">DEC Committee Rewards</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-5">
                    Platform revenue routed to the DEC Pool is split equally among all committee members with sufficient reputation.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                    <div className="bg-black/30 border border-purple-950/60 rounded-xl p-3">
                      <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500 mb-1">DEC Pool</p>
                      <p className="text-sm font-bold text-slate-200 font-mono">{formatEther(decPoolTotal)} tITL</p>
                    </div>
                    <div className="bg-black/30 border border-purple-950/60 rounded-xl p-3">
                      <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500 mb-1">Members</p>
                      <p className="text-sm font-bold text-slate-200 font-mono">{decMemberCount}</p>
                    </div>
                    <div className="bg-black/30 border border-emerald-900/50 rounded-xl p-3">
                      <p className="text-[9px] font-mono uppercase tracking-wider text-emerald-500 mb-1">Your Claimable</p>
                      <p className="text-sm font-bold text-emerald-400 font-mono">{formatEther(decRewardsClaimable)} tITL</p>
                    </div>
                  </div>
                  {BigInt(decRewardsClaimable || '0') > BigInt(0) ? (
                    <button onClick={handleClaimDecRewards} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold rounded-xl uppercase shadow-md">
                      Claim {formatEther(decRewardsClaimable)} tITL
                    </button>
                  ) : (
                    <div className="p-4 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No rewards available to claim yet.</div>
                  )}
                </div>
              </div>
            )}

            {/* CREATOR DASHBOARD */}
            {activeTab === 'Creator Dashboard' && (
              <div className="space-y-6 w-full">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">My Markets</h3>
                {creatorMarkets.length === 0 ? (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">You haven't created any markets yet.</div>
                ) : (
                  creatorMarkets.map((market) => (
                    <div key={market.id} className="bg-secondary/30 border border-border rounded-xl p-4 sm:p-5 w-full max-w-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-mono text-primary font-bold">Market #{market.id}</span>
                        <span className="text-[11px] font-mono text-slate-400">{STATE_NAMES[market.state]}</span>
                      </div>
                      <p className="text-sm font-semibold mb-3 text-slate-200">{market.question}</p>
                      <div className="flex flex-wrap gap-3 text-[11px] font-mono text-slate-400 mb-3">
                        <span>Fees Earned: {formatEther(market.creatorFeesEarned)} tITL</span>
                        <span>Fees Claimed: {formatEther(market.creatorFeesClaimed)} tITL</span>
                        <span>Seed Claimed: {formatEther(market.creatorSeedClaimed)} tITL</span>
                      </div>
                      {market.finalized && (
                        <div className="flex gap-2">
                          <button onClick={() => handleClaimCreatorFees(market.id)} className="flex-1 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg">Claim Fees</button>
                          <button
                            onClick={() => handleClaimCreatorSeed(market.id)}
                            disabled={BigInt(market.creatorSeedClaimed || '0') > BigInt(0)}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg"
                          >
                            {BigInt(market.creatorSeedClaimed || '0') > BigInt(0) ? 'Seed Claimed' : 'Claim Seed'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

          </div>

          {txStatus && <div className="mt-6 p-4 bg-purple-950/40 border border-purple-500/20 rounded-xl text-xs text-purple-300 font-mono animate-pulse">{txStatus}</div>}

          {toastMsg && (
            <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-rose-950/90 border border-rose-500/40 rounded-xl px-5 py-3 shadow-2xl animate-in slide-in-from-bottom-2">
              <p className="text-xs font-semibold text-rose-200 font-mono">{toastMsg}</p>
            </div>
          )}

        </section>
      </div>
    </div>
  )
}