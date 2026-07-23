'use client'

import { BackHomeButton } from '@/components/back-home-button'

export default function GovernanceForumPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="glass rounded-[2rem] border border-border bg-white/85 p-10 shadow-2xl dark:bg-[#120025]/90">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-accent font-mono">
              Governance and evidence
            </p>
            <h1 className="mt-4 text-4xl font-heading font-bold tracking-tight text-foreground sm:text-5xl font-mono">
              Decentralized Ecosystem Curation
            </h1>
          </div>
          <div className="mb-8"><BackHomeButton /></div>

          <div className="mb-12 grid gap-4 rounded-2xl border border-border bg-secondary/30 p-6 text-center text-xs font-mono md:grid-cols-3">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <span className="mb-1 block font-bold text-primary">PROPOSAL</span>
              <p className="text-muted-foreground">Current active DEC members review a community proposal for 24 hours.</p>
            </div>
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
              <span className="mb-1 block font-bold text-accent">RESOLUTION</span>
              <p className="text-muted-foreground">A three-hour vote uses epoch-frozen membership and stored quorum.</p>
            </div>
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
              <span className="mb-1 block font-bold text-purple-400">ACCOUNTABILITY</span>
              <p className="text-muted-foreground">Participation is permissionlessly settled for reputation and earned rewards.</p>
            </div>
          </div>

          <section className="space-y-8 text-base leading-8 text-muted-foreground">
            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">1. Managed membership</h2>
              <p className="mt-4">
                V2 does not provide permissionless DEC enrollment or an on-chain
                proof-of-humanity bond. Addresses holding the DEC manager role add, suspend,
                reactivate, or remove members. Every status change creates a membership
                checkpoint, and those checkpoints make historical resolution snapshots
                auditable.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">2. Proposal curation</h2>
              <p className="mt-4">
                A community creator pays a one-token proposal fee and deposits a ten-token
                seed. Active DEC members may cast one Approve or Reject vote before the
                24-hour deadline through <code>voteOnProposal()</code>. Approval requires
                strictly more approval votes than rejection votes and a still-future trading
                deadline. A rejection, tie, zero-vote result, or elapsed trading deadline
                returns the entire ten-token seed; the one-token fee remains with treasury.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">3. Resolution snapshots</h2>
              <p className="mt-4">
                <code>requestResolution()</code> freezes the current membership epoch, active
                member count, upward-rounded 50% quorum, and a deadline three hours later.
                A member added afterward is ineligible for that round. A member who was
                eligible at the snapshot keeps that round&apos;s vote right even if later
                suspended or removed. Each eligible address can vote once for one of the
                market&apos;s two to four outcomes.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">4. Evidence and escalation</h2>
              <p className="mt-4">
                A unique leading outcome with quorum is binding. No votes, insufficient
                quorum, or a tie enters a 24-hour admin-verification window. An authorized
                admin must publish a non-empty reason and supported evidence URI when
                confirming an outcome. If no admin acts, any caller can execute the timeout:
                a binding DEC leader is confirmed automatically, while a failed vote cancels
                the market and unlocks refund paths. No single hard-coded oracle wallet
                selects ordinary outcomes.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">5. Reputation and DEC rewards</h2>
              <p className="mt-4">
                Every purchase directs 20 basis points of its gross amount to that
                market&apos;s DEC reward fund. A voter with reputation of at least 400 when
                voting is eligible for a share if their vote matches the confirmed outcome.
                Anyone may call <code>settleResolutionParticipation()</code>, so an incorrect
                voter cannot evade the 20-point reputation loss by remaining inactive.
                Correct votes gain 10 points, capped at 1,000.
              </p>
              <p className="mt-4">
                Eligible correct voters receive the market&apos;s equal per-voter reward;
                deterministic division dust goes to treasury. Vested balances are withdrawn
                with <code>claimDECRewards()</code> and remain claimable after suspension,
                removal, or a later reputation decline. Those conditions affect future
                accrual, not already-earned property.
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-secondary/60 p-6 font-mono">
              <p className="mb-2 text-sm font-semibold text-foreground">Operational notice</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Off-chain discussion is evidence and coordination, not a substitute for an
                on-chain vote or role-authorized transaction. Verify the market ID,
                membership snapshot, deadlines, result, and evidence URI on-chain before
                relying on any forum statement.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
