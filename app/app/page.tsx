'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '../context/Web3Context'
import { PlusCircle, Layers, Hourglass, Shield, History, Wallet } from 'lucide-react'
import { ethers } from 'ethers'

type TabType = 'MarketPlace' | 'Pending Markets' | 'Make Market' | 'Join DCC' | 'History'

interface MarketType {
  id: number
  description: string
  yesVotes: string
  noVotes: string
  endTime: number
  resolved: boolean
}

const CONTRACT_ADDRESS = "0x244130F9BcaC8642d4213742D837eFD1C2d7B12b"
const CONTRACT_ABI = [
  "function oracleAddress() view returns (address)",
  "function marketCount() view returns (uint256)",
  "function betOnOutcome(uint256 marketId, uint256 outcomeIndex) payable",
  "function claimPayout(uint256 marketId)"
]

export default function DAppPortal() {
  const { walletAddress, connectWallet, txStatus, placeBet } = useWeb3()
  const [activeTab, setActiveTab] = useState<TabType>('MarketPlace')
  const [stakeAmount, setStakeAmount] = useState<string>('0.1')
  const [activeMarkets, setActiveMarkets] = useState<MarketType[]>([])
  const [isLoadingMarkets, setIsLoadingMarkets] = useState<boolean>(false)

  // Make Market Form States
  const [marketDesc, setMarketDesc] = useState('')
  const [outcomes, setOutcomes] = useState(['YES', 'NO'])

  const connectedTabs: TabType[] = ['MarketPlace', 'Pending Markets', 'Make Market', 'Join DCC', 'History']
  const publicTabs: TabType[] = ['MarketPlace', 'Pending Markets']
  const visibleTabs = walletAddress ? connectedTabs : publicTabs

  // On-Chain Event Loop Tracking Hook
  useEffect(() => {
    async function fetchChainData() {
      if (typeof window === 'undefined' || !(window as any).ethereum) return

      try {
        setIsLoadingMarkets(true)
        const provider = new ethers.BrowserProvider((window as any).ethereum)
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)

        // Fetch raw global market size mapping state
        const totalCount = await contract.marketCount()
        const fetched: MarketType[] = []

        // Loop and pull data fields directly from your contract slots
        for (let i = 0; i < Number(totalCount); i++) {
          try {
            // Adjust this function structure call if your Solidity getter uses specific names
            const details = await contract.getMarketDetails(i)
            fetched.push({
              id: i,
              description: details.description || `Prediction Asset Market #${i}`,
              yesVotes: ethers.formatEther(details.yesVotes || 0),
              noVotes: ethers.formatEther(details.noVotes || 0),
              endTime: Number(details.endTime || 0),
              resolved: details.resolved || false
            })
          } catch (err) {
            // Fallback object schema mapping if details requires fine-tuning layout paths
            fetched.push({
              id: i,
              description: `InterPredict Contract Market Pool #${i}`,
              yesVotes: "0.0",
              noVotes: "0.0",
              endTime: 0,
              resolved: false
            })
          }
        }
        setActiveMarkets(fetched)
      } catch (err) {
        console.error("Failed to sync structural testnet parameters:", err)
      } finally {
        setIsLoadingMarkets(false)
      }
    }

    if (walletAddress) {
      fetchChainData()
    }
  }, [walletAddress])

  return (
    <div className="min-h-screen bg-[#0d0022] text-slate-100 font-sans p-4 sm:p-6 selection:bg-purple-500/30">
      {/* Upper Status Panel */}
      <header className="flex flex-col sm:flex-row justify-between items-center max-w-7xl mx-auto border-b border-purple-900/40 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent font-heading tracking-tight">
            InterPredict Terminal
          </h1>
          <p className="text-xs text-slate-400 mt-1">Native Interlink Curation & Settlement Hub</p>
        </div>
        <button
          onClick={connectWallet}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-sm font-semibold rounded-xl tracking-wide transition-all duration-200 glow-purple"
        >
          <Wallet className="size-4" />
          {walletAddress
            ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
            : "Connect Wallet"
          }
        </button>
      </header>

      {/* Main Work Frame Layout */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <aside className="md:col-span-1 flex flex-col gap-1.5">
          {visibleTabs.map((tab) => {
            const Icon = {
              'MarketPlace': Layers,
              'Pending Markets': Hourglass,
              'Make Market': PlusCircle,
              'Join DCC': Shield,
              'History': History
            }[tab]

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-3 text-left px-4 py-3.5 rounded-xl font-medium text-sm transition-all duration-150 ${activeTab === tab
                  ? 'bg-primary text-white font-semibold shadow-md shadow-primary/20'
                  : 'text-slate-400 hover:bg-purple-950/40 hover:text-slate-200'
                  }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{tab === 'Join DCC' ? 'Join DCC Committee' : tab}</span>
              </button>
            )
          })}
        </aside>

        {/* Dynamic Inner Viewport Panel */}
        <section className="md:col-span-3 bg-purple-950/5 border border-purple-900/20 backdrop-blur-xl rounded-2xl p-6 min-h-[550px] flex flex-col justify-between">
          <div className="w-full">

            {/* Tab: MarketPlace */}
            {activeTab === 'MarketPlace' && (
              <div>
                <h2 className="text-xl font-bold mb-1 font-heading">Marketplace Dashboard</h2>
                <p className="text-slate-400 text-xs mb-6">Graduated community proposals live for high-performance trading.</p>

                {isLoadingMarkets ? (
                  <p className="text-sm text-purple-300 font-mono animate-pulse">Querying active on-chain contract registry states...</p>
                ) : activeMarkets.length === 0 ? (
                  <div className="bg-purple-950/20 border border-purple-900/30 rounded-xl p-5 max-w-xl text-center">
                    <p className="text-sm text-slate-400 font-mono">No active trading pools detected on-chain.</p>
                    <p className="text-xs text-slate-500 mt-2">Connect your web3 extension signer or use the &quot;Make Market&quot; utility dashboard to generate your first initialization indices pool parameters.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 max-w-xl">
                    {activeMarkets.map((market) => (
                      <div key={market.id} className="bg-purple-950/20 border border-purple-900/30 rounded-xl p-5">
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-[10px] font-bold tracking-wider uppercase">
                            Live Pool #{market.id}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {market.resolved ? "🔒 Settled" : "⏳ Active Execution"}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold mb-4 text-slate-200">{market.description}</h3>

                        <div className="grid grid-cols-2 gap-4 text-xs font-mono mb-4 text-slate-400 border-t border-purple-950/50 pt-3">
                          <div>YES Liquidity: <span className="text-green-400 font-bold">{market.yesVotes}</span> ITL</div>
                          <div>NO Liquidity: <span className="text-red-400 font-bold">{market.noVotes}</span> ITL</div>
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex-1">
                            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Wager Input Amount (ITL)</label>
                            <input
                              type="number"
                              value={stakeAmount}
                              onChange={(e) => setStakeAmount(e.target.value)}
                              className="w-full bg-purple-950/40 border border-purple-900/50 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                              step="0.01"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => placeBet(market.id, 0, stakeAmount)} className="py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs rounded-lg transition-colors">Predict YES</button>
                          <button onClick={() => placeBet(market.id, 1, stakeAmount)} className="py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition-colors">Predict NO</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Pending Markets */}
            {activeTab === 'Pending Markets' && (
              <div>
                <h2 className="text-xl font-bold mb-1 font-heading">Community Proposal Queues</h2>
                <p className="text-slate-400 text-xs mb-6">Review curation submissions. Stake actions require active DCC registration.</p>

                <div className="bg-purple-950/10 border border-purple-900/20 rounded-xl p-5 max-w-xl opacity-80">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-mono text-purple-400 font-semibold">Validation Query #14</span>
                    <span className="text-[11px] text-yellow-400 font-medium">Curation Phase</span>
                  </div>
                  <p className="text-sm font-medium mb-4 text-slate-300">Will the upcoming Smart Money Framework update introduce automated order-block index definitions natively?</p>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-800/40 text-xs text-purple-300 rounded-lg transition-colors">Vote for Inclusion</button>
                    <button className="flex-1 py-2 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/40 text-xs text-slate-400 rounded-lg transition-colors">Vote Reject</button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Make Market */}
            {activeTab === 'Make Market' && (
              <div className="max-w-xl">
                <h2 className="text-xl font-bold mb-1 font-heading">Initialize Liquidity Pool</h2>
                <p className="text-slate-400 text-xs mb-6">Propose custom prediction structures by posting standard collateral logic variables.</p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">Market Objective / Description</label>
                    <textarea
                      placeholder="e.g., Will Bitcoin settle above $120,000 on the global macro index deadline?"
                      value={marketDesc}
                      onChange={(e) => setMarketDesc(e.target.value)}
                      className="w-full min-h-[90px] bg-purple-950/40 border border-purple-900/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary Richmond-override resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1.5">Outcome Index 0</label>
                      <input type="text" disabled value={outcomes[0]} className="w-full bg-purple-950/20 border border-purple-900/30 rounded-xl px-3 py-2 text-sm text-slate-500 font-mono cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1.5">Outcome Index 1</label>
                      <input type="text" disabled value={outcomes[1]} className="w-full bg-purple-950/20 border border-purple-900/30 rounded-xl px-3 py-2 text-sm text-slate-500 font-mono cursor-not-allowed" />
                    </div>
                  </div>
                  <button className="w-full py-3 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-primary/10 mt-2">
                    Submit Proposal (Requires 1.0 Collateral ITL)
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Join DCC */}
            {activeTab === 'Join DCC' && (
              <div className="max-w-xl">
                <h2 className="text-xl font-bold mb-1 font-heading">Decentralized Curation Committee</h2>
                <p className="text-slate-400 text-xs mb-6">Stake core token variables to join the high-tier validation filter.</p>

                <div className="p-6 bg-gradient-to-br from-purple-950/20 to-indigo-950/20 border border-purple-900/30 rounded-xl text-center">
                  <Shield className="size-10 mx-auto text-primary mb-3" />
                  <p className="text-sm font-semibold mb-1 text-slate-200">Activate Assessor Access Permissions</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">Lock a fixed minimum of 500 protocol tokens to access vote metrics on all outstanding community market requests.</p>
                  <button className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl transition-colors">
                    Lock Stake & Join Committee
                  </button>
                </div>
              </div>
            )}

            {/* Tab: History */}
            {activeTab === 'History' && (
              <div>
                <h2 className="text-xl font-bold mb-1 font-heading">Account Settlement History</h2>
                <p className="text-slate-400 text-xs mb-6">Tracks previous positions, oracle logs, and direct yield settlements.</p>

                <div className="border border-purple-900/20 rounded-xl overflow-hidden text-xs">
                  <div className="grid grid-cols-4 bg-purple-950/30 px-4 py-3 font-semibold text-slate-400 border-b border-purple-900/20">
                    <div>Market ID</div>
                    <div>Prediction</div>
                    <div>Stake</div>
                    <div className="text-right">Result</div>
                  </div>
                  <div className="p-4 text-center text-slate-500 font-mono">
                    No historic ledger records detected for this address channel.
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
      </main>
    </div>
  )
}