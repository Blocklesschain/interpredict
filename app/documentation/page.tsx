'use client'

import Link from 'next/link'
import { BackHomeButton } from '@/components/back-home-button'

export default function DocumentationPage() {
  // Safe string definitions to prevent the JSX compiler from hitting unexpected token errors
  const formatRules = "Will Bitcoin close above $50,000 on December 31, 2026? is good. Crypto will moon is not.";
  const superMajorityStr = "66% or higher";
  const disputeMajorityStr = "75% or higher";
  const voteConditionStr = "votesForActive >= votesAgainstActive && votesForActive > 0";
  const timeConditionStr = "block.timestamp >= market.marketEndTime";
  const logNamespaceStr = "interpredict_logs_${walletAddress.toLowerCase()}";

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">

        {/* Header Block */}
        <div className="mb-12">
          <BackHomeButton />
          <h1 className="mt-8 text-5xl font-bold tracking-tight text-foreground sm:text-6xl font-mono">
            How InterPredict Works
          </h1>
          <p className="mt-4 text-xl text-muted-foreground font-mono">
            A Developer &amp; User Manual for Native L1 Prediction Pools
          </p>
        </div>

        {/* Quick Start Guide */}
        <section className="mb-12 rounded-xl border border-border bg-secondary/30 p-8 backdrop-blur">
          <h2 className="mb-6 text-2xl font-bold text-foreground font-mono">Quick Start Guide</h2>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">1. Connect Your Web3 Wallet</p>
              <p className="text-muted-foreground text-sm">
                Connect your browser wallet and verify that your network is set to the Interlink Testnet (Chain ID: 19042026).
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">2. Propose or Browse Markets</p>
              <p className="text-muted-foreground text-sm">
                Browse existing prediction markets or deposit exactly 1.00 ITL to propose a custom binary question for committee review.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">3. Purchase YES/NO Shares</p>
              <p className="text-muted-foreground text-sm">
                Commit ITL to acquire YES or NO shares in active markets. Prices adjust dynamically based on the ratio of capital in each pool.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">4. Settle Winnings</p>
              <p className="text-muted-foreground text-sm">
                Once resolved, winning shares can be redeemed for their proportional share of the pool, while losing positions expire.
              </p>
            </div>
          </div>
        </section>

        {/* Market Creation & Curation */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">Creating a New Market</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">What Makes a Valid Proposal?</h3>
          <p className="mb-4 text-muted-foreground text-sm leading-relaxed">
            InterPredict markets require clear, objective resolution criteria to pass curation. The DEC Committee evaluates proposals based on these standards:
          </p>
          <ul className="mb-6 space-y-3 text-muted-foreground text-sm list-disc pl-5">
            <li>
              <strong>Clear Binary Output:</strong> Event statements must resolve strictly to YES or NO (e.g., <em>{formatRules}</em>).
            </li>
            <li>
              <strong>Verifiable Evidence Sources:</strong> You must specify a public, reliable API, explorer, or press outlet where the oracle can verify the outcome.
            </li>
            <li>
              <strong>Time Precision:</strong> Specify the exact date, time, and timezone of event resolution.
            </li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">The 24-Hour Curation Process</h3>
          <div className="space-y-3 mb-6 text-sm text-muted-foreground">
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Step 1: Staking and Submission</p>
              <p className="text-xs">
                Proposers call <code>proposeMarket</code>, locking a security deposit of exactly 1.00 ITL.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Step 2: Curation Window</p>
              <p className="text-xs">
                During a strict 24-hour voting period, DEC members review the proposal and cast votes to Approve or Reject.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Step 3: State Initialization</p>
              <p className="text-xs">
                Any user calls <code>initializeMarket</code> to calculate the votes. If the proposal meets the criteria (<code>{voteConditionStr}</code>), the market is opened for trading. If rejected, the contract applies a 10% curation penalty (0.1 ITL) and refunds the remaining 90% (0.9 ITL) to the creator.
              </p>
            </div>
          </div>
        </section>

        {/* Trading & Pricing Mechanics */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">Trading on InterPredict</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">Understanding Share Pricing</h3>
          <p className="mb-4 text-muted-foreground text-sm leading-relaxed">
            InterPredict pools operate on a peer-to-peer matching model where odds shift based on the ratio of committed capital.
            The price of a share represents the market&apos;s implied probability of that outcome occurring. For example:
          </p>
          <ul className="mb-6 space-y-2 text-sm text-muted-foreground list-disc pl-5">
            <li>If YES shares are priced at 0.65 ITL, the market is pricing in an implied probability of 65%.</li>
            <li>At resolution, winning shares are redeemable for their proportional share of the pool, while losing shares settle to zero.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">Browser-Cached Transaction Logs</h3>
          <p className="mb-4 text-muted-foreground text-sm leading-relaxed">
            To provide a responsive interface while maintaining a decentralized architecture, transaction logs are written directly to your browser&apos;s local cache:
          </p>
          <ul className="mb-6 space-y-2 text-sm text-muted-foreground list-disc pl-5">
            <li>
              Logs are mapped directly to your connected address using the namespace <code>{logNamespaceStr}</code>.
            </li>
            <li>This transaction history is kept entirely private and is never transmitted to or stored on external servers.</li>
            <li>Disconnecting your wallet immediately clears active logs from the active user interface.</li>
          </ul>
        </section>

        {/* Resolution & Payouts */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">Market Resolution &amp; Settlement</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">The Resolution Workflow</h3>
          <p className="mb-4 text-muted-foreground text-sm leading-relaxed">
            Once a market reaches its deadline, the resolution process is executed through these steps:
          </p>
          <ol className="mb-6 space-y-3 text-sm text-muted-foreground list-decimal list-inside pl-2">
            <li>The trading window closes, rejecting any further buy orders.</li>
            <li>
              Any user clicks &quot;Ping Oracle Resolution&quot; to invoke <code>requestOracleResolution</code>, emitting a resolution request event.
            </li>
            <li>
              The authorized Team Oracle Wallet (<code>0x6E832252eA4c78068EE109d953724D2762431992</code>) verifies the outcome and submits the resolution callback on-chain.
            </li>
            <li>Winning shareholders can call <code>claimPayout</code> to claim their winnings.</li>
          </ol>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">Disputes</h3>
          <p className="mb-4 text-muted-foreground text-sm leading-relaxed">
            If an incorrect outcome is submitted, users can present verifiable evidence in the governance forum.
            If a dispute meets the required consensus ({disputeMajorityStr}), the outcome can be updated, with all actions recorded on-chain.
          </p>
        </section>

        {/* Frequently Asked Questions (FAQ) */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">Frequently Asked Questions</h2>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Q: Why does InterPredict use ITL instead of standard stablecoins?</p>
              <p className="text-muted-foreground text-sm">
                A: Settling wagers directly in native ITL avoids the security risks, wrapping fees, and transaction delays associated with bridged stablecoins, keeping operations low-cost and secure.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Q: Why is my &quot;Ping Oracle Resolution&quot; button disabled?</p>
              <p className="text-muted-foreground text-sm">
                A: This button is dynamically locked by the frontend until the block timestamp has passed the market&apos;s registered deadline (<code>{timeConditionStr}</code>), protecting market integrity from premature resolution.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Q: How do platform fees get split?</p>
              <p className="text-muted-foreground text-sm">
                A: The protocol deducts a flat 5.0% platform fee from winning wagers, which is dynamically split based on the creator of the pool:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground pl-4 list-disc">
                <li>User-Created Pools: 2.0% goes to the DEC Committee, 2.0% goes to the Team Treasury, and 1.0% is reserved for the creator.</li>
                <li>Team-Created Pools: 2.0% goes to the DEC Committee, and 3.0% goes to the Team Treasury.</li>
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Q: Is the 0.1 ITL DEC enrollment fee refundable?</p>
              <p className="text-muted-foreground text-sm">
                A: No. The registration fee is a non-refundable contribution sent directly to the Team Treasury to prevent automated spam attacks and support ongoing development of the protocol.
              </p>
            </div>
          </div>
        </section>

        {/* Learn More Block */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 mt-8">
          <p className="text-foreground font-semibold mb-2">Want to Learn More?</p>
          <p className="text-muted-foreground text-sm mb-4">
            For technical details about contract state, byte-packing schemas, and mathematical payout settlement models, see our complete <Link href="/whitepaper" className="font-semibold text-primary hover:underline">Whitepaper</Link>.
          </p>
          <p className="text-muted-foreground text-sm">
            To join discussions and vote on proposals, visit the active <Link href="/governance-forum" className="font-semibold text-primary hover:underline">Governance Forum</Link>.
          </p>
        </div>
      </div>
    </main>
  )
}