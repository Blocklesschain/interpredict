'use client'

import { useState } from 'react'
import { useWeb3 } from '../context/Web3Context'
import { Layers, Hourglass, PlusCircle, Shield, History, Wallet, Home, Menu, X, LogOut, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/logo'
import Link from 'next/link'

type TabType = 'MarketPlace' | 'Market Proposals' | 'Pending Markets' | 'Make Market' | 'Join DEC' | 'History'

export default function DAppPortal() {
  const { walletAddress, connectWallet, disconnectWallet, txStatus, historyLogs, createMarketOnChain, joinDecOnChain, castVoteOnChain, placeBetOnChain } = useWeb3()
  const [activeTab, setActiveTab] = useState<TabType>('MarketPlace')
  const [stakeAmount, setStakeAmount] = useState<string>('0.1')
  const [marketDesc, setMarketDesc] = useState('')
  const [outcomes, setOutcomes] = useState(['YES', 'NO'])
  const [hasJoinedDEC, setHasJoinedDEC] = useState<boolean>(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false)

  const getVisibleTabs = (): TabType[] => {
    if (!walletAddress) return ['MarketPlace', 'Pending Markets']
    const tabs: TabType[] = ['MarketPlace']
    if (hasJoinedDEC) tabs.push('Market Proposals')
    else tabs.push('Pending Markets')
    tabs.push('Make Market')
    if (!hasJoinedDEC) tabs.push('Join DEC')
    tabs.push('History')
    return tabs
  }

  const visibleTabs = getVisibleTabs()

  const handleTabSelect = (tab: TabType) => {
    setActiveTab(tab)
    setMobileMenuOpen(false)
  }

  const handleCreateMarketSubmit = async () => {
    if (!marketDesc) return
    const success = await createMarketOnChain(marketDesc)
    if (success) setMarketDesc('')
  }

  const handleJoinCommitteeSubmit = async () => {
    const success = await joinDecOnChain()
    if (success) {
      setHasJoinedDEC(true)
      setActiveTab('Market Proposals')
    }
  }

  // 🛡️ Wallet Connection Security Guard & Trade Routing Engine
  const executeTradeAction = async (marketId: number, outcomeIndex: number) => {
    if (!walletAddress) {
      await connectWallet()
      return
    }
    await placeBetOnChain(marketId, outcomeIndex, stakeAmount)
  }

  return (
    <div className="min-h-screen bg-[#060117] text-slate-100 font-sans antialiased overflow-x-hidden pb-12">
      {/* Upper Status Panel */}
      <header className="fixed top-0 inset-x-0 h-20 bg-[#0d0022]/90 backdrop-blur-md border-b border-purple-950/40 z-40 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto h-full flex justify-between items-center">

          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo className="size-9 rounded-xl" />
            <span className="font-heading text-lg font-bold tracking-tight text-white group-hover:text-primary transition-colors">
              InterPredict
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/" className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mr-2">
              <Home className="size-3.5" />
              <span className="hidden sm:inline">Home</span>
            </Link>

            {walletAddress ? (
              <div className="flex items-center bg-purple-950/30 border border-purple-900/40 rounded-full pr-1.5 pl-4 py-1.5 gap-3">
                <span className="font-mono text-xs text-purple-300">{`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}</span>
                <button
                  onClick={disconnectWallet}
                  className="p-2 bg-purple-900/40 hover:bg-rose-950/40 rounded-full text-slate-400 hover:text-rose-400 transition-colors"
                  title="Disconnect Wallet"
                >
                  <LogOut className="size-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-xs sm:text-sm font-semibold rounded-full border border-purple-500/20 shadow-lg"
              >
                <Wallet className="size-3.5" />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Responsive Frame Layout */}
      <div className="max-w-7xl mx-auto pt-28 px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">

        {/* Mobile menu panel dropdown container block */}
        <div className="lg:hidden w-full relative z-30">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full flex items-center justify-between bg-secondary/20 border border-secondary/30 rounded-xl px-4 py-3 text-sm font-semibold text-slate-200"
          >
            <div className="flex items-center gap-2">
              <Menu className="size-4 text-primary" />
              <span>{activeTab}</span>
            </div>
            {mobileMenuOpen ? <X className="size-4" /> : <ArrowRight className="size-4 rotate-90" />}
          </button>

          {mobileMenuOpen && (
            <div className="absolute top-full inset-x-0 mt-2 bg-[#0d0022] border border-purple-950/80 rounded-xl p-2 shadow-2xl space-y-1 z-50">
              {visibleTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabSelect(tab)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-primary text-white' : 'text-slate-400 hover:bg-purple-950/40'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Sidebar Navigation Panels */}
        <aside className="hidden lg:flex flex-col gap-1.5 lg:col-span-1">
          {visibleTabs.map((tab) => {
            const Icon = { 'MarketPlace': Layers, 'Market Proposals': Hourglass, 'Pending Markets': Hourglass, 'Make Market': PlusCircle, 'Join DEC': Shield, 'History': History }[tab]
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2.5 px-4 py-3.5 rounded-xl font-semibold text-sm border transition-all ${activeTab === tab ? 'bg-primary text-white border-primary/50 shadow-md' : 'text-slate-400 border-transparent hover:bg-secondary/40'
                  }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{tab}</span>
              </button>
            )
          })}
        </aside>

        {/* Dynamic Display Panel Viewport */}
        <section className="lg:col-span-3 bg-secondary/10 border border-secondary/20 rounded-2xl p-5 sm:p-6 min-h-[500px] flex flex-col justify-between shadow-inner w-full overflow-hidden">
          <div className="w-full">
            <div className="mb-6 border-b border-purple-950/40 pb-5">
              <h2 className="text-lg sm:text-xl font-bold font-heading">InterPredict dApp</h2>
              {/* 🌟 Fixed: Removed uppercase tracking class so that tagline uses premiumTitle Case format */}
              <p className="text-purple-400 text-[10px] sm:text-xs font-semibold tracking-wide mt-1">
                Create the Market | Predict the Future | Earn from the Outcome
              </p>
            </div>

            {/* TAB: MARKETPLACE */}
            {activeTab === 'MarketPlace' && (
              <div className="space-y-4">
                <div className="bg-secondary/40 border border-border rounded-xl p-4 sm:p-5 w-full max-w-xl">
                  <div className="flex justify-between items-center mb-3">
                    <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-[10px] font-bold tracking-wider uppercase">Live Pool #0</span>
                    <span className="text-[11px] text-slate-400 font-mono">Status: Active</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-200 mb-4 leading-snug">Will Interlink network testnet gateway process over 10M transactions this week?</h4>
                  <div className="mb-4">
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Wager Amount (ITL)</label>
                    <input type="number" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} className="w-full bg-black/20 border border-purple-900/40 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => executeTradeAction(0, 0)} className="py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs rounded-lg shadow-md hover:scale-[1.01] transition-transform">Predict YES</button>
                    <button onClick={() => executeTradeAction(0, 1)} className="py-2.5 bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold text-xs rounded-lg shadow-md hover:scale-[1.01] transition-transform">Predict NO</button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PENDING MARKETS */}
            {activeTab === 'Pending Markets' && (
              <div className="bg-secondary/20 border border-border rounded-xl p-4 sm:p-5 w-full max-w-xl">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-mono text-purple-400 font-bold">Query Index #14</span>
                  <span className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded font-bold uppercase">In Voting Phase</span>
                </div>
                <p className="text-sm font-medium mb-5 text-slate-300 leading-normal">Will the upcoming Smart Money Concepts indicator update introduce automated mitigation mapping?</p>
                <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-purple-950/40">
                  <div>
                    <div className="flex justify-between text-[11px] font-mono mb-1 text-slate-400"><span>DEC Committee FOR</span><span className="text-emerald-400 font-bold">72%</span></div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full" style={{ width: '72%' }} /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-mono mb-1 text-slate-400"><span>DEC Committee AGAINST</span><span className="text-rose-400 font-bold">28%</span></div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden"><div className="bg-rose-500 h-full" style={{ width: '28%' }} /></div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: MARKET PROPOSALS */}
            {activeTab === 'Market Proposals' && (
              <div className="bg-secondary/30 border border-purple-500/20 rounded-xl p-4 sm:p-5 w-full max-w-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-mono text-primary font-bold">Proposal #14</span>
                  <span className="text-[11px] font-mono text-yellow-400">Time Left: 23h 58m</span>
                </div>
                <p className="text-sm font-semibold mb-4 text-slate-200">Will the upcoming Smart Money Concepts indicator update introduce automated mitigation mapping?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => castVoteOnChain(14, true)} className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm">Vote FOR (Graduate)</button>
                  <button onClick={() => castVoteOnChain(14, false)} className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm">Vote AGAINST (Reject)</button>
                </div>
              </div>
            )}

            {/* TAB: MAKE MARKET */}
            {activeTab === 'Make Market' && (
              <div className="space-y-4 w-full max-w-xl">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1.5">Market Objective Statement</label>
                  <textarea placeholder="e.g., Will Bitcoin settle above $120,000 on the global macro index deadline?" value={marketDesc} onChange={(e) => setMarketDesc(e.target.value)} className="w-full min-h-[90px] bg-black/20 border border-purple-900/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">Outcome Index 0</label>
                    <input type="text" disabled value={outcomes[0]} className="w-full bg-slate-900/40 border border-purple-900/20 rounded-xl px-3 py-2 text-sm text-slate-500 font-mono" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">Outcome Index 1</label>
                    <input type="text" disabled value={outcomes[1]} className="w-full bg-slate-900/40 border border-purple-900/20 rounded-xl px-3 py-2 text-sm text-slate-500 font-mono" />
                  </div>
                </div>
                <button onClick={handleCreateMarketSubmit} className="w-full py-3 bg-gradient-to-r from-primary to-purple-600 text-white text-xs font-bold rounded-xl shadow-md hover:opacity-95 transition-opacity">
                  {walletAddress?.toLowerCase() === "0x6e832252ea4c78068ee109d953724d2762431992" ? "Deploy Straight to Marketplace (Team Bypass)" : "Broadcast Proposal to DEC (1.0 tITL Fee)"}
                </button>
              </div>
            )}

            {/* TAB: JOIN DEC */}
            {activeTab === 'Join DEC' && (
              <div className="p-6 bg-gradient-to-br from-purple-950/20 to-indigo-950/20 border border-purple-900/30 rounded-xl text-center w-full max-w-xl">
                <Shield className="size-10 mx-auto text-primary mb-3" />
                <p className="text-sm font-semibold mb-1 text-slate-200">Activate Assessor Access Permissions</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">Lock a permanent security validation stake of 500 tITL to access vote metrics on all outstanding community market requests.</p>
                <button onClick={handleJoinCommitteeSubmit} className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl shadow-md transition-all">Lock Stake & Join DEC Committee</button>
              </div>
            )}

            {/* TAB: HISTORY */}
            {activeTab === 'History' && (
              <div className="space-y-4 w-full">
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3 font-mono">
                  ● Real-Time On-Chain Transaction Ledger
                </h4>

                {historyLogs.length === 0 ? (
                  <div className="p-8 border border-dashed border-purple-900/30 rounded-xl text-center text-slate-500 font-mono text-xs">
                    No transactions executed during this session interface loop yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyLogs.map((log) => (
                      <div key={log.id} className="bg-black/30 border border-purple-950/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold bg-purple-950 border border-purple-900 px-2 py-0.5 rounded text-purple-300">
                              {log.type}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">{log.timestamp}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-200 leading-snug">{log.description}</p>
                          <p className="text-xs text-slate-400 font-mono">{log.detail}</p>
                        </div>

                        <div className="shrink-0 sm:text-right">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase border ${log.status === 'Success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            }`}>
                            ● {log.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {txStatus && <div className="mt-6 p-4 bg-purple-950/40 border border-purple-500/20 rounded-xl text-xs text-purple-300 font-mono animate-pulse">{txStatus}</div>}
        </section>
      </div>

      {/* --- WORKSPACE FOOTER --- */}
      <footer className="max-w-7xl mx-auto border-t border-purple-900/10 mt-16 py-6 px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-6">
        <div className="text-center md:text-left">
          <p>© 2026 InterPredict Protocol. All rights reserved.</p>
        </div>

        <div className="flex items-center gap-5 shrink-0 bg-background/40 px-5 py-3 rounded-full border border-purple-900/20 shadow-inner">
          <a href="https://twitter.com/InterPredict" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1.5 font-semibold text-slate-300" title="Twitter Updates">
            <svg className="size-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            <span>Twitter</span>
          </a>
          <span className="w-px h-3.5 bg-purple-900/30" />
          <a href="https://t.me/InterPredict" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1.5 font-semibold text-slate-300" title="Telegram Messenger">
            <svg className="size-4 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.961 6.505-1.359 8.641-.168.9-.501 1.201-.82 1.23-.703.064-1.237-.465-1.917-.912-1.065-.7-1.666-1.134-2.698-1.814-1.194-.786-.42-1.218.26-1.926.178-.184 3.279-3.008 3.339-3.264.008-.033.014-.154-.059-.219-.073-.064-.18-.042-.258-.025-.111.024-1.884 1.196-5.319 3.518-.503.346-.959.516-1.367.507-.45-.01-1.317-.254-1.961-.464-.79-.258-1.418-.394-1.363-.833.028-.23.347-.465.955-.705 3.733-1.623 6.222-2.694 7.467-3.213 3.543-1.479 4.28-1.736 4.761-1.745.106-.002.344.025.497.15.13.105.166.248.178.349.012.106.027.34-.01.597z" /></svg>
            <span>Telegram</span>
          </a>
          <span className="w-px h-3.5 bg-purple-900/30" />
          <a href="https://interlinklabs.ai" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-2 font-semibold text-slate-300"><img src="/images/interlink.png" alt="Interlink Logo" className="size-4 object-contain rounded-sm" /><span>Interlink</span></a>
        </div>
      </footer>
    </div>
  )
}