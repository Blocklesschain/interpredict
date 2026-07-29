'use client'

import { BackHomeButton } from "@/components/back-home-button"
import Link from "next/link"

export default function WhitepaperPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* Header Section */}
        <div className="mb-12">
          <BackHomeButton />
          <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl font-mono">
            InterPredict Whitepaper
          </h1>
          <p className="mt-4 text-xl text-muted-foreground font-mono">
            A Native-L1 Decentralized Prediction Marketplace with Multi-Outcome Pari-Mutuel Trading, Decentralized Curation, and On-Chain Resolution
          </p>
          <p className="mt-3 text-xs text-muted-foreground italic border-l-2 border-primary pl-4">
            Version 1.0 — July 2026 — Regenerated from the current smart contract implementation.
          </p>
        </div>

        {/* Quick Reference */}
        <div className="mb-8 rounded-xl border border-border bg-secondary/30 p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Protocol Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg border border-border bg-secondary/20">
              <h3 className="font-semibold text-foreground mb-2">Market Lifecycle</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• 14 market states: Proposed → DECVoting → Rejected/Cancelled/Approved → Active → Closed → DECResVoting → AdminVer → Confirmed → Finalized</li>
                <li>• Community markets: 11 tITL (1 fee + 10 seed)</li>
                <li>• Team markets: 10 tITL (seed only, bypasses curation)</li>
                <li>• 2-4 outcomes per market, 18 categories</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg border border-border bg-secondary/20">
              <h3 className="font-semibold text-foreground mb-2">Fee Structure</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Proposal fee: 1 tITL (non-refundable, to treasury)</li>
                <li>• Trading fee: 0.5% (40% treasury, 40% DEC, 20% creator)</li>
                <li>• Settlement fee: 5% (40% treasury, 40% DEC, 20% creator)</li>
                <li>• DEC joining fee: 0.1 tITL (non-refundable)</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg border border-border bg-secondary/20">
              <h3 className="font-semibold text-foreground mb-2">DEC Committee</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Proposal voting: 24-hour window, Approve/Reject</li>
                <li>• Resolution voting: 3-hour window, outcome index</li>
                <li>• Quorum: 5% of active DEC members</li>
                <li>• Reputation: Start 100, +10 correct, -20 incorrect</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg border border-border bg-secondary/20">
              <h3 className="font-semibold text-foreground mb-2">Key Parameters</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Min trade: 0.001 tITL</li>
                <li>• Max question length: 256 chars</li>
                <li>• Max outcome label: 64 chars</li>
                <li>• Max reputation: 1000, reward threshold: 50</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Key Stats */}
        <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-6">
          <h2 className="text-lg font-bold text-foreground mb-3">Key Protocol Parameters</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-secondary/20 rounded-lg p-3 text-center">
              <p className="text-primary font-bold text-sm">11 tITL</p>
              <p className="text-muted-foreground mt-1">Community Market Cost</p>
            </div>
            <div className="bg-secondary/20 rounded-lg p-3 text-center">
              <p className="text-primary font-bold text-sm">24h / 3h</p>
              <p className="text-muted-foreground mt-1">Voting Durations</p>
            </div>
            <div className="bg-secondary/20 rounded-lg p-3 text-center">
              <p className="text-primary font-bold text-sm">2-4</p>
              <p className="text-muted-foreground mt-1">Outcomes Per Market</p>
            </div>
            <div className="bg-secondary/20 rounded-lg p-3 text-center">
              <p className="text-primary font-bold text-sm">14</p>
              <p className="text-muted-foreground mt-1">Market States</p>
            </div>
          </div>
        </div>

        {/* Related Documents */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
          <p className="text-foreground font-semibold mb-2">Related Documents</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mt-3">
            <Link href="/documentation" className="p-3 rounded-lg border border-border bg-secondary/20 text-muted-foreground hover:text-primary transition-colors">
              <span className="font-semibold text-foreground">Documentation</span>
              <p className="text-xs mt-1">Developer & user manual</p>
            </Link>
            <Link href="/governance-forum" className="p-3 rounded-lg border border-border bg-secondary/20 text-muted-foreground hover:text-primary transition-colors">
              <span className="font-semibold text-foreground">Governance</span>
              <p className="text-xs mt-1">DEC Committee roles and operations</p>
            </Link>
            <Link href="/terms-of-service" className="p-3 rounded-lg border border-border bg-secondary/20 text-muted-foreground hover:text-primary transition-colors">
              <span className="font-semibold text-foreground">Terms of Service</span>
              <p className="text-xs mt-1">Legal terms and conditions</p>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4 font-mono text-xs">
            Document Information: InterPredict Whitepaper v2.0 | July 2026 | Regenerated from smart contract implementation.
          </p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Disclaimer: This whitepaper is for informational purposes only and does not constitute financial, investment, or legal advice. 
            Prediction markets involve substantial risk, including the potential loss of principal. The smart contract implementation at 
            <code className="text-primary mx-1">InterPredict.sol</code> is the single source of truth.
          </p>
        </div>
      </div>
    </main>
  )
}