'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from './context/Web3Context'
import { Navbar } from '@/components/navbar'
import { ArrowRight, Layers, ShieldCheck, Coins, Gavel, CheckCircle2, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { ethers } from 'ethers'

interface MarketType {
  id: number
  description: string
  yesVotes: string
  noVotes: string
  resolved: boolean
}

const CONTRACT_ADDRESS = "0x244130F9BcaC8642d4213742D837eFD1C2d7B12b"
const CONTRACT_ABI = ["function marketCount() view returns (uint256)"]

export default function HomePage() {
  const [liveMarkets, setLiveMarkets] = useState<MarketType[]>([])
  const [isLoading, setIsLoading] = useState(false)

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
          fetched.push({
            id: i,
            description: `InterPredict Global Prediction Trading Pool Index #${i}`,
            yesVotes: "0.00",
            noVotes: "0.00",
            resolved: false
          })
        }
        setLiveMarkets(fetched)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    syncExploreMarkets()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-primary/20 overflow-x-hidden">
      <Navbar />

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-16 md:pt-44 md:pb-28 overflow-hidden px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(98,0,238,0.06),transparent_50%)]" />
        <div className="max-w-5xl mx-auto text-center relative z-10">

          {/* Beautiful Moderate Dynamic Multi-Color Text Heading Block */}
          <h1 className="text-3xl sm:text-5xl md:text-5xl font-heading font-extrabold tracking-tight leading-[1.2] mb-6 max-w-4xl mx-auto">
            <span className="bg-gradient-to-r from-red-500 via-orange-400 to-amber-500 bg-clip-text text-transparent [text-shadow:0_0_30px_rgba(239,68,68,0.1)]">
              InterPredict
            </span>{" "}
            <span className="text-slate-400 font-light">—</span>{" "}
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent [text-shadow:0_0_30px_rgba(234,179,8,0.15)]">
              Community Prediction Marketplace on Interlink
            </span>
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg max-w-3xl mx-auto leading-relaxed mb-10">
            InterPredict is a decentralized, community-owned prediction marketplace built natively on the Interlink Network. Propose, vote and trade your insights on anything and everything.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md mx-auto sm:max-w-none">
            <Link
              href="/app"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-full transition-all shadow-lg shadow-primary/20 text-sm tracking-wide"
            >
              <span>Launch dApp</span>
              <ArrowRight className="size-4" />
            </Link>

            <a
              href="#architecture"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-secondary/80 hover:bg-secondary text-foreground font-semibold rounded-full border border-border transition-colors text-sm"
            >
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* --- EXPLORE LIVE MARKETS SECTION --- */}
      <section id="markets" className="py-20 border-t border-border bg-secondary/20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-4">
            <div>
              <h2 className="text-2xl sm:text-4xl font-heading font-bold tracking-tight">Explore Markets</h2>
              <p className="text-muted-foreground text-sm mt-1">Live market positions tracked securely on-chain.</p>
            </div>
            <Link href="/app" className="text-sm font-bold text-primary hover:underline flex items-center gap-1.5 transition-all">
              <span>Trade Real-Time</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <p className="text-sm font-mono text-primary animate-pulse">Syncing smart contract registries...</p>
          ) : liveMarkets.length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto bg-background/50 backdrop-blur-sm shadow-sm">
              <TrendingUp className="size-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-semibold text-foreground">No active markets found</p>
              <p className="text-xs text-muted-foreground mt-1 mb-6 max-w-xs mx-auto">
                No active pools are deployed at the moment. Initialize your custom prediction contract index via the dApp terminal.
              </p>
              <Link href="/app" className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-full inline-block transition-colors hover:bg-primary/90">
                Create First Market
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {liveMarkets.map((market) => (
                <div key={market.id} className="bg-background border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between mb-4 items-center">
                      <span className="text-[10px] font-mono bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded font-bold uppercase tracking-wider">Index #{market.id}</span>
                      <span className="text-[11px] text-emerald-400 font-medium font-mono">● Active</span>
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

      {/* --- PROTOCOL ARCHITECTURE WORKFLOW --- */}
      <section id="architecture" className="py-24 border-t border-border px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">Protocol Infrastructure</span>
            <h2 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight mt-4">How It Works</h2>
            <p className="text-muted-foreground text-sm sm:text-base mt-2">A concise, professional look at our native on-chain curation and settlement pipeline.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-secondary/40 border border-border rounded-2xl p-5 shadow-sm">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono text-sm font-bold mb-4">01</div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5"><Layers className="size-4 text-primary" /><span>Proposal Phase</span></h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Users open custom prediction structures by defining forecasting logic inside the terminal workspace dashboard.</p>
            </div>
            <div className="bg-secondary/40 border border-border rounded-2xl p-5 shadow-sm">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono text-sm font-bold mb-4">02</div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5"><Coins className="size-4 text-primary" /><span>Collateral Escrow</span></h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Market deployment requires a 1.0 tITL security fee bond to defend the network registry channels from spam variables.</p>
            </div>
            <div className="bg-secondary/40 border border-border rounded-2xl p-5 shadow-sm">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono text-sm font-bold mb-4">03</div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5"><Gavel className="size-4 text-primary" /><span>DEC Evaluation</span></h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Proposals pass through a 24-hour verification window. Decentralized Curation Committee (DEC) members cast consensus weights.</p>
            </div>
            <div className="bg-secondary/40 border border-border rounded-2xl p-5 shadow-sm">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono text-sm font-bold mb-4">04</div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /><span>Curation Settlement</span></h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Passed assets move directly to trading. Forfeited assets apply a 10% network burn fee, returning the 90% balance back to creators.</p>
            </div>
            <div className="bg-secondary/40 border border-border rounded-2xl p-5 shadow-sm">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono text-sm font-bold mb-4">05</div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5"><ShieldCheck className="size-4 text-primary" /><span>Position Trading</span></h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Ecosystem traders buy YES or NO contract shares. Upon market maturity, independent oracles trigger automated smart execution payouts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER COMPONENT --- */}
      <footer className="border-t border-border bg-secondary/30 py-12 text-xs text-muted-foreground px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">

          <div className="flex flex-col gap-2.5 text-center md:text-left">
            <p>© 2026 InterPredict Protocol. All rights reserved.</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1.5 text-slate-500 font-medium">
              <Link href="/whitepaper" className="hover:text-primary transition-colors">Whitepaper</Link>
              <Link href="/documentation" className="hover:text-primary transition-colors">Documentation</Link>
              <Link href="https://forum.interpredict.io" target="_blank" className="hover:text-primary transition-colors">Governance Forum</Link>
              <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <Link href="/risk" className="hover:text-primary transition-colors">Risk Disclosure</Link>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <a href="https://twitter.com/InterPredict" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1.5 font-medium" title="Twitter Updates">
              <svg className="size-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              <span>Twitter</span>
            </a>
            <a href="https://t.me/InterPredict" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1.5 font-medium" title="Telegram Messenger">
              <svg className="size-4 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.961 6.505-1.359 8.641-.168.9-.501 1.201-.82 1.23-.703.064-1.237-.465-1.917-.912-1.065-.7-1.666-1.134-2.698-1.814-1.194-.786-.42-1.218.26-1.926.178-.184 3.279-3.008 3.339-3.264.008-.033.014-.154-.059-.219-.073-.064-.18-.042-.258-.025-.111.024-1.884 1.196-5.319 3.518-.503.346-.959.516-1.367.507-.45-.01-1.317-.254-1.961-.464-.79-.258-1.418-.394-1.363-.833.028-.23.347-.465.955-.705 3.733-1.623 6.222-2.694 7.467-3.213 3.543-1.479 4.28-1.736 4.761-1.745.106-.002.344.025.497.15.13.105.166.248.178.349.012.106.027.34-.01.597z" /></svg>
              <span>Telegram</span>
            </a>
            <a href="https://interlinklabs.ai" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors font-medium">Interlink Hub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}