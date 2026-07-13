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

const CONTRACT_ADDRESS = process.env.PUBLIC_CONTRACT_ADDRESS! || "0xD6CA8AB227dE04be92e3c0076c54BD9d60705Da2";
const CONTRACT_ABI = ["function marketCount() view returns (uint256)"]

export default function HomePage() {
  const { t } = useWeb3()
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
          <h1 className="text-3xl sm:text-5xl md:text-5xl font-heading font-extrabold tracking-tight leading-[1.2] mb-6 max-w-4xl mx-auto">
            <span className="bg-gradient-to-r from-[#d946ef] via-[#ef4444] to-[#f59e0b] bg-clip-text text-transparent">
              InterPredict
            </span>{" "}
            <span className="text-slate-600 font-light">—</span>{" "}
            <span className="bg-gradient-to-r from-[#f59e0b] via-[#fef08a] to-[#eab308] bg-clip-text text-transparent">
              {t('titleSuffix')}
            </span>
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg max-w-3xl mx-auto leading-relaxed mb-10">
            {t('tagline')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md mx-auto sm:max-w-none">
            <Link
              href="/app"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-full transition-all shadow-lg shadow-primary/20 text-sm tracking-wide"
            >
              <span>{t('launchBtn')}</span>
              <ArrowRight className="size-4" />
            </Link>

            <a
              href="#architecture"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-secondary/80 hover:bg-secondary text-foreground font-semibold rounded-full border border-border transition-colors text-sm"
            >
              {t('howItWorksBtn')}
            </a>
          </div>
        </div>
      </section>

      {/* --- EXPLORE LIVE MARKETS SECTION --- */}
      <section id="markets" className="py-20 border-t border-border bg-secondary/20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-4">
            <div>
              <h2 className="text-2xl sm:text-4xl font-heading font-bold tracking-tight">{t('exploreMarketsTitle')}</h2>
              <p className="text-muted-foreground text-sm mt-1">{t('exploreMarketsSub')}</p>
            </div>
            <Link href="/app" className="text-sm font-bold text-primary hover:underline flex items-center gap-1.5 transition-all">
              <span>{t('tradeRealtimeBtn')}</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <p className="text-sm font-mono text-primary animate-pulse">Syncing smart contract registries...</p>
          ) : liveMarkets.length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto bg-background/50 backdrop-blur-sm shadow-sm">
              <TrendingUp className="size-8 mx-auto text-muted-foreground mb-3" />

              <p className="text-sm font-semibold text-foreground">
                {t('noActiveMarkets')}
              </p>

              <p className="text-xs text-muted-foreground mt-1 mb-6 max-w-xs mx-auto">
                {t('noActivePoolsDesc')} 
              </p>

              <Link href="/app" className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-full inline-block transition-colors hover:bg-primary/90">
                {t('createFirstMarketBtn')} 
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
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              {t('infraBadge')} {/* 🔄 Localized */}
            </span>
            <h2 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight mt-4">
              {t('howItWorksBtn')} {/* 🔄 Localized */}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mt-2">
              {t('infraSub')} {/* 🔄 Localized */}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* 🔄 Card 01 Localized */}
            <div className="bg-secondary/40 border border-border rounded-2xl p-5 shadow-sm">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono text-sm font-bold mb-4">01</div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5"><Layers className="size-4 text-primary" /><span>{t('step1Title')}</span></h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('step1Desc')}</p>
            </div>
            {/* 🔄 Card 02 Localized */}
            <div className="bg-secondary/40 border border-border rounded-2xl p-5 shadow-sm">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono text-sm font-bold mb-4">02</div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5"><Coins className="size-4 text-primary" /><span>{t('step2Title')}</span></h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('step2Desc')}</p>
            </div>
            {/* 🔄 Card 03 Localized */}
            <div className="bg-secondary/40 border border-border rounded-2xl p-5 shadow-sm">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono text-sm font-bold mb-4">03</div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5"><Gavel className="size-4 text-primary" /><span>{t('step3Title')}</span></h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('step3Desc')}</p>
            </div>
            {/* 🔄 Card 04 Localized */}
            <div className="bg-secondary/40 border border-border rounded-2xl p-5 shadow-sm">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono text-sm font-bold mb-4">04</div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /><span>{t('step4Title')}</span></h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('step4Desc')}</p>
            </div>
            {/* 🔄 Card 05 Localized */}
            <div className="bg-secondary/40 border border-border rounded-2xl p-5 shadow-sm">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono text-sm font-bold mb-4">05</div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5"><ShieldCheck className="size-4 text-primary" /><span>{t('step5Title')}</span></h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('step5Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER COMPONENT --- */}
      <footer className="border-t border-border bg-secondary/30 py-12 text-xs text-muted-foreground px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-3 text-center md:text-left">
            <p className="font-semibold text-slate-400">{t('footerRights')}</p> {/* 🔄 Localized Copyright */}
            <div className="flex flex-wrap justify-center md:justify-start gap-x-5 gap-y-2">
              <Link href="/whitepaper" className="px-3 py-1 bg-secondary/40 hover:bg-secondary/80 text-slate-300 hover:text-primary rounded-md border border-border transition-all font-medium shadow-sm">{t('navWhitepaper')}</Link>
              <Link href="/documentation" className="px-3 py-1 bg-secondary/40 hover:bg-secondary/80 text-slate-300 hover:text-primary rounded-md border border-border transition-all font-medium shadow-sm">{t('docDocumentation')}</Link>
              <Link href="/governance-forum" className="px-3 py-1 bg-secondary/40 hover:bg-secondary/80 text-slate-300 hover:text-primary rounded-md border border-border transition-all font-medium shadow-sm">{t('docForum')}</Link>
              <Link href="/terms-of-service" className="px-3 py-1 bg-secondary/40 hover:bg-secondary/80 text-slate-300 hover:text-primary rounded-md border border-border transition-all font-medium shadow-sm">{t('docTerms')}</Link>
              <Link href="/privacy-policy" className="px-3 py-1 bg-secondary/40 hover:bg-secondary/80 text-slate-300 hover:text-primary rounded-md border border-border transition-all font-medium shadow-sm">{t('docPrivacy')}</Link>
              <Link href="/risk-disclosure" className="px-3 py-1 bg-secondary/40 hover:bg-secondary/80 text-slate-300 hover:text-primary rounded-md border border-border transition-all font-medium shadow-sm">{t('docRisk')}</Link>
            </div>
          </div>

          <div className="flex items-center gap-5 shrink-0 bg-background/40 px-5 py-3 rounded-full border border-border shadow-inner">
            <a href="https://twitter.com/InterPredict" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1.5 font-semibold text-slate-300">
              <svg className="size-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              <span>Twitter</span>
            </a>
            <span className="w-px h-3.5 bg-border" />
            <a href="https://t.me/InterPredict" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1.5 font-semibold text-slate-300">
              <svg className="size-4 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.961 6.505-1.359 8.641-.168.9-.501 1.201-.82 1.23-.703.064-1.237-.465-1.917-.912-1.065-.7-1.666-1.134-2.698-1.814-1.194-.786-.42-1.218.26-1.926.178-.184 3.279-3.008 3.339-3.264.008-.033.014-.154-.059-.219-.073-.064-.18-.042-.258-.025-.111.024-1.884 1.196-5.319 3.518-.503.346-.959.516-1.367.507-.45-.01-1.317-.254-1.961-.464-.79-.258-1.418-.394-1.363-.833.028-.23.347-.465.955-.705 3.733-1.623 6.222-2.694 7.467-3.213 3.543-1.479 4.28-1.736 4.761-1.745.106-.002.344.025.497.15.13.105.166.248.178.349.012.106.027.34-.01.597z" /></svg>
              <span>Telegram</span>
            </a>
            <span className="w-px h-3.5 bg-border" />
            <a href="https://interlinklabs.ai" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-2 font-semibold text-slate-300">
              <img src="/images/interlink.png" alt="Interlink Logo" className="size-4 object-contain rounded-sm" />
              <span>Interlink</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}