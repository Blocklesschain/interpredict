import { BackHomeButton } from '@/components/back-home-button'
import Link from 'next/link'

export default function RiskDisclosurePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="glass rounded-[2rem] border border-border bg-white/90 p-10 shadow-2xl dark:bg-[#120025]/90">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-accent">
              Risk Disclosure
            </p>
            <h1 className="mt-4 text-4xl font-heading font-bold tracking-tight text-foreground sm:text-5xl">
              InterPredict Risk Disclosure
            </h1>
          </div>

          <div className="mb-8">
            <BackHomeButton />
          </div>

          {/* Important Notice */}
          <section className="space-y-6 text-base leading-8 text-muted-foreground">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">⚠️ Important Notice</h2>
              <div className="mt-4 p-4 rounded-lg border border-red-500/30 bg-red-500/10">
                <p className="text-sm font-bold text-red-400">
                  PREDICTION MARKET TRADING INVOLVES SUBSTANTIAL RISK. YOU COULD LOSE ALL OF THE ASSETS YOU COMMIT TO THE PROTOCOL.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">Risk Categories</h2>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg border border-border bg-secondary/20">
                  <h3 className="font-semibold text-foreground mb-1">Blockchain Risks</h3>
                  <p className="text-muted-foreground text-xs">Network congestion, forks, 51% attacks, chain reorganizations</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-secondary/20">
                  <h3 className="font-semibold text-foreground mb-1">Smart Contract Risks</h3>
                  <p className="text-muted-foreground text-xs">Code vulnerabilities, no formal verification, upgrade limitations</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-secondary/20">
                  <h3 className="font-semibold text-foreground mb-1">Market Risks</h3>
                  <p className="text-muted-foreground text-xs">Total loss of principal, manipulation, illiquidity, cancellation</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-secondary/20">
                  <h3 className="font-semibold text-foreground mb-1">Resolution Risks</h3>
                  <p className="text-muted-foreground text-xs">DEC voting failures, admin override, delayed resolution</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-secondary/20">
                  <h3 className="font-semibold text-foreground mb-1">Governance Risks</h3>
                  <p className="text-muted-foreground text-xs">Centralization, admin misbehavior, DEC collusion</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-secondary/20">
                  <h3 className="font-semibold text-foreground mb-1">Wallet & Security</h3>
                  <p className="text-muted-foreground text-xs">Private key loss, phishing, malware, browser extension risks</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-secondary/20">
                  <h3 className="font-semibold text-foreground mb-1">Regulatory Risks</h3>
                  <p className="text-muted-foreground text-xs">Uncertain legal status, regulatory action, tax implications</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-secondary/20">
                  <h3 className="font-semibold text-foreground mb-1">User Mistake Risks</h3>
                  <p className="text-muted-foreground text-xs">Wrong network, wrong contract, incorrect parameters, slippage</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">No Guarantees</h2>
              <p className="mt-4">
                The Protocol may become unavailable at any time. There is no guarantee of correct outcomes,
                trading profits, DEC rewards, or return of principal. InterPredict does not provide financial,
                investment, legal, or tax advice.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">Related Documents</h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <Link href="/terms-of-service" className="p-3 rounded-lg border border-border bg-secondary/20 hover:text-primary transition-colors">
                  <span className="font-semibold text-foreground">Terms of Service</span>
                  <p className="text-xs mt-1 text-muted-foreground">Legal terms and conditions</p>
                </Link>
                <Link href="/privacy-policy" className="p-3 rounded-lg border border-border bg-secondary/20 hover:text-primary transition-colors">
                  <span className="font-semibold text-foreground">Privacy Policy</span>
                  <p className="text-xs mt-1 text-muted-foreground">Data collection and privacy practices</p>
                </Link>
                <Link href="/whitepaper" className="p-3 rounded-lg border border-border bg-secondary/20 hover:text-primary transition-colors">
                  <span className="font-semibold text-foreground">Whitepaper</span>
                  <p className="text-xs mt-1 text-muted-foreground">Technical protocol specification</p>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}