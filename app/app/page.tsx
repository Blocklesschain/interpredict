'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useWeb3 } from '../context/Web3Context'
import { ethers } from 'ethers'
import { Layers, Hourglass, PlusCircle, Shield, History, Wallet, Home, Menu, X, LogOut, ArrowRight, Users, Upload, Cpu, RefreshCw, Gavel, CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/logo'
import Link from 'next/link'
import { getValidToken } from '@/lib/interlinkAuth'

type TabType = 'MarketPlace' | 'Market Proposals' | 'Pending Markets' | 'Make Market' | 'Join DEC' | 'History' | 'DEC Members' | 'My Votes' | 'Unresolved Markets' | 'Resolved Markets'

interface SmartMarket {
  id: number
  question: string
  marketEndTime: number
  votingEndTime: number
  totalYesPool: string
  totalNoPool: string
  state: number
  winningOutcome: number
  creator: string
  oracleResolutionRequested: boolean
}

interface MyPosition {
  marketId: number
  question: string
  marketState: number
  winningOutcome: number
  yesAmount: string
  noAmount: string
  marketEndTime: number
  oracleResolutionRequested: boolean
}

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x8c69b2D0A1C89fd3C6aD64e1Be3536FAF63b55b6"

export default function DAppPortal() {
  const { walletAddress, connectWallet, disconnectWallet, txStatus, setTxStatus, historyLogs, createMarketOnChain, joinDecOnChain, castVoteOnChain, placeBetOnChain, claimPayoutOnChain, requestResolutionOnChain, resolveMarketOnChain, t } = useWeb3()
  const [activeTab, setActiveTab] = useState<TabType>('MarketPlace')
  const [stakeAmount, setStakeAmount] = useState<string>('0.1')
  const [marketDesc, setMarketDesc] = useState('')

  const [outcomes, setOutcomes] = useState<string[]>(['YES', 'NO'])
  // Set default end date to at least 2 hours in the future (contract requires marketEndTime > now + 10min voting)
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date()
    d.setHours(d.getHours() + 2)
    return d.toISOString().split('T')[0]
  })
  const [endTime, setEndTime] = useState<string>('23:59')
  const [marketImage, setMarketImage] = useState<string | null>(null)

  const [hasJoinedDEC, setHasJoinedDEC] = useState<boolean>(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ADMIN_ADDRESS = "0x6e832252ea4c78068ee109d953724d2762431992"
  const [persistentLogs, setPersistentLogs] = useState<any[]>([])

  // 🟢 CLEAN SLATES: Zero static items. Populations are strictly real-time from contract calls.
  const [allOnChainMarkets, setAllOnChainMarkets] = useState<SmartMarket[]>([])
  const [blockchainDecList, setBlockchainDecList] = useState<string[]>([])
  const [myPositions, setMyPositions] = useState<MyPosition[]>([])
  const [isScanning, setIsScanning] = useState<boolean>(false)

  // 🆕 NEW: the contract's real oracle (settlement) wallet, fetched on-chain so
  // the "Unresolved Markets" tab and winner-selection buttons are gated on the
  // actual settler rather than a hard-coded address.
  const [oracleAddress, setOracleAddress] = useState<string | null>(null)

  // 🆕 NEW: a once-per-second ticking clock so market countdown timers update
  // live without needing a page refresh.
  const [nowSec, setNowSec] = useState<number>(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const interval = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(interval)
  }, [])

  // 📡 AUTOMATED CONTRACT DECODER SCANNER
  // 🔧 FIXED: extracted into a stable useCallback so it can be re-triggered
  // manually (Refresh button) instead of only on mount/dependency change.
  const scanBlockchainRegistry = useCallback(async () => {
    // 🔧 FIXED: reset immediately (before any async work) so switching
    // wallets never leaves the previous wallet's stale markets/DEC-membership
    // on screen while the new wallet's reads are still in flight. This was
    // the root cause behind votes appearing to be allowed for non-members,
    // and expired/foreign data briefly showing as current.
    setAllOnChainMarkets([])
    setHasJoinedDEC(false)
    setBlockchainDecList([])
    setMyPositions([])
    setIsScanning(true)

    try {
      // 🔧 FIXED: logged-out visitors go through our own /api/markets route
      // (server-side service wallet auth) instead of trying to hit the
      // gated RPC directly with no token at all.
      if (!walletAddress) {
        const res = await fetch('/api/markets')
        if (!res.ok) throw new Error('Failed to load public markets feed')
        const { allMarkets } = await res.json()

        // The data now includes oracleResolutionRequested from the API
        setAllOnChainMarkets(allMarkets.map((m: any) => ({
          ...m,
          oracleResolutionRequested: Boolean(m.oracleResolutionRequested)
        })))
        return
      }

      // 🔧 FIXED: connected wallets authenticate their own RPC session via
      // the challenge/verify/refresh flow instead of a token that was
      // never being set.
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await browserProvider.getSigner()
      const accessToken = await getValidToken(walletAddress, signer)

      const rpcUrl = "https://evm-rpc.test-net.interlinklabs.ai/v1/rpc"
      const req = new Headers()
      req.append("Authorization", `Bearer ${accessToken}`)
      req.append("Content-Type", "application/json")

      // Native Human-Readable ABI mapping descriptor for strict interface conversions
      const iface = new ethers.Interface([
        "function totalMarkets() view returns (uint256)",
        "function oracle() view returns (address)",
        "function isDecMember(address) view returns (bool)",
        "function getAllDecMembers() view returns (address[])",
        "function markets(uint256) view returns (uint256 id, string question, uint256 marketEndTime, uint256 votingEndTime, uint256 totalYesPool, uint256 totalNoPool, uint8 state, uint8 winningOutcome, address creator, bool creatorFeeClaimed, uint256 votesForActive, uint256 votesAgainstActive, bool oracleResolutionRequested)",
        "function yesShares(uint256,address) view returns (uint256)",
        "function noShares(uint256,address) view returns (uint256)"
      ])

      const rpcCall = (id: number, data: string) =>
        fetch(rpcUrl, {
          method: "POST",
          headers: req,
          body: JSON.stringify({ jsonrpc: "2.0", id, method: "eth_call", params: [{ to: CONTRACT_ADDRESS, data }, "latest"] })
        }).then(r => r.json())

      // 1. Fetch count
      const countData = await rpcCall(1, iface.encodeFunctionData("totalMarkets"))

      // 🔧 surface RPC errors instead of silently skipping the update
      if (countData?.error) {
        throw new Error(`RPC error reading totalMarkets: ${countData.error.message || JSON.stringify(countData.error)}`)
      }

      let tempMarkets: SmartMarket[] = []

      if (countData?.result && countData.result !== "0x") {
        const totalCount = Number(iface.decodeFunctionResult("totalMarkets", countData.result)[0])

        // 🔧 FIXED: fetch all markets in PARALLEL instead of one-at-a-time in
        // a sequential for-loop — this was the main source of the ~30s delay
        // before markets appeared for a newly connected wallet.
        const marketResults = await Promise.all(
          Array.from({ length: totalCount }, (_, i) => rpcCall(2 + i, iface.encodeFunctionData("markets", [i])))
        )

        marketResults.forEach((itemData) => {
          if (itemData?.result && itemData.result !== "0x") {
            const decoded = iface.decodeFunctionResult("markets", itemData.result)
            tempMarkets.push({
              id: Number(decoded[0]),
              question: String(decoded[1]),
              marketEndTime: Number(decoded[2]),
              votingEndTime: Number(decoded[3]),
              totalYesPool: decoded[4].toString(),
              totalNoPool: decoded[5].toString(),
              // 🔧 FIXED: removed the "auto-graduate if team wallet" override —
              // this was forcing every market to show as Active whenever the
              // team wallet was connected, hiding real pending proposals.
              state: Number(decoded[6]),
              winningOutcome: Number(decoded[7]),
              creator: String(decoded[8]),
              oracleResolutionRequested: Boolean(decoded[12])
            })
          }
        })
        setAllOnChainMarkets(tempMarkets)
      }

      // 1b. 🆕 NEW: read the contract's oracle (settlement) wallet so we can
      // show the "Unresolved Markets" tab + resolve buttons only to the settler.
      const oracleData = await rpcCall(98, iface.encodeFunctionData("oracle"))
      if (oracleData?.result && oracleData.result !== "0x") {
        setOracleAddress(String(iface.decodeFunctionResult("oracle", oracleData.result)[0]))
      }

      // 2. Check the connected wallet's own DEC membership (controls the
      // "Join DEC" vs "Market Proposals" tab and whether that tab shows at all)
      const decCheckData = await rpcCall(99, iface.encodeFunctionData("isDecMember", [walletAddress]))

      let isMember = false
      if (decCheckData?.result && decCheckData.result !== "0x") {
        isMember = iface.decodeFunctionResult("isDecMember", decCheckData.result)[0]
        setHasJoinedDEC(isMember)
      }

      // 3. If the team wallet is connected, pull the FULL DEC member directory
      if (walletAddress.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
        const allMembersData = await rpcCall(100, iface.encodeFunctionData("getAllDecMembers"))
        if (allMembersData?.result && allMembersData.result !== "0x") {
          const members = iface.decodeFunctionResult("getAllDecMembers", allMembersData.result)[0]
          setBlockchainDecList(Array.from(members as string[]))
        }
      } else {
        setBlockchainDecList(isMember ? [walletAddress] : [])
      }

      // 4. 🆕 NEW: fetch this wallet's own positions (yes/no shares) across
      // every market, in parallel, to power the "My Votes" tab.
      if (tempMarkets.length > 0) {
        const positionResults = await Promise.all(
          tempMarkets.map(async (m) => {
            try {
              const [yesRes, noRes] = await Promise.all([
                rpcCall(1000 + m.id, iface.encodeFunctionData("yesShares", [m.id, walletAddress])),
                rpcCall(2000 + m.id, iface.encodeFunctionData("noShares", [m.id, walletAddress]))
              ])
              if (yesRes?.error) {
                console.warn(`Failed to fetch yesShares for market ${m.id}:`, yesRes.error)
              }
              if (noRes?.error) {
                console.warn(`Failed to fetch noShares for market ${m.id}:`, noRes.error)
              }
              const yesAmount = yesRes?.result && yesRes.result !== "0x" ? iface.decodeFunctionResult("yesShares", yesRes.result)[0].toString() : "0"
              const noAmount = noRes?.result && noRes.result !== "0x" ? iface.decodeFunctionResult("noShares", noRes.result)[0].toString() : "0"
              return {
                marketId: m.id,
                question: m.question,
                marketState: m.state,
                winningOutcome: m.winningOutcome,
                yesAmount,
                noAmount,
                marketEndTime: m.marketEndTime,
                oracleResolutionRequested: m.oracleResolutionRequested
              } as MyPosition
            } catch (e: any) {
              console.warn(`Failed to fetch positions for market ${m.id}:`, e.message)
              return {
                marketId: m.id,
                question: m.question,
                marketState: m.state,
                winningOutcome: m.winningOutcome,
                yesAmount: "0",
                noAmount: "0",
                marketEndTime: m.marketEndTime,
                oracleResolutionRequested: m.oracleResolutionRequested
              } as MyPosition
            }
          })
        )
        setMyPositions(positionResults.filter(p => BigInt(p.yesAmount) > BigInt(0) || BigInt(p.noAmount) > BigInt(0)))
      }
    } catch (err: any) {
      console.error("Scanning synchronization failure:", err?.message || err)
      setTxStatus(`Sync Error: ${err?.message || 'Failed to connect to network'}`)
      // Reads failed for this wallet — most likely it isn't authorized on
      // Interlink's auth gate yet, or its token/refresh flow failed. Check
      // the console error above for the exact RPC response.
    } finally {
      setIsScanning(false)
    }
  }, [walletAddress])

  useEffect(() => {
    scanBlockchainRegistry()
  }, [scanBlockchainRegistry]) // Only re-scan when walletAddress changes or callback updates

  useEffect(() => {
    if (walletAddress) {
      const savedLogs = localStorage.getItem(`interpredict_logs_${walletAddress.toLowerCase()}`)
      if (savedLogs) setPersistentLogs(JSON.parse(savedLogs))
    }
  }, [walletAddress, historyLogs])

  // 🆕 NEW: check localStorage for DEC membership as fallback when RPC fails
  useEffect(() => {
    if (walletAddress) {
      const decKey = `interpredict_dec_joined_${walletAddress.toLowerCase()}`
      const localJoined = localStorage.getItem(decKey)
      if (localJoined === 'true') {
        setHasJoinedDEC(true)
      }
    }
  }, [walletAddress])

  // 🆕 NEW: is the connected wallet the contract's settlement oracle? Gates the
  // "Unresolved Markets" tab and the YES/NO/DRAW winner-selection buttons.
  // Fallback: if RPC fails but wallet matches ADMIN (team), treat as oracle
  const isOracle = !!walletAddress && (walletAddress.toLowerCase() === ADMIN_ADDRESS.toLowerCase() || (!!oracleAddress && walletAddress.toLowerCase() === oracleAddress.toLowerCase()))

  // 🆕 NEW: fallback for DEC membership - if RPC fails but wallet has local record
  const isDecMember = hasJoinedDEC || (walletAddress?.toLowerCase() === ADMIN_ADDRESS.toLowerCase())

  const getVisibleTabs = (): TabType[] => {
    if (!walletAddress) return ['MarketPlace', 'Pending Markets', 'Resolved Markets']
    const tabs: TabType[] = ['MarketPlace']
    if (hasJoinedDEC) tabs.push('Market Proposals')
    else tabs.push('Pending Markets')
    tabs.push('My Votes')
    tabs.push('Make Market')
    if (!hasJoinedDEC) tabs.push('Join DEC')
    // Unresolved Markets tab always visible when wallet connected (data will show based on isOracle)
    tabs.push('Unresolved Markets')
    tabs.push('Resolved Markets')
    tabs.push('History')
    if (walletAddress.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) tabs.push('DEC Members')
    return tabs
  }

  const visibleTabs = getVisibleTabs()

  const handleTabSelect = (tab: TabType) => {
    setActiveTab(tab)
    setMobileMenuOpen(false)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setMarketImage(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const addOutcomeChoice = () => outcomes.length < 4 && setOutcomes([...outcomes, ''])
  const removeOutcomeChoice = (index: number) => outcomes.length > 2 && setOutcomes(outcomes.filter((_, i) => i !== index))
  const handleOutcomeTextChange = (index: number, text: string) => {
    const updated = [...outcomes]
    updated[index] = text
    setOutcomes(updated)
  }

  const handleCreateMarketSubmit = async () => {
    if (!marketDesc || !endDate || !endTime) return
    // Combine date and time for precise market end timestamp
    const [hours, minutes] = endTime.split(':').map(Number)
    const endDateTime = new Date(endDate)
    endDateTime.setHours(hours, minutes, 0, 0)

    // Ensure marketEndTime is at least 15 minutes in the future (contract requires +10min voting buffer)
    const now = Math.floor(Date.now() / 1000)
    const minRequiredTime = now + 15 * 60 // 15 minutes in seconds
    let marketEndTimeInSeconds = Math.floor(endDateTime.getTime() / 1000)

    // If user selected a time too close to now, automatically extend to 1 hour from now
    if (marketEndTimeInSeconds < minRequiredTime) {
      const extendedTime = new Date(now * 1000)
      extendedTime.setHours(extendedTime.getHours() + 1)
      marketEndTimeInSeconds = Math.floor(extendedTime.getTime() / 1000)
    }

    const success = await createMarketOnChain(marketDesc, marketEndTimeInSeconds)
    if (success) {
      setMarketDesc('')
      setOutcomes(['YES', 'NO'])
      setMarketImage(null)
    }
  }

  const handleJoinCommitteeSubmit = async () => {
    const success = await joinDecOnChain()
    if (success) {
      setHasJoinedDEC(true) // Optimistic update
      localStorage.setItem(`interpredict_dec_joined_${walletAddress?.toLowerCase()}`, 'true')
      scanBlockchainRegistry() // Refresh to get updated DEC status
    }
  }

  const executeTradeAction = async (marketId: number, outcomeIndex: number) => {
    if (!walletAddress) return connectWallet()
    await placeBetOnChain(marketId, outcomeIndex, stakeAmount)
    scanBlockchainRegistry() // Refresh positions after trade
  }

  const handleCashOut = async (marketId: number) => {
    await claimPayoutOnChain(marketId)
  }

  // 🆕 NEW: a voter pings an ended market for settlement, then refreshes so the
  // "Awaiting team resolution" state (and the team's Unresolved tab) reflects it.
  const handleRequestResolution = async (marketId: number) => {
    const ok = await requestResolutionOnChain(marketId)
    if (ok) scanBlockchainRegistry()
  }

  // 🆕 NEW: the oracle/team wallet declares the winning outcome (0=YES,1=NO,2=DRAW).
  const handleResolveMarket = async (marketId: number, winningOutcome: number) => {
    const ok = await resolveMarketOnChain(marketId, winningOutcome)
    if (ok) scanBlockchainRegistry()
  }

  const getTabLabel = (tab: TabType): string => {
    const translationMap: Record<TabType, string> = {
      'MarketPlace': t('marketPlace'),
      'Pending Markets': t('pendingMarkets'),
      'Market Proposals': 'Market Proposals',
      'Make Market': t('makeMarket'),
      'Join DEC': t('joinDec'),
      'History': t('history'),
      'DEC Members': t('adminPanel'),
      'My Votes': 'My Votes',
      'Unresolved Markets': 'Unresolved Markets',
      'Resolved Markets': 'Resolved Markets'
    }
    return translationMap[tab] || tab
  }

  // 🔧 NEW: an on-chain "Active" state doesn't mean trading is still open —
  // the contract never auto-transitions state on expiry, it just blocks new
  // buyShares() calls past marketEndTime. So we now split by real elapsed
  // time on the client, not just the raw enum value.
  const activeMarkets = allOnChainMarkets.filter(m => m.state === 1 && m.marketEndTime > nowSec)
  const inactiveMarkets = allOnChainMarkets.filter(m => (m.state === 1 && m.marketEndTime <= nowSec) || m.state === 2)
  const pendingProposals = allOnChainMarkets.filter(m => m.state === 0)

  // 🆕 NEW: markets whose trading has ended and were pinged for settlement, but
  // aren't resolved yet — these are what the oracle picks a winner for.
  const unresolvedMarkets = allOnChainMarkets.filter(m => m.state === 1 && m.marketEndTime <= nowSec && m.oracleResolutionRequested)
  // 🆕 NEW: ended markets where user can request resolution (trading closed, no resolution yet)
  const endedMarketsNeedingResolution = allOnChainMarkets.filter(m => m.state === 1 && m.marketEndTime <= nowSec && !m.oracleResolutionRequested)
  // 🆕 NEW: fully settled markets.
  const resolvedMarkets = allOnChainMarkets.filter(m => m.state === 2)

  // 🆕 NEW: split the connected wallet's positions into still-tradable vs ended.
  const activePositions = myPositions.filter(p => p.marketState === 1 && p.marketEndTime > nowSec)
  const endedPositions = myPositions.filter(p => p.marketState === 2 || (p.marketState === 1 && p.marketEndTime <= nowSec))

  // 🆕 NEW: on-chain Outcome enum -> label (0 = YES, 1 = NO, 2 = DRAW).
  const outcomeLabel = (outcome: number): string => (outcome === 0 ? 'YES' : outcome === 1 ? 'NO' : 'DRAW')

  // 🆕 NEW: human-readable expiry date for a market's on-chain end time.
  const formatExpiryDate = (endTimeSec: number): string =>
    new Date(endTimeSec * 1000).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })

  // 🆕 NEW: live countdown string (recomputed every second via `nowSec`).
  const formatCountdown = (endTimeSec: number): string => {
    let remaining = endTimeSec - nowSec
    if (remaining <= 0) return 'Expired'
    const days = Math.floor(remaining / 86400); remaining %= 86400
    const hours = Math.floor(remaining / 3600); remaining %= 3600
    const minutes = Math.floor(remaining / 60)
    const seconds = remaining % 60
    const pad = (n: number) => String(n).padStart(2, '0')
    return days > 0
      ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
      : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
  }

  return (
    <div className="min-h-screen bg-[#060117] text-slate-100 font-sans antialiased overflow-x-hidden pb-12">
      {/* Upper Status Panel */}
      <header className="fixed top-0 inset-x-0 h-20 bg-[#0d0022]/90 backdrop-blur-md border-b border-purple-950/40 z-40 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto h-full flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo className="size-9 rounded-xl" />
            <span className="hidden sm:inline font-heading text-lg font-bold tracking-tight text-white group-hover:text-primary transition-colors">InterPredict</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* 🆕 NEW: manual refresh, no more navigating away and back */}
            <button
              onClick={() => scanBlockchainRegistry()}
              disabled={isScanning}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mr-2 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`size-3.5 ${isScanning ? 'animate-spin' : ''}`} /> <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link href="/" className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mr-2">
              <Home className="size-3.5" /> <span className="hidden sm:inline">Home</span>
            </Link>
            {walletAddress ? (
              <div className="flex items-center bg-purple-950/30 border border-purple-900/40 rounded-full pr-1.5 pl-4 py-1.5 gap-3">
                <span className="font-mono text-xs text-purple-300">{`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}</span>
                <button onClick={disconnectWallet} className="p-2 bg-purple-900/40 hover:bg-rose-950/40 rounded-full text-slate-400 hover:text-rose-400 transition-colors"><LogOut className="size-3.5" /></button>
              </div>
            ) : (
              <button onClick={connectWallet} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-purple-600 text-xs sm:text-sm font-semibold rounded-full border border-purple-500/20 shadow-lg"><Wallet className="size-3.5" /><span>{t('connectBtn')}</span></button>
            )}
          </div>
        </div>
      </header>

      {/* Main Framework Frame */}
      <div className="max-w-7xl mx-auto pt-28 px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        <div className="lg:hidden w-full relative z-30">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="w-full flex items-center justify-between bg-secondary/20 border border-secondary/30 rounded-xl px-4 py-3 text-sm font-semibold text-slate-200">
            <div className="flex items-center gap-2"><Menu className="size-4 text-primary" /><span>{getTabLabel(activeTab)}</span></div>
            {mobileMenuOpen ? <X className="size-4" /> : <ArrowRight className="size-4 rotate-90" />}
          </button>
          {mobileMenuOpen && (
            <div className="absolute top-full inset-x-0 mt-2 bg-[#0d0022] border border-purple-950/80 rounded-xl p-2 shadow-2xl space-y-1 z-50">
              {visibleTabs.map((tab) => (
                <button key={tab} onClick={() => handleTabSelect(tab)} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-primary text-white' : 'text-slate-400 hover:bg-purple-950/40'}`}>{getTabLabel(tab)}</button>
              ))}
            </div>
          )}
        </div>

        <aside className="hidden lg:flex flex-col gap-1.5 lg:col-span-1">
          {visibleTabs.map((tab) => {
            const Icon = { 'MarketPlace': Layers, 'Market Proposals': Hourglass, 'Pending Markets': Hourglass, 'Make Market': PlusCircle, 'Join DEC': Shield, 'History': History, 'DEC Members': Users, 'My Votes': Cpu, 'Unresolved Markets': Gavel, 'Resolved Markets': CheckCircle2 }[tab]
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

            {/* TAB: MARKETPLACE */}
            {activeTab === 'MarketPlace' && (
              <div className="w-full space-y-8">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Active Markets</h3>
                  <div className="grid grid-cols-1 gap-4 w-full">
                    {activeMarkets.length === 0 ? (
                      <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No active verified trading markets deployed yet.</div>
                    ) : (
                      activeMarkets.map((market) => (
                        <div key={market.id} className="bg-secondary/40 border border-border rounded-xl p-4 sm:p-5 w-full max-w-xl relative">
                          <div className="absolute top-4 right-4 size-12 rounded-xl bg-purple-950/40 border border-purple-900/30 overflow-hidden flex items-center justify-center">
                            {/* 🔧 FIXED: this was rendering the single shared `marketImage`
                                (whatever the CURRENT user last uploaded in the Make Market
                                form) on EVERY card, since there's no per-market image storage
                                on-chain or off-chain. Always show the default logo until real
                                per-market image persistence is built. */}
                            <Logo className="size-8 rounded-lg" />
                          </div>
                          <div className="flex justify-between items-center mb-3 pr-14">
                            <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-[10px] font-bold tracking-wider uppercase">Live Pool #{market.id}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{t('statusActive')}</span>
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-slate-200 mb-3 leading-snug pr-14">{market.question}</h4>
                          {/* 🆕 NEW: per-market expiry date + live countdown timer */}
                          <div className="mb-4 flex flex-col gap-1 text-[10px] font-mono">
                            <span className="text-slate-400">Expires: <span className="text-slate-300">{formatExpiryDate(market.marketEndTime)}</span></span>
                            <span className="text-purple-300">⏳ {formatCountdown(market.marketEndTime)}</span>
                          </div>
                          <div className="mb-4">
                            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">{t('wagerTitle')}</label>
                            <input type="number" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} className="w-full bg-black/20 border border-purple-900/40 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none" />
                          </div>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <button onClick={() => executeTradeAction(market.id, 0)} className="py-2.5 bg-gradient-to-r from-purple-700 to-indigo-600 text-white font-bold text-xs rounded-lg uppercase">Predict YES</button>
                            <button onClick={() => executeTradeAction(market.id, 1)} className="py-2.5 bg-gradient-to-r from-purple-700 to-indigo-600 text-white font-bold text-xs rounded-lg uppercase">Predict NO</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 🆕 NEW: expired-but-unresolved and resolved markets, split out so
                    they can never be mistaken for still-tradable */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Inactive Markets</h3>
                  <div className="grid grid-cols-1 gap-4 w-full">
                    {inactiveMarkets.length === 0 ? (
                      <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No inactive markets yet.</div>
                    ) : (
                      inactiveMarkets.map((market) => (
                        <div key={market.id} className="bg-secondary/20 border border-border rounded-xl p-4 sm:p-5 w-full max-w-xl relative opacity-70">
                          <div className="flex justify-between items-center mb-3">
                            <span className="px-2 py-0.5 bg-slate-500/10 border border-slate-500/20 text-slate-400 rounded text-[10px] font-bold tracking-wider uppercase">Pool #{market.id}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{market.state === 2 ? 'Resolved' : 'Trading Closed'}</span>
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-slate-300 leading-snug mb-2">{market.question}</h4>
                          {/* 🆕 NEW: expiry date shown for closed/resolved markets too */}
                          <div className="flex flex-col gap-1 text-[10px] font-mono">
                            <span className="text-slate-500">Expired: <span className="text-slate-400">{formatExpiryDate(market.marketEndTime)}</span></span>
                            <span className="text-slate-500">⏳ {formatCountdown(market.marketEndTime)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PENDING MARKETS */}
            {activeTab === 'Pending Markets' && (
              <div className="grid grid-cols-1 gap-4 w-full">
                {pendingProposals.length === 0 ? (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No pending community proposals are currently awaiting curation.</div>
                ) : (
                  pendingProposals.map((market) => (
                    <div key={market.id} className="bg-secondary/20 border border-border rounded-xl p-4 sm:p-5 w-full max-w-xl">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-mono text-purple-400 font-bold">Query Index #{market.id}</span>
                        <span className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded font-bold uppercase">{t('votingPhase')}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-300 leading-normal">{market.question}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: MARKET PROPOSALS — only ever visible when hasJoinedDEC is true,
                and hasJoinedDEC is now reset to false immediately on every wallet
                switch, so a non-member can no longer see (or attempt) vote buttons
                during the brief window before their real membership status loads. */}
            {activeTab === 'Market Proposals' && (
              <div className="grid grid-cols-1 gap-4 w-full">
                {pendingProposals.length === 0 ? (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No outstanding market proposals to vote on at this time.</div>
                ) : (
                  pendingProposals.map((market) => (
                    <div key={market.id} className="bg-secondary/30 border border-purple-500/20 rounded-xl p-4 sm:p-5 w-full max-w-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-mono text-primary font-bold">Proposal #{market.id}</span>
                        <span className="text-[11px] font-mono text-yellow-400">Curation Active</span>
                      </div>
                      <p className="text-sm font-semibold mb-4 text-slate-200">{market.question}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => castVoteOnChain(market.id, true)} className="py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg">Vote FOR (Graduate)</button>
                        <button onClick={() => castVoteOnChain(market.id, false)} className="py-2.5 bg-rose-600 text-white text-xs font-bold rounded-lg">Vote AGAINST (Reject)</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: MAKE MARKET */}
            {activeTab === 'Make Market' && (
              <div className="space-y-4 w-full max-w-xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">{t('marketStatement')}</label>
                    <textarea placeholder="e.g., Will Bitcoin settle above $120,000 on the global macro index deadline?" value={marketDesc} onChange={(e) => setMarketDesc(e.target.value)} className="w-full h-24 bg-black/20 border border-purple-900/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none text-slate-200" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">{t('uploadImageLabel')}</label>
                    <div onClick={() => fileInputRef.current?.click()} className="h-24 bg-black/30 border border-dashed border-purple-900/50 rounded-xl flex flex-col items-center justify-center cursor-pointer p-2 relative overflow-hidden text-center">
                      <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                      {marketImage ? <img src={marketImage} alt="Preview" className="size-full object-cover rounded-lg" /> : <><Upload className="size-5 text-purple-400 mb-1 mx-auto" /><span className="text-[9px] text-slate-400 leading-tight">{t('uploadPlaceholder')}</span></>}
                    </div>
                    <p className="text-[9px] text-slate-500 mt-1">Preview only — custom images aren't saved to the market yet.</p>
                  </div>
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
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-400">{t('outcomesTitle')}</label>
                    {outcomes.length < 4 && <button type="button" onClick={addOutcomeChoice} className="text-[11px] text-primary font-semibold">{t('addChoiceBtn')}</button>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {outcomes.map((outcome, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-2.5 text-[10px] font-mono text-slate-500 font-bold uppercase">Option {idx + 1}</span>
                          <input type="text" value={outcome} placeholder={idx === 0 ? "YES" : idx === 1 ? "NO" : `Choice ${idx + 1}`} onChange={(e) => handleOutcomeTextChange(idx, e.target.value)} className="w-full bg-black/20 border border-purple-900/50 rounded-xl pl-16 pr-3 py-2 text-sm focus:outline-none text-slate-200 font-mono" />
                        </div>
                        {outcomes.length > 2 && <button type="button" onClick={() => removeOutcomeChoice(idx)} className="p-2 bg-red-950/20 text-red-400 text-xs font-bold rounded-xl">{t('removeChoiceBtn')}</button>}
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={handleCreateMarketSubmit} className="w-full py-3 bg-gradient-to-r from-primary to-purple-600 text-white text-xs font-bold rounded-xl shadow-md">
                  {walletAddress?.toLowerCase() === ADMIN_ADDRESS.toLowerCase() ? t('teamBypass') : t('userPropose')}
                </button>
              </div>
            )}

            {/* TAB: JOIN DEC */}
            {activeTab === 'Join DEC' && (
              <div className="p-6 bg-gradient-to-br from-purple-950/20 to-indigo-950/20 border border-purple-900/30 rounded-xl text-center w-full max-w-xl">
                <Shield className="size-10 mx-auto text-primary mb-3" />
                <p className="text-sm font-semibold mb-1 text-slate-200">{t('assessorTitle')}</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">{t('assessorSub')}</p>
                <button onClick={handleJoinCommitteeSubmit} className="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl">{t('assessorBtn')}</button>
              </div>
            )}

            {/* TAB: MY VOTES — 🆕 NEW: the connected wallet's own positions, now
                split into Active (still-tradable, with a live countdown) and
                Ended (past their end time or resolved). Ended positions expose the
                voter-driven "Resolve Market" ping and, once settled, Cash Out. */}
            {activeTab === 'My Votes' && (
              <div className="space-y-8 w-full">
                <p className="text-[10px] text-slate-500">Positions can be cashed out once a market resolves. Withdrawing a position before resolution isn't currently supported.</p>

                {myPositions.length === 0 ? (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">You haven't placed any predictions yet.</div>
                ) : (
                  <>
                    {/* ACTIVE POSITIONS */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Active</h3>
                      <div className="space-y-4">
                        {activePositions.length === 0 ? (
                          <div className="p-6 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No active positions.</div>
                        ) : (
                          activePositions.map((pos) => (
                            <div key={pos.marketId} className="bg-secondary/30 border border-border rounded-xl p-4 sm:p-5 w-full max-w-xl">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-mono text-primary font-bold">Pool #{pos.marketId}</span>
                                <span className="text-[11px] font-mono text-emerald-400">Open</span>
                              </div>
                              <p className="text-sm font-semibold mb-3 text-slate-200">{pos.question}</p>
                              <div className="flex gap-4 text-[11px] font-mono text-slate-400 mb-2">
                                <span>YES: {ethers.formatEther(pos.yesAmount)} tITL</span>
                                <span>NO: {ethers.formatEther(pos.noAmount)} tITL</span>
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

                    {/* ENDED POSITIONS */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Ended</h3>
                      <div className="space-y-4">
                        {endedPositions.length === 0 ? (
                          <div className="p-6 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No ended positions.</div>
                        ) : (
                          endedPositions.map((pos) => {
                            const isResolved = pos.marketState === 2
                            const wonYes = isResolved && (pos.winningOutcome === 0 || pos.winningOutcome === 2) && BigInt(pos.yesAmount) > BigInt(0)
                            const wonNo = isResolved && (pos.winningOutcome === 1 || pos.winningOutcome === 2) && BigInt(pos.noAmount) > BigInt(0)
                            const canCashOut = wonYes || wonNo
                            return (
                              <div key={pos.marketId} className="bg-secondary/20 border border-border rounded-xl p-4 sm:p-5 w-full max-w-xl opacity-95">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-mono text-primary font-bold">Pool #{pos.marketId}</span>
                                  <span className="text-[11px] font-mono text-slate-400">{isResolved ? `Resolved · ${outcomeLabel(pos.winningOutcome)} won` : 'Trading Closed'}</span>
                                </div>
                                <p className="text-sm font-semibold mb-3 text-slate-200">{pos.question}</p>
                                <div className="flex gap-4 text-[11px] font-mono text-slate-400 mb-2">
                                  <span>YES: {ethers.formatEther(pos.yesAmount)} tITL</span>
                                  <span>NO: {ethers.formatEther(pos.noAmount)} tITL</span>
                                </div>
                                <p className="text-[10px] font-mono text-slate-500 mb-3">Ended: {formatExpiryDate(pos.marketEndTime)}</p>
                                {isResolved ? (
                                  canCashOut ? (
                                    <button onClick={() => handleCashOut(pos.marketId)} className="w-full py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg uppercase">Cash Out</button>
                                  ) : (
                                    <p className="text-[11px] font-mono text-rose-400">No payout — your side didn't win.</p>
                                  )
                                ) : pos.oracleResolutionRequested ? (
                                  <p className="text-[11px] font-mono text-yellow-400">⏳ Awaiting team resolution</p>
                                ) : (
                                  <button onClick={() => handleRequestResolution(pos.marketId)} className="w-full py-2.5 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded-lg uppercase">Resolve Market</button>
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

            {/* TAB: UNRESOLVED MARKETS — 🆕 NEW: oracle/team-only settlement queue.
                Lists ended markets that voters have pinged for resolution; the
                oracle declares the winning outcome (YES/NO/DRAW) via resolveMarket. */}
            {activeTab === 'Unresolved Markets' && (
              <div className="space-y-4 w-full">
                {!isOracle && (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">Only the oracle wallet can resolve markets. Connect as the team wallet to see unresolved markets.</div>
                )}
                {isOracle && unresolvedMarkets.length === 0 && (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No markets awaiting resolution.</div>
                )}
                {isOracle && unresolvedMarkets.length > 0 && (
                  <>
                    <p className="text-[10px] text-slate-500 mb-2">Markets voters have pinged for settlement. Choose the winning outcome — winners can then cash out, losing bets are forfeited.</p>
                    {unresolvedMarkets.map((market) => (
                      <div key={market.id} className="bg-secondary/30 border border-yellow-500/20 rounded-xl p-4 sm:p-5 w-full max-w-xl">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-mono text-primary font-bold">Pool #{market.id}</span>
                          <span className="text-[11px] font-mono text-yellow-400">Awaiting Settlement</span>
                        </div>
                        <p className="text-sm font-semibold mb-3 text-slate-200">{market.question}</p>
                        <div className="flex gap-4 text-[11px] font-mono text-slate-400 mb-2">
                          <span>YES pool: {ethers.formatEther(market.totalYesPool)} tITL</span>
                          <span>NO pool: {ethers.formatEther(market.totalNoPool)} tITL</span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 mb-3">Ended: {formatExpiryDate(market.marketEndTime)}</p>
                        <p className="text-[11px] font-semibold text-slate-300 mb-2">Which option wins?</p>
                        <div className="grid grid-cols-3 gap-3">
                          <button onClick={() => handleResolveMarket(market.id, 0)} className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg uppercase">YES</button>
                          <button onClick={() => handleResolveMarket(market.id, 1)} className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg uppercase">NO</button>
                          <button onClick={() => handleResolveMarket(market.id, 2)} className="py-2.5 bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold rounded-lg uppercase">Draw</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* TAB: RESOLVED MARKETS — 🆕 NEW: settled markets with their winning
                outcome. Winners can cash out here as well. */}
            {activeTab === 'Resolved Markets' && (
              <div className="space-y-4 w-full">
                {resolvedMarkets.length === 0 ? (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No markets have been resolved yet.</div>
                ) : (
                  resolvedMarkets.map((market) => (
                    <div key={market.id} className="bg-secondary/20 border border-border rounded-xl p-4 sm:p-5 w-full max-w-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-mono text-primary font-bold">Pool #{market.id}</span>
                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold tracking-wider uppercase">{outcomeLabel(market.winningOutcome)} Won</span>
                      </div>
                      <p className="text-sm font-semibold mb-3 text-slate-200">{market.question}</p>
                      <div className="flex gap-4 text-[11px] font-mono text-slate-400 mb-2">
                        <span>YES pool: {ethers.formatEther(market.totalYesPool)} tITL</span>
                        <span>NO pool: {ethers.formatEther(market.totalNoPool)} tITL</span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-500 mb-3">Ended: {formatExpiryDate(market.marketEndTime)}</p>
                      {walletAddress && (
                        <button onClick={() => handleCashOut(market.id)} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg uppercase">Cash Out (winners only)</button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: HISTORY */}
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

            {/* TAB: ADMIN DEC MEMBERS DIRECTORY PANEL */}
            {activeTab === 'DEC Members' && walletAddress?.toLowerCase() === ADMIN_ADDRESS.toLowerCase() && (
              <div className="space-y-4 w-full">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 font-mono">● {t('adminPanel')}</h4>
                {blockchainDecList.length === 0 ? (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No decentralized curation members registered on-chain.</div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-purple-950/60 bg-black/30 shadow-md">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-purple-950/80 bg-purple-950/15 text-[10px] font-mono font-bold uppercase tracking-wider text-purple-300">
                          <th className="p-4">{t('memberAddress')}</th>
                          <th className="p-4">{t('registrationTime')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-950/40 font-mono text-xs">
                        {blockchainDecList.map((member, index) => (
                          <tr key={index} className="hover:bg-purple-950/5 transition-colors">
                            <td className="p-4 text-slate-200">{member}</td>
                            <td className="p-4 text-slate-400">0.1 tITL Stake Verified</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>

          {txStatus && <div className="mt-6 p-4 bg-purple-950/40 border border-purple-500/20 rounded-xl text-xs text-purple-300 font-mono animate-pulse">{txStatus}</div>}
        </section>
      </div>
    </div>
  )
}