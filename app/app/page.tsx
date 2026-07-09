'use client'

import { useState } from 'react'
import { useWeb3 } from '../context/Web3Context'
import { Layers, Hourglass, PlusCircle, Shield, History, Wallet, Home } from 'lucide-react'
import Link from 'next/link'

type TabType = 'MarketPlace' | 'Market Proposals' | 'Pending Markets' | 'Make Market' | 'Join DEC' | 'History'

export default function DAppPortal() {
  const { walletAddress, connectWallet, txStatus, placeBet } = useWeb3()
  const [activeTab, setActiveTab] = useState<TabType>('MarketPlace')
  const [stakeAmount, setStakeAmount] = useState<string>('0.1')

  // Make Market Form States
  const [marketDesc, setMarketDesc] = useState('')
  const [outcomes, setOutcomes] = useState(['YES', 'NO'])

  // Simulated variable to check if user has joined the DEC committee
  const [hasJoinedDEC, setHasJoinedDEC] = useState<boolean>(false)

  // Tab Access Guard Logic
  const getVisibleTabs = (): TabType[] => {
    if (!walletAddress) {
      return ['MarketPlace', 'Pending Markets']
    }

    const tabs: TabType[] = ['MarketPlace']

    if (hasJoinedDEC) {
      tabs.push('Market Proposals')
    } else {
      tabs.push('Pending Markets')
    }

    tabs.push('Make Market')

    if (!hasJoinedDEC) {
      tabs.push('Join DEC')
    }

    tabs.push('History')
    return tabs
  }

  const visibleTabs = getVisibleTabs()

  return (
    <div className="min-h-screen bg-[#060117] text-slate-100 font-sans antialiased selection:bg-purple-500/30">
      {/* Upper Status Panel */}
      <header className="fixed top-0 inset-x-0 h-20 bg-[#0d0022]/80 backdrop-blur-md border-b border-purple-950/40 z-40 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto h-full flex justify-between items-center">

          {/* Logo links back to the website homepage */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="size-9 bg-gradient-to-tr from-primary to-purple-600 rounded-xl glow-purple" />
            <span className="font-heading text-lg font-bold tracking-tight text-white group-hover:text-primary transition-colors">
              InterPredict
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {/* Explicit Home Button */}
            <Link
              href="/"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <Home className="size-3.5" />
              <span>Home</span>
            </Link>

            <button
              onClick={connectWallet}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-sm font-semibold rounded-full border border-purple-500/20 shadow-lg shadow-purple-600/10 transition-all active:scale-[0.98]"
            >
              <Wallet className="size-4" />
              {walletAddress
                ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                : "Connect Wallet"
              }
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame Layout */}
      <div className="max-w-7xl mx-auto pt-28 px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">

        {/* Navigation Sidebar */}
        <aside className="md:col-span-1 flex flex-col gap-1.5">
          {visibleTabs.map((tab) => {
            const Icon = {
              'MarketPlace': Layers,
              'Market Proposals': Hourglass,
              'Pending Markets': Hourglass,
              'Make Market': PlusCircle,
              'Join DEC': Shield,
              'History': History
            }[tab]

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-3 text-left px-4 py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all duration-150 border ${activeTab === tab
                  ? 'bg-primary text-white border-primary/50 shadow-md shadow-primary/10'
                  : 'text-slate-400 border-transparent hover:bg-secondary/40 hover:text-foreground'
                  }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{tab}</span>
              </button>
            )
          })}
        </aside>

        {/* Dynamic Inner Viewport Panel */}
        <section className="md:col-span-3 bg-secondary/10 border border-secondary/20 rounded-2xl p-6 min-h-[550px] flex flex-col justify-between shadow-inner">
          <div className="w-full">

            {/* Header Identity Layout */}
            <div className="mb-8 border-b border-purple-950/40 pb-5">
              <h2 className="text-xl font-bold font-heading bg-gradient-to-r from-purple-200 to-slate-200 bg-clip-text text-transparent">
                InterPredict dApp
              </h2>
              <p className="text-purple-400 text-xs font-semibold tracking-wide mt-1 uppercase">
                Create The Market | Predict The Future | Earn from the Outcome
              </p>
            </div>

            {/* TAB: MARKETPLACE */}
            {activeTab === 'MarketPlace' && (
              <div>
                <h3 className="text-base font-bold mb-1">Active Trading Pools</h3>
                <p className="text-slate-400 text-xs mb-6">Graduated community proposals live for high-performance volume trading.</p>

                <div className="bg-secondary/40 border border-border rounded-xl p-5 max-w-xl">
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-[10px] font-bold tracking-wider uppercase">Live Pool #0</span>
                    <span className="text-[11px] text-slate-400 font-mono">Status: Active</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-200 mb-4">Will Interlink network testnet gateway process over 10M transactions this week?</h4>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Wager Amount (ITL)</label>
                      <input
                        type="number"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        className="w-full bg-black/20 border border-purple-900/40 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => placeBet(0, 0, stakeAmount)} className="py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-emerald-900/20">Predict YES</button>
                    <button onClick={() => placeBet(0, 1, stakeAmount)} className="py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-rose-900/20">Predict NO</button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PENDING MARKETS */}
            {activeTab === 'Pending Markets' && (
              <div>
                <h3 className="text-base font-bold mb-1">Pending Markets Verification</h3>
                <p className="text-slate-400 text-xs mb-6">Public display of community proposal pools currently undergoing curation assessment checks.</p>

                <div className="bg-secondary/20 border border-border rounded-xl p-5 max-w-xl">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-mono text-purple-400 font-bold">Query Index #14</span>
                    <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-purple-300 uppercase tracking-wider font-bold">In Voting Phase</span>
                  </div>
                  <p className="text-sm font-medium mb-5 text-slate-300">Will the upcoming Smart Money Concepts indicator update introduce automated mitigation mapping?</p>

                  <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-purple-950/40">
                    <div>
                      <div className="flex justify-between text-[11px] font-mono mb-1 text-slate-400">
                        <span>DEC Committee FOR (Pass)</span>
                        <span className="text-emerald-400 font-bold">72%</span>
                      </div>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: '72%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-mono mb-1 text-slate-400">
                        <span>DEC Committee AGAINST (Reject)</span>
                        <span className="text-rose-400 font-bold">28%</span>
                      </div>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full" style={{ width: '28%' }} />
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-center text-slate-500 mt-4 font-mono">⚠️ Non-DEC members are restricted to viewing progress metrics only.</p>
                </div>
              </div>
            )}

            {/* TAB: MARKET PROPOSALS */}
            {activeTab === 'Market Proposals' && (
              <div>
                <h3 className="text-base font-bold mb-1">Active DEC Evaluation Board</h3>
                <p className="text-slate-400 text-xs mb-6">Cast your validation ballot within the 24-hour window to settle graduate matrices.</p>

                <div className="bg-secondary/30 border border-purple-500/20 rounded-xl p-5 max-w-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-mono text-primary font-bold">Proposal #14</span>
                    <span className="text-[11px] font-mono text-yellow-400">Time Left: 23h 58m</span>
                  </div>
                  <p className="text-sm font-semibold mb-4 text-slate-200">Will the upcoming Smart Money Concepts indicator update introduce automated mitigation mapping?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors">Vote FOR (Graduate)</button>
                    <button className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors">Vote AGAINST (Reject)</button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: MAKE MARKET */}
            {activeTab === 'Make Market' && (
              <div className="max-w-xl">
                <h3 className="text-base font-bold mb-1">Initialize Liquidity Pool</h3>
                <p className="text-slate-400 text-xs mb-6">Deploy a predictive asset module. Team wallets execute immediate live parameters bypassing constraints.</p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">Market Objective Statement</label>
                    <textarea
                      placeholder="e.g., Will Bitcoin settle above $120,000 on the global macro index deadline?"
                      value={marketDesc}
                      onChange={(e) => setMarketDesc(e.target.value)}
                      className="w-full min-h-[90px] bg-black/20 border border-purple-900/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary Richmond-override resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1.5">Outcome Index 0</label>
                      <input type="text" disabled value={outcomes[0]} className="w-full bg-slate-900/40 border border-purple-900/20 rounded-xl px-3 py-2 text-sm text-slate-500 font-mono cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1.5">Outcome Index 1</label>
                      <input type="text" disabled value={outcomes[1]} className="w-full bg-slate-900/40 border border-purple-900/20 rounded-xl px-3 py-2 text-sm text-slate-500 font-mono cursor-not-allowed" />
                    </div>
                  </div>

                  <button className="w-full py-3 bg-gradient-to-r from-primary to-purple-600 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-[0.99]">
                    {walletAddress?.toLowerCase() === "0x6e832252ea4c78068ee109d953724d2762431992"
                      ? "Deploy Straight to Marketplace (Team Address Bypass)"
                      : "Broadcast Proposal to DEC (Requires 1.0 tITL Bond Fee)"
                    }
                  </button>
                </div>
              </div>
            )}

            {/* TAB: JOIN DEC */}
            {activeTab === 'Join DEC' && (
              <div className="max-w-xl">
                <h3 className="text-base font-bold mb-1">Decentralized Curation Committee</h3>
                <p className="text-slate-400 text-xs mb-6">Bond protocol capital assets to register your node into the validation layer.</p>

                <div className="p-6 bg-gradient-to-br from-purple-950/20 to-indigo-950/20 border border-purple-900/30 rounded-xl text-center">
                  <Shield className="size-10 mx-auto text-primary mb-3" />
                  <p className="text-sm font-semibold mb-1 text-slate-200">Activate Assessor Access Permissions</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">Lock a permanent security validation stake of 500 tITL to access vote metrics on all outstanding community market requests.</p>

                  <button
                    onClick={() => {
                      setHasJoinedDEC(true);
                      setActiveTab('Market Proposals');
                    }}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-primary/20"
                  >
                    Lock Stake & Join DEC Committee
                  </button>
                </div>
              </div>
            )}

            {/* TAB: HISTORY */}
            {activeTab === 'History' && (
              <div>
                <h3 className="text-base font-bold mb-1">Account Settlement Payouts</h3>
                <p className="text-slate-400 text-xs mb-6">Tracks closed trade options, claimable oracle margins, and historical yields.</p>

                <div className="border border-purple-900/20 rounded-xl overflow-hidden text-xs">
                  <div className="grid grid-cols-4 bg-purple-950/30 px-4 py-3.5 font-semibold text-slate-400 border-b border-purple-900/20">
                    <div>Market ID</div>
                    <div>Prediction Selection</div>
                    <div>Bond Stake</div>
                    <div className="text-right">Ledger Status</div>
                  </div>
                  <div className="p-5 text-center text-slate-500 font-mono">
                    No matching historic settlement logs identified on this address channel.
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Action Notification Feed */}
          {txStatus && (
            <div className="mt-6 p-4 bg-purple-950/40 border border-purple-500/20 rounded-xl text-xs text-purple-300 font-medium font-mono tracking-wide animate-pulse">
              {txStatus}
            </div>
          )}
        </section>
      </div>

      {/* Footer Interface */}
      <footer className="max-w-7xl mx-auto border-t border-purple-900/10 mt-28 py-6 px-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
        <p>© 2026 InterPredict Protocol. All rights reserved.</p>
        <div className="flex gap-6 font-medium">
          <a href="https://twitter.com/CryptoDailyCall" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Twitter Signals</a>
          <a href="https://github.com/Blocklesschain" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">GitHub Repository</a>
          <a href="https://interlinklabs.ai" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Interlink Hub</a>
        </div>
      </footer>
    </div>
  )
}