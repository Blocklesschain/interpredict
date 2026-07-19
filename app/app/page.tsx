'use client'

import { useState, useRef, useEffect } from 'react'
import { useWeb3 } from '../context/Web3Context'
import { ethers } from 'ethers'
import { Layers, Hourglass, PlusCircle, Shield, History, Wallet, Home, Menu, X, LogOut, ArrowRight, Users, Upload, Cpu } from 'lucide-react'
import { Logo } from '@/components/logo'
import Link from 'next/link'
import { getValidToken } from '@/lib/interlinkAuth'

type TabType = 'MarketPlace' | 'Market Proposals' | 'Pending Markets' | 'Make Market' | 'Join DEC' | 'History' | 'DEC Members'

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
}

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x9530477f41bA8e6272251376389d09Dd490CF38e"

export default function DAppPortal() {
  const { walletAddress, connectWallet, disconnectWallet, txStatus, historyLogs, createMarketOnChain, joinDecOnChain, castVoteOnChain, placeBetOnChain, t } = useWeb3()
  const [activeTab, setActiveTab] = useState<TabType>('MarketPlace')
  const [stakeAmount, setStakeAmount] = useState<string>('0.1')
  const [marketDesc, setMarketDesc] = useState('')

  const [outcomes, setOutcomes] = useState<string[]>(['YES', 'NO'])
  const [endDate, setEndDate] = useState<string>('2026-12-31')
  const [marketImage, setMarketImage] = useState<string | null>(null)

  const [hasJoinedDEC, setHasJoinedDEC] = useState<boolean>(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ADMIN_ADDRESS = "0x6e832252ea4c78068ee109d953724d2762431992"
  const [persistentLogs, setPersistentLogs] = useState<any[]>([])

  // 🟢 CLEAN SLATES: Zero static items. Populations are strictly real-time from contract calls.
  const [allOnChainMarkets, setAllOnChainMarkets] = useState<SmartMarket[]>([])
  const [blockchainDecList, setBlockchainDecList] = useState<string[]>([])

  // 📡 AUTOMATED CONTRACT DECODER SCANNER
  useEffect(() => {
    async function scanBlockchainRegistry() {
      try {
        // 🔧 FIXED: logged-out visitors go through our own /api/markets route
        // (server-side service wallet auth) instead of trying to hit the
        // gated RPC directly with no token at all.
        if (!walletAddress) {
          const res = await fetch('/api/markets')
          if (!res.ok) throw new Error('Failed to load public markets feed')
          const { activeMarkets, pendingProposals } = await res.json()

          const combined: SmartMarket[] = [...activeMarkets, ...pendingProposals]
          setAllOnChainMarkets(combined)
          setHasJoinedDEC(false)
          setBlockchainDecList([])
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
          "function isDecMember(address) view returns (bool)",
          "function getAllDecMembers() view returns (address[])",
          "function markets(uint256) view returns (uint256 id, string question, uint256 marketEndTime, uint256 votingEndTime, uint256 totalYesPool, uint256 totalNoPool, uint8 state, uint8 winningOutcome, address creator, bool creatorFeeClaimed, uint256 votesForActive, uint256 votesAgainstActive, bool oracleResolutionRequested)"
        ])

        // 1. Fetch count using robust camelCase signature hashes
        const marketCountRes = await fetch(rpcUrl, {
          method: "POST",
          headers: req,
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_call",
            params: [{ to: CONTRACT_ADDRESS, data: iface.encodeFunctionData("totalMarkets") }, "latest"]
          })
        })
        const countData = await marketCountRes.json()

        // 🔧 NEW: surface RPC errors instead of silently skipping the update
        if (countData?.error) {
          throw new Error(`RPC error reading totalMarkets: ${countData.error.message || JSON.stringify(countData.error)}`)
        }

        if (countData?.result && countData.result !== "0x") {
          const totalCount = Number(iface.decodeFunctionResult("totalMarkets", countData.result)[0])
          const tempMarkets: SmartMarket[] = []

          for (let i = 0; i < totalCount; i++) {
            const marketItemRes = await fetch(rpcUrl, {
              method: "POST",
              headers: req,
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: 2 + i,
                method: "eth_call",
                params: [{ to: CONTRACT_ADDRESS, data: iface.encodeFunctionData("markets", [i]) }, "latest"]
              })
            })
            const itemData = await marketItemRes.json()

            if (itemData?.result && itemData.result !== "0x") {
              // 🟢 AUTOMATIC UNPACKING: Real string text values parsed natively from memory arrays
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
                creator: String(decoded[8])
              })
            }
          }
          setAllOnChainMarkets(tempMarkets)
        }

        // 2. Check the connected wallet's own DEC membership (controls the
        // "Join DEC" vs "Market Proposals" tab and whether that tab shows at all)
        const decCheckRes = await fetch(rpcUrl, {
          method: "POST",
          headers: req,
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 99,
            method: "eth_call",
            params: [{ to: CONTRACT_ADDRESS, data: iface.encodeFunctionData("isDecMember", [walletAddress]) }, "latest"]
          })
        })
        const decCheckData = await decCheckRes.json()

        let isMember = false
        if (decCheckData?.result && decCheckData.result !== "0x") {
          isMember = iface.decodeFunctionResult("isDecMember", decCheckData.result)[0]
          setHasJoinedDEC(isMember)
        }

        // 3. 🆕 NEW: if the team wallet is connected, pull the FULL DEC member
        // directory (needs the getAllDecMembers() function from the updated contract)
        if (walletAddress.toLowerCase() === ADMIN_ADDRESS) {
          const allMembersRes = await fetch(rpcUrl, {
            method: "POST",
            headers: req,
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 100,
              method: "eth_call",
              params: [{ to: CONTRACT_ADDRESS, data: iface.encodeFunctionData("getAllDecMembers") }, "latest"]
            })
          })
          const allMembersData = await allMembersRes.json()
          if (allMembersData?.result && allMembersData.result !== "0x") {
            const members = iface.decodeFunctionResult("getAllDecMembers", allMembersData.result)[0]
            setBlockchainDecList(Array.from(members as string[]))
          }
        } else {
          setBlockchainDecList(isMember ? [walletAddress] : [])
        }
      } catch (err: any) {
        console.error("Scanning synchronization failure:", err?.message || err)
        // Reads failed for this wallet — most likely it isn't authorized on
        // Interlink's auth gate yet, or its token/refresh flow failed. Check
        // the console error above for the exact RPC response.
      }
    }
    scanBlockchainRegistry()
  }, [walletAddress, historyLogs])

  useEffect(() => {
    if (walletAddress) {
      const savedLogs = localStorage.getItem(`interpredict_logs_${walletAddress.toLowerCase()}`)
      if (savedLogs) setPersistentLogs(JSON.parse(savedLogs))
    }
  }, [walletAddress, historyLogs])

  const getVisibleTabs = (): TabType[] => {
    if (!walletAddress) return ['MarketPlace', 'Pending Markets']
    const tabs: TabType[] = ['MarketPlace']
    if (hasJoinedDEC) tabs.push('Market Proposals')
    else tabs.push('Pending Markets')
    tabs.push('Make Market')
    if (!hasJoinedDEC) tabs.push('Join DEC')
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
    if (!marketDesc || !endDate) return
    const marketEndTimeInSeconds = Math.floor(new Date(endDate).getTime() / 1000)
    const success = await createMarketOnChain(marketDesc, marketEndTimeInSeconds)
    if (success) {
      setMarketDesc('')
      setOutcomes(['YES', 'NO'])
      setMarketImage(null)
    }
  }

  const handleJoinCommitteeSubmit = async () => {
    await joinDecOnChain()
  }

  const executeTradeAction = async (marketId: number, outcomeIndex: number) => {
    if (!walletAddress) return connectWallet()
    await placeBetOnChain(marketId, outcomeIndex, stakeAmount)
  }

  const getTabLabel = (tab: TabType): string => {
    const translationMap: Record<TabType, string> = {
      'MarketPlace': t('marketPlace'),
      'Pending Markets': t('pendingMarkets'),
      'Market Proposals': 'Market Proposals',
      'Make Market': t('makeMarket'),
      'Join DEC': t('joinDec'),
      'History': t('history'),
      'DEC Members': t('adminPanel')
    }
    return translationMap[tab] || tab
  }

  // Pure data parsing tied directly to contract state definitions
  const activeMarkets = allOnChainMarkets.filter(m => m.state === 1)
  const pendingProposals = allOnChainMarkets.filter(m => m.state === 0)

  return (
    <div className="min-h-screen bg-[#060117] text-slate-100 font-sans antialiased overflow-x-hidden pb-12">
      {/* Upper Status Panel */}
      <header className="fixed top-0 inset-x-0 h-20 bg-[#0d0022]/90 backdrop-blur-md border-b border-purple-950/40 z-40 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto h-full flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo className="size-9 rounded-xl" />
            <span className="font-heading text-lg font-bold tracking-tight text-white group-hover:text-primary transition-colors">InterPredict</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
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
            const Icon = { 'MarketPlace': Layers, 'Market Proposals': Hourglass, 'Pending Markets': Hourglass, 'Make Market': PlusCircle, 'Join DEC': Shield, 'History': History, 'DEC Members': Users }[tab]
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
              <div className="grid grid-cols-1 gap-4 w-full">
                {activeMarkets.length === 0 ? (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">No active verified trading markets deployed yet.</div>
                ) : (
                  activeMarkets.map((market) => (
                    <div key={market.id} className="bg-secondary/40 border border-border rounded-xl p-4 sm:p-5 w-full max-w-xl relative">
                      <div className="absolute top-4 right-4 size-12 rounded-xl bg-purple-950/40 border border-purple-900/30 overflow-hidden flex items-center justify-center">
                        {marketImage ? <img src={marketImage} alt="Market" className="size-full object-cover" /> : <Logo className="size-8 rounded-lg" />}
                      </div>
                      <div className="flex justify-between items-center mb-3 pr-14">
                        <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-[10px] font-bold tracking-wider uppercase">Live Pool #{market.id}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{t('statusActive')}</span>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-200 mb-4 leading-snug pr-14">{market.question}</h4>
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

            {/* TAB: MARKET PROPOSALS */}
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
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1.5">{t('votingEndDate')}</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-black/20 border border-purple-900/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary text-slate-200" />
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
          <div className="mt-6 p-4 bg-purple-950/40 border border-purple-500/20 rounded-xl text-xs text-purple-300 font-mono text-center font-semibold">{t('walletSuccessMessage')}</div>
        </section>
      </div>
    </div>
  )
}