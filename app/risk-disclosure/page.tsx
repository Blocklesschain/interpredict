import { BackHomeButton } from '@/components/back-home-button'

export default function RiskDisclosurePage() {
  // String definitions to avoid JSX syntax parsers choking on raw symbols
  const totalFeeString = "5.0%";
  const penaltyRatio = "10% / 90%";
  const timeCondition = "block.timestamp >= market.marketEndTime";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="glass rounded-[2rem] border border-border bg-white/90 p-10 shadow-2xl dark:bg-[#120025]/90">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-accent">
              Risk Disclosure
            </p>
            <h1 className="mt-4 text-4xl font-heading font-bold tracking-tight text-foreground sm:text-5xl">
              Protocol Risk & Participant Notice
            </h1>
          </div>

          <div className="mb-8">
            <BackHomeButton />
          </div>

          <section className="space-y-8 text-base leading-8 text-muted-foreground">
            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">1. Absolute Capital Loss Risk</h2>
              <p className="mt-4">
                Trading positions in any InterPredict pool is highly speculative. Market shares are binary, settling either to 1.00 ITL or 0.00 ITL based on real-world outcomes. If you buy YES shares on a market that resolves to NO (or vice versa), your entire position settles to zero. All on-chain wagers are final, non-refundable, and completely irreversible.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">2. Curation Escrow Rejection Penalties</h2>
              <p className="mt-4">
                Users who propose a market must deposit a strict 1.0 ITL security stake. Proposing markets that are deemed ambiguous, misleading, or inappropriate by the Decentralized Curation Committee carries immediate financial penalties:
              </p>
              <ul className="mt-4 list-disc list-inside space-y-2 text-sm pl-4">
                <li>
                  <strong>The Penalty:</strong> If a proposal is rejected, the contract enforces a <strong>{penaltyRatio}</strong> split. 10% (0.1 ITL) is sent immediately to the Team Treasury Wallet to compensate for committee curation overhead. Only the remaining 90% (0.9 ITL) is returned to the creator.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">3. Embedded Platform Fee Cuts</h2>
              <p className="mt-4">
                Upon pool resolution, a flat <strong>{totalFeeString}</strong> platform fee is automatically deducted from all winning payouts. This fee is automatically routed by the smart contract to reward DEC Committee curators (2.0%) and support protocol operations (2.0% or 3.0%), with 1.0% held in escrow for user creators of community-proposed markets. You must factor this fee into your expected margins before placing wagers.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">4. Subjective First-Party Oracle Settlement</h2>
              <p className="mt-4">
                During the bootstrap phase of the Interlink Network, InterPredict utilizes a first-party validator wallet key to settle outcomes. This subjective oracle key is designated inside the smart contract state.
                While resolving a market strictly requires the on-chain condition that <code>{timeCondition}</code>, participants assume the risk of relying on the team oracle key to submit real-world resolution callbacks truthfully and accurately.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">5. Smart Contract and L1 Infrastructure Dependency</h2>
              <p className="mt-4">
                All functions—including <code>buyShares()</code>, <code>claimPayout()</code>, and <code>claimDecRewards()</code>—depend directly on the underlying Interlink EVM-compatible execution layer. Network congestion, consensus latency, or smart contract bugs on the L1 can prevent timely order executions or payout redemptions.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">6. Open-Ended Roadmap Commitments</h2>
              <p className="mt-4">
                This document contains no fixed roadmap dates or guaranteed feature releases. The protocol and team prioritize sovereign consensus, smart contract safety, and long-term utility of the ITL token rather than delivering against predetermined timelines.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}