'use client'

import Link from 'next/link'
import { BackHomeButton } from '@/components/back-home-button'

export default function DocumentationPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">

        {/* Header Block */}
        <div className="mb-12">
          <BackHomeButton />
          <h1 className="mt-8 text-5xl font-bold tracking-tight text-foreground sm:text-6xl font-mono">
            InterPredict Documentation
          </h1>
          <p className="mt-4 text-xl text-muted-foreground font-mono">
            Developer & User Guide — Regenerated from Smart Contract Implementation
          </p>
        </div>

        {/* Quick Start Guide */}
        <div className="mb-8 rounded-xl border border-border bg-secondary/30 p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Quick Start Guide</h2>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">1. Connect Your Web3 Wallet</p>
              <p className="text-muted-foreground text-sm">
                Connect your browser wallet to the Interlink Testnet (Chain ID: 19042026). The dApp will automatically prompt you to switch networks.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">2. Browse or Create Markets</p>
              <p className="text-muted-foreground text-sm">
                Browse existing prediction markets or create your own. Community markets cost 11 tITL (1 fee + 10 seed). Team markets cost 10 tITL.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">3. Trade on Outcomes</p>
              <p className="text-muted-foreground text-sm">
                Buy shares in your chosen outcomes. Prices adjust dynamically based on the pari-mutuel pool ratio. Minimum trade: 0.001 tITL.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">4. Claim Winnings</p>
              <p className="text-muted-foreground text-sm">
                After market finalization, winning positions can be claimed. Creators can claim fees and seed liquidity. DEC members can claim rewards.
              </p>
            </div>
          </div>
        </div>

        {/* Documentation Sections */}
        <div className="mb-8 rounded-xl border border-border bg-secondary/30 p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Documentation Sections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg border border-border bg-secondary/20">
              <h3 className="font-semibold text-foreground mb-2">Getting Started</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Connect wallet to Interlink Testnet (Chain ID: 19042026)</li>
                <li>• Get tITL from the Interlink faucet</li>
                <li>• Browse markets on the dApp Portal</li>
                <li>• Configure environment variables for development</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg border border-border bg-secondary/20">
              <h3 className="font-semibold text-foreground mb-2">Market Creation</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Community: 11 tITL, requires DEC approval</li>
                <li>• Team: 10 tITL, bypasses curation</li>
                <li>• 2-4 outcomes, 18 categories</li>
                <li>• Optional IPFS image upload via Pinata</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg border border-border bg-secondary/20">
              <h3 className="font-semibold text-foreground mb-2">Trading</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Pari-mutuel pricing model</li>
                <li>• 0.5% trading fee</li>
                <li>• 5% settlement fee on winnings</li>
                <li>• Minimum trade: 0.001 tITL</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg border border-border bg-secondary/20">
              <h3 className="font-semibold text-foreground mb-2">Resolution</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• DEC resolution voting (3h window)</li>
                <li>• Admin verification layer</li>
                <li>• Claim winnings, creator fees, seed</li>
                <li>• DEC rewards based on reputation</li>
              </ul>
            </div>
          </div>
        </div>

        {/* API & Contract Reference */}
        <div className="mb-8 rounded-xl border border-border bg-secondary/30 p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">API & Contract Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg border border-border bg-secondary/20">
              <h3 className="font-semibold text-foreground mb-2">API Endpoints</h3>
              <ul className="space-y-1 text-muted-foreground font-mono text-xs">
                <li>• GET /api/markets — All market data</li>
                <li>• GET /api/dec-membership — DEC status</li>
                <li>• GET/POST/DELETE /api/dec-requests</li>
                <li>• GET /api/keeper — Automated transitions</li>
                <li>• POST /api/upload-thumbnail — IPFS upload</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg border border-border bg-secondary/20">
              <h3 className="font-semibold text-foreground mb-2">Contract Functions</h3>
              <ul className="space-y-1 text-muted-foreground font-mono text-xs">
                <li>• pM() — Propose community market</li>
                <li>• cTM() — Create team market</li>
                <li>• bO() — Buy outcome shares</li>
                <li>• vOP() / vOR() — DEC voting</li>
                <li>• cW() / cCF() / cCS() / cDR() — Claims</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Related Documents */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
          <p className="text-foreground font-semibold mb-2">Related Documents</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mt-3">
            <Link href="/whitepaper" className="p-3 rounded-lg border border-border bg-secondary/20 text-muted-foreground hover:text-primary transition-colors">
              <span className="font-semibold text-foreground">Whitepaper</span>
              <p className="text-xs mt-1">Comprehensive technical specification</p>
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
      </div>
    </main>
  )
}