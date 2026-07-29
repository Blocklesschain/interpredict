'use client'

import { BackHomeButton } from '@/components/back-home-button'
import Link from 'next/link'

export default function GovernanceForumPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="glass rounded-[2rem] border border-border bg-white/85 p-10 shadow-2xl dark:bg-[#120025]/90">

          {/* Header Block */}
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-accent font-mono">
              Governance & Consensus
            </p>
            <h1 className="mt-4 text-4xl font-heading font-bold tracking-tight text-foreground sm:text-5xl font-mono">
              The Decentralized Ecosystem Curation (DEC) Forum
            </h1>
          </div>

          <div className="mb-8">
            <BackHomeButton />
          </div>

          {/* Governance Overview */}
          <div className="mb-8 rounded-xl border border-border bg-secondary/30 p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Governance Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg border border-border bg-secondary/20">
                <h3 className="font-semibold text-foreground mb-2">DEC Committee</h3>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Join with 0.1 tITL fee + admin approval</li>
                  <li>• Vote on proposals (24h window)</li>
                  <li>• Vote on resolutions (3h window)</li>
                  <li>• Earn reputation through accurate voting</li>
                </ul>
              </div>
              <div className="p-3 rounded-lg border border-border bg-secondary/20">
                <h3 className="font-semibold text-foreground mb-2">Reputation System</h3>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Initial reputation: 100</li>
                  <li>• Correct vote: +10 (max 1000)</li>
                  <li>• Incorrect vote: -20 (min 0)</li>
                  <li>• Minimum for rewards: 50</li>
                </ul>
              </div>
              <div className="p-3 rounded-lg border border-border bg-secondary/20">
                <h3 className="font-semibold text-foreground mb-2">Proposal Voting</h3>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• 24-hour voting window</li>
                  <li>• Approve or Reject</li>
                  <li>• Pass: Approve {">"} Reject</li>
                  <li>• Tie/No votes: Rejected/Cancelled</li>
                </ul>
              </div>
              <div className="p-3 rounded-lg border border-border bg-secondary/20">
                <h3 className="font-semibold text-foreground mb-2">Resolution Voting</h3>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• 3-hour voting window</li>
                  <li>• Vote for any outcome index</li>
                  <li>• Quorum: 5% of active members</li>
                  <li>• Admin decides if no quorum or tie</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Roles & Permissions */}
          <div className="mb-8 rounded-xl border border-border bg-secondary/30 p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Protocol Roles</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-semibold text-foreground">Role</th>
                    <th className="text-left py-2 pr-4 font-semibold text-foreground">Permissions</th>
                    <th className="text-left py-2 font-semibold text-foreground">Identifier</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono text-xs">DEFAULT_ADMIN</td>
                    <td className="py-2 pr-4">All functions, role management, treasury</td>
                    <td className="py-2 font-mono text-xs">0x00 (ZeroHash)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono text-xs">TEAM_MARKET_ROLE</td>
                    <td className="py-2 pr-4">Create team markets (cTM)</td>
                    <td className="py-2 font-mono text-xs">keccak256("TEAM_MARKET_ROLE")</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono text-xs">DEC_ROLE</td>
                    <td className="py-2 pr-4">Vote on proposals, resolutions, claim rewards</td>
                    <td className="py-2 font-mono text-xs">keccak256("DEC_ROLE")</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono text-xs">ADMIN_VERIFIER_ROLE</td>
                    <td className="py-2 pr-4">Confirm outcomes, cancel markets</td>
                    <td className="py-2 font-mono text-xs">keccak256("ADMIN_VERIFIER_ROLE")</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">PAUSER_ROLE</td>
                    <td className="py-2 pr-4">Pause/unpause contract</td>
                    <td className="py-2 font-mono text-xs">keccak256("PAUSER_ROLE")</td>
                  </tr>
                </tbody>
              </table>
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
              <Link href="/documentation" className="p-3 rounded-lg border border-border bg-secondary/20 text-muted-foreground hover:text-primary transition-colors">
                <span className="font-semibold text-foreground">Documentation</span>
                <p className="text-xs mt-1">Developer & user manual</p>
              </Link>
              <Link href="/terms-of-service" className="p-3 rounded-lg border border-border bg-secondary/20 text-muted-foreground hover:text-primary transition-colors">
                <span className="font-semibold text-foreground">Terms of Service</span>
                <p className="text-xs mt-1">Legal terms and conditions</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}