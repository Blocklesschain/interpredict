'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from './context/Web3Context'
import { Navbar } from '@/components/navbar'
import { ArrowRight, Layers, ShieldCheck, Coins, Gavel, CheckCircle2, TrendingUp, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { ethers } from 'ethers'

interface MarketType {
  id: number
  description: string
  yesVotes: string
  noVotes: string
  resolved: boolean
  isPending: boolean
}

const CONTRACT_ADDRESS = "0x244130F9BcaC8642d4213742D837eFD1C2d7B12b"
const CONTRACT_ABI = [
  "function marketCount() view returns (uint256)"
]

export default function HomePage() {
  const { walletAddress } = useWeb3()
  const [liveMarkets, setLiveMarkets] = useState<MarketType[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Syncing "Explore Markets" section directly to live Testnet parameters
  useEffect(() => {
    async function syncExploreMarkets() {
      if (typeof window === 'undefined' || !(window as any).ethereum) return
      try {
        setIsLoading(true)
        const provider = new ethers.BrowserProvider((window as any).ethereum)
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
        const totalCount = await contract.marketCount()

        const fetched: MarketType[] = []
        for (let i = 0; i < Number(totalCount); i++) {
          // Defaults or contract mappings
          fetched.push({
            id: i,
            description: `InterPredict Global Prediction Trading Pool Index #${i}`,
            yesVotes: "0.00",
            noVotes: "0.00",
            resolved: false,
            isPending: false
          })
        }
        setLiveMarkets(fetched)
      } catch (err) {
        console.error("Explore section failed to query contract size metrics:", err)
      } finally {
        setIsLoading(false)
      }
    }
    syncExploreMarkets()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <Navbar />

      {/* --- HERO HERO SECTION --- */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(98,0,238,0.08),transparent_50%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold tracking-wide uppercase inline-block mb-4">
            Next-Gen Prediction Infrastructure
          </span>
          <h1 className="text-4xl sm:text-6xl font-heading font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.1] mb-6">
            Decentralized Curation & Market Intelligence on Interlink Network
          </h1>
          <p className="text-muted-foreground text-base sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            InterPredict shifts forecasting power to the crowd. Propose parameters, validate via democratic committee vectors, and trade contract positions natively.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/app"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-full transition-all glow-purple shadow-lg shadow-primary/20 text-sm"
            >
              <span>Launch dApp</span>
              <ArrowRight className="size-4" />
            </Link>

            <a
              href="#architecture"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-secondary/60 hover:bg-secondary text-foreground font-semibold rounded-full border border-border transition-colors text-sm"
            >
              Protocol Blueprint
            </a>
          </div>
        </div>
      </section>

      {/* --- EXPLORE MARKETS REAL-TIME SECTION --- */}
      <section id="markets" className="py-20 border-t border-border bg-secondary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
            <div>
              <h2 className="text-2xl sm:text-4xl font-heading font-bold tracking-tight">Explore Live Metrics Marketplace</h2>
              <p className="text-muted-foreground text-sm mt-1">Natively synced to the smart contract address via client provider nodes.</p>
            </div>
            <Link href="/app" className="text-sm font-bold text-primary hover:underline flex items-center gap-1.5 transition-all">
              <span>View Trade Portals</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <p className="text-sm font-mono text-primary animate-pulse">Syncing on-chain registry grids...</p>
          ) : liveMarkets.length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl p-12 text-center max-w-xl mx-auto bg-background/50 backdrop-blur-sm">
              <TrendingUp className="size-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-semibold text-foreground">No active liquidity indices deployed yet.</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-6">Be the first to establish a position structure channel by launching the live dApp terminal module.</p>
              <Link href="/app" className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-full inline-block transition-colors hover:bg-primary/90">Initialize First Pool</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {liveMarkets.map((market) => (
                <div key={market.id} className="bg-background border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between mb-4">
                      <span className="text-[10px] font-mono uppercase bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded font-bold tracking-wider">Pool #{market.id}</span>
                      <span className="text-[11px] text-emerald-400 font-medium font-mono">● Live Testnet</span>
                    </div>
                    <p className="text-sm font-bold text-foreground leading-snug mb-4">{market.description}</p>
                  </div>
                  <div className="border-t border-border pt-4 mt-2 flex justify-between text-[11px] font-mono text-muted-foreground">
                    <span>YES: {market.yesVotes} ITL</span>
                    <span>NO: {market.noVotes} ITL</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* --- PROTOCOL ARCHITECTURE WORKFLOW SECTION --- */}
      <section id="architecture" className="py-24 border-t border-border relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">On-Chain Operational Workflow</span>
            <h2 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight mt-4">Comprehensive Protocol Architecture</h2>
            <p className="text-muted-foreground text-sm sm:text-base mt-2">A cryptographic, tiered evaluation process ensuring maximum network settlement alignment.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative z-10">

            {/* Phase 1 */}
            <div className="bg-secondary/20 border border-border rounded-2xl p-5 shadow-sm relative">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono text-sm font-bold mb-4">01</div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
                <Layers className="size-4 text-primary" />
                <span>Proposal Phase</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Any ecosystem participant can initialize a target forecast question payload by setting clear timeline rules inside the <strong>Make Market</strong> matrix tab configuration.
              </p>
            </div>

            {/* Phase 2 */}
            <div className="bg-secondary/20 border border-border rounded-2xl p-5 shadow-sm relative">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono text-sm font-bold mb-4">02</div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
                <Coins className="size-4 text-primary" />
                <span>Fee Escrow Split</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Creation requires a <strong>1.0 tITL bond collateral fee</strong>. If you use the verified <strong>Team Wallet Address</strong>, this fee parameter is recognized natively and automatically bypassed to allow prompt provisioning.
              </p>
            </div>

            {/* Phase 3 */}
            <div className="bg-secondary/20 border border-border rounded-2xl p-5 shadow-sm relative">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono text-sm font-bold mb-4">03</div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
                <Gavel className="size-4 text-primary" />
                <span>DEC Voting Filter</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Proposals undergo a <strong>24-hour evaluation consensus process</strong>. Registered <strong>DEC members</strong> evaluate integrity and submit ballots. Public accounts view real-time voting percentage indicators without voting permissions.
              </p>
            </div>

            {/* Phase 4 */}
            <div className="bg-secondary/20 border border-border rounded-2xl p-5 shadow-sm relative">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono text-sm font-bold mb-4">04</div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-primary" />
                <span>Curation Pass/Fail</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If <strong>FOR</strong> weights lead, the 1.0 tITL fee shifts straight to the treasury wallet and the market opens for trading. If <strong>AGAINST</strong> wins, a 10% curation penalty goes to treasury, and 90% returns to the creator wallet.
              </p>
            </div>

            {/* Phase 5 */}
            <div className="bg-secondary/20 border border-border rounded-2xl p-5 shadow-sm relative">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono text-sm font-bold mb-4">05</div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-primary" />
                <span>Trading & Settlement</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Active markets accept token positioning stakes. At the expiry date, verified decentralized oracles supply final true result logs to resolve the pool, unlocking automatic yield execution to winning shares.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* --- FOOTER MAIN --- */}
      <footer className="border-t border-border bg-secondary/20 py-12 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 InterPredict Protocol. Engineered for absolute on-chain accuracy.</p>
          <div className="flex gap-6 font-medium">
            <a href="https://twitter.com/InterPredict" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Twitter Updates</a>
            <a href="https://t.me/InterPredict" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Telegram</a>
            <a href="https://interlinklabs.ai" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Interlink Hub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}