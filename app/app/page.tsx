'use client'

import { useState } from 'react'
import { useWeb3 } from '../context/Web3Context'
import { Layers, Hourglass, PlusCircle, Shield, History, Wallet, Home } from 'lucide-react'
import { Logo } from '@/components/logo'
import Link from 'next/link'

type TabType = 'MarketPlace' | 'Market Proposals' | 'Pending Markets' | 'Make Market' | 'Join DEC' | 'History'

export default function DAppPortal() {
  const { walletAddress, connectWallet, txStatus, placeBet } = useWeb3()
  const [activeTab, setActiveTab] = useState<TabType>('MarketPlace')
  const [stakeAmount, setStakeAmount] = useState<string>('0.1')
  const [marketDesc, setMarketDesc] = useState('')
  const [outcomes, setOutcomes] = useState(['YES', 'NO'])
  const [hasJoinedDEC, setHasJoinedDEC] = useState<boolean>(false)

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

  return (
    <div className="min-h-screen bg-[#060117] text-slate-100 font-sans antialiased selection:bg-purple-500/30 overflow-x-hidden">
      {/* Upper Status Panel */}
      <header className="fixed top-0 inset-x-0 h-20 bg-[#0d0022]/90 backdrop-blur-md border-b border-purple-950/40 z-40 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto h-full flex justify-between items-center">

          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo className="size-9 rounded-xl" />
            <span className="font-heading text-lg font-bold tracking-tight text-white group-hover:text-primary transition-colors">
              InterPredict
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/" className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
              <Home className="size-3.5" />
              <span className="hidden sm:inline">Home</span>
            </Link>

            <button
              onClick={connectWallet}
              className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-xs sm:text-sm font-semibold rounded-full border border-purple-500/20 shadow-lg transition-all active:scale-[0.98]"
            >
              <Wallet className="size-3.5 sm:size-4" />
              {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connect Wallet"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Responsive Layout Workspace Frame */}
      <div className="max-w-7xl mx-auto pt-28 pb-12 px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">

        <aside className="lg:col-span-1 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 lg:overflow-x-visible scrollbar-none shrink-0 horizontal-scroll-fix">
          {visibleTabs.map((tab) => {
            const Icon = { 'MarketPlace': Layers, 'Market Proposals': Hourglass, 'Pending Markets': Hourglass, 'Make Market': PlusCircle, 'Join DEC': Shield, 'History': History }[tab]
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2.5 whitespace-nowrap px-4 py-3 rounded-xl font-semibold text-xs sm:text-sm border transition-all shrink-0 ${activeTab === tab ? 'bg-primary text-white border-primary/50 shadow-md' : 'text-slate-400 border-transparent hover:bg-secondary/40'
                  }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{tab}</span>
              </button>
            )
          })}
        </aside>

        {/* Dynamic Display Panel */}
        <section className="lg:col-span-3 bg-secondary/10 border border-secondary/20 rounded-2xl p-5 sm:p-6 min-h-[500px] flex flex-col justify-between shadow-inner w-full overflow-hidden">
          <div className="w-full">
            <div className="mb-6 border-b border-purple-950/40 pb-5">
              <h2 className="text-lg sm:text-xl font-bold font-heading">InterPredict dApp</h2>
              <p className="text-purple-400 text-[10px] sm:text-xs font-semibold tracking-wide mt-1 uppercase">
                Create The Market | Predict The Future | Earn from the Outcome
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
                    <button onClick={() => placeBet(0, 0, stakeAmount)} className="py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs rounded-lg shadow-md">Predict YES</button>
                    <button onClick={() => placeBet(0, 1, stakeAmount)} className="py-2.5 bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold text-xs rounded-lg shadow-md">Predict NO</button>
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
                  <button className="py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg">Vote FOR</button>
                  <button className="py-2.5 bg-rose-600 text-white text-xs font-bold rounded-lg">Vote AGAINST</button>
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
                <button className="w-full py-3 bg-gradient-to-r from-primary to-purple-600 text-white text-xs font-bold rounded-xl shadow-md">
                  {walletAddress?.toLowerCase() === "0x6e832252ea4c78068ee109d953724d2762431992" ? "Deploy Straight to Marketplace" : "Broadcast Proposal to DEC (1.0 tITL Fee)"}
                </button>
              </div>
            )}

            {/* TAB: JOIN DEC */}
            {activeTab === 'Join DEC' && (
              <div className="p-6 bg-gradient-to-br from-purple-950/20 to-indigo-950/20 border border-purple-900/30 rounded-xl text-center w-full max-w-xl">
                <Shield className="size-10 mx-auto text-primary mb-3" />
                <p className="text-sm font-semibold mb-1 text-slate-200">Activate Assessor Access Permissions</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">Lock a permanent security validation stake of 500 tITL to access vote metrics on all outstanding community market requests.</p>
                <button onClick={() => { setHasJoinedDEC(true); setActiveTab('Market Proposals'); }} className="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow-md">Lock Stake & Join DEC Committee</button>
              </div>
            )}

            {/* TAB: HISTORY */}
            {activeTab === 'History' && (
              <div className="border border-purple-900/20 rounded-xl overflow-x-auto text-xs w-full">
                <div className="min-w-[400px]">
                  <div className="grid grid-cols-4 bg-purple-950/30 px-4 py-3.5 font-semibold text-slate-400 border-b border-purple-900/20">
                    <div>Market ID</div><div>Prediction</div><div>Bond Stake</div><div className="text-right">Ledger Status</div>
                  </div>
                  <div className="p-5 text-center text-slate-500 font-mono">No historical records found.</div>
                </div>
              </div>
            )}

          </div>

          {txStatus && <div className="mt-6 p-4 bg-purple-950/40 border border-purple-500/20 rounded-xl text-xs text-purple-300 font-mono animate-pulse">{txStatus}</div>}
        </section>
      </div>

      <footer className="max-w-7xl mx-auto border-t border-purple-900/10 mt-16 py-6 px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
        <p>© 2026 InterPredict Protocol. All rights reserved.</p>
        <div className="flex gap-6 font-medium">
          <a href="https://twitter.com/InterPredict" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Twitter Updates</a>
          <a href="https://t.me/InterPredict" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Telegram</a>
          <a href="https://interlinklabs.ai" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Interlink Hub</a>
        </div>
      </footer>
    </div>
  )
}