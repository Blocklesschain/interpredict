'use client'

import { BackHomeButton } from '@/components/back-home-button'

export default function GovernanceForumPage() {
  // Safe string variables to protect the JSX parser from parsing errors
  const proposalStakeText = "1.00 ITL";
  const curationStakeText = "0.10 ITL";
  const splitText = "10% (Penalty) / 90% (Refund)";
  const feeSplitText = "2.0% (DEC pool) / 2.0% (Team Treasury) / 1.0% (Creator escrow)";
  const ratioText = "Votes For >= Votes Against";

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

          {/* Interactive Flow Visual Map */}
          <div className="mb-12 rounded-2xl border border-border bg-secondary/30 p-6 backdrop-blur">
            <h3 className="text-lg font-bold text-foreground font-mono mb-4 text-center">
              On-Chain Proposal & Curation Stake Flow
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-xs font-mono">
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                <span className="text-primary font-bold block mb-1">1. SUBMISSION</span>
                <p className="text-muted-foreground">Creator stakes {proposalStakeText} to lock a proposed query on-chain.</p>
              </div>
              <div className="p-4 rounded-xl border border-accent/20 bg-accent/5">
                <span className="text-accent font-bold block mb-1">2. 24H CURATION</span>
                <p className="text-muted-foreground">DEC Members (staked {curationStakeText}) vote to Approve or Reject.</p>
              </div>
              <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
                <span className="text-purple-400 font-bold block mb-1">3. STATE EVALUATION</span>
                <p className="text-muted-foreground">Passed = Market goes Active. Rejected = {splitText} split executed.</p>
              </div>
            </div>
          </div>

          <section className="space-y-8 text-base leading-8 text-muted-foreground">

            {/* 1. Committee Mechanics */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">1. Proof-of-Humanity Curation Rules</h2>
              <p className="mt-4">
                To keep prediction pools high-quality and prevent bot manipulation, InterPredict hooks directly into the Interlink L1 Proof of Humanity registry. Any verified human can register as an assessor by calling <code>joinCommittee()</code> and committing a <strong>{curationStakeText}</strong> security bond. This registration fee is routed to the Treasury wallet to discourage Sybil attacks.
              </p>
            </div>

            {/* 2. Proposal Lifecycles */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">2. Submission & Locking Parameters</h2>
              <p className="mt-4">
                When proposing a new market, users must lock exactly <strong>{proposalStakeText}</strong> in escrow.
                This initiates a strict 24-hour voting countdown. Committee members vote on proposals using <code>voteOnCuration(marketId, support)</code>. The contract enforces a strict limit of one vote per verified human node.
              </p>
            </div>

            {/* 3. Mathematical Curation Decisions */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">3. Resolution Outputs & Rejection Splits</h2>
              <p className="mt-4">
                Once the 24-hour curation countdown completes, any user can invoke <code>initializeMarket()</code> to calculate the votes. The contract evaluates the proposal outcome:
              </p>
              <ul className="mt-4 list-disc list-inside space-y-2 text-sm pl-4 font-mono">
                <li>
                  <strong className="text-emerald-400">PASSED ({ratioText}):</strong> The market state updates to Active, allowing public share trading.
                </li>
                <li>
                  <strong className="text-rose-400">REJECTED (Votes Against &gt; Votes For):</strong> The market is resolved to a DRAW, and the 1.00 ITL proposal stake is split. <strong>10% (0.1 ITL)</strong> is sent to the Team Treasury, and <strong>90% (0.9 ITL)</strong> is returned to the creator.
                </li>
              </ul>
            </div>

            {/* 4. Incentive Distribution */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">4. Staker Yields & Programmatic Claims</h2>
              <p className="mt-4">
                DEC Committee members are rewarded for active participation. The global contract state aggregates <strong>2.0% of all platform trading fees</strong> inside the <code>decPool</code> state variable. Members can call <code>claimDecRewards()</code> to claim their pro-rata share, calculated based on the global pool and current member count.
              </p>
              <div className="mt-4 p-4 rounded-xl border border-border bg-secondary/20 font-mono text-xs">
                <span className="text-purple-300">CURATOR CLAIM FORMULA:</span>
                <p className="text-slate-300 mt-1">Claimable = (decPool / totalDecMembers) - decRewardsClaimedTracker[msg.sender]</p>
              </div>
            </div>

            {/* 5. Dispute Resolution */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">5. Post-Trading Settlement Disputes</h2>
              <p className="mt-4">
                If a market settles with an incorrect outcome, the community can use the forum to present verifiable evidence. While final settlement is determined by the secure Team Oracle Key, the forum acts as a transparent, auditable log of public discussions to ensure high curation standards across InterPredict.
              </p>
            </div>

            {/* Footer Alert */}
            <div className="rounded-3xl bg-secondary/60 p-6 border border-border font-mono">
              <p className="text-sm font-semibold text-foreground mb-2">💡 Operational Notice</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Platform fees for user-created markets are automatically structured as: <strong>{feeSplitText}</strong>. Ensure your proposed questions specify clear, objective outcome criteria to avoid curation rejection and the associated 10% stake penalty.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}