'use client'

import Link from 'next/link'
import { BackHomeButton } from '@/components/back-home-button'

const states = [
  'Proposed',
  'DEC proposal voting',
  'Rejected',
  'Cancelled',
  'Approved',
  'Active',
  'Trading closed',
  'Unresolved',
  'Resolution requested',
  'DEC resolution voting',
  'Admin verification',
  'Outcome confirmed',
  'Finalized',
  'Resolved',
]

export default function WhitepaperPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <BackHomeButton />
          <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl font-mono">
            InterPredict V2 Whitepaper
          </h1>
          <p className="mt-4 text-xl text-muted-foreground font-mono">
            ERC-20 collateralized, multi-outcome prediction markets with DEC governance
          </p>
          <p className="mt-3 border-l-2 border-primary pl-4 text-xs italic text-muted-foreground">
            Production-candidate architecture, July 2026. Contract behavior, not this
            explanatory document, is authoritative.
          </p>
        </div>

        <section className="mb-12 rounded-xl border border-border bg-secondary/30 p-8">
          <h2 className="mb-4 text-2xl font-bold text-foreground font-mono">Protocol at a glance</h2>
          <ul className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
            <li>• Standard ERC-20 settlement token; exact transfer accounting</li>
            <li>• Two, three, or four outcome markets</li>
            <li>• 24-hour community proposal vote</li>
            <li>• Three-hour DEC resolution vote</li>
            <li>• 50-basis-point fee on each purchase</li>
            <li>• Permissionless expired-state finalization</li>
            <li>• Epoch-frozen DEC eligibility and stored quorum</li>
            <li>• Protocol-wide and per-market emergency pauses</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="mb-5 border-b border-border pb-2 text-3xl font-bold text-foreground font-mono">
            1. Creation and liquidity
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            A community proposal transfers exactly 11 whole settlement tokens: one token is
            delivered immediately to the treasury and ten tokens are held as the proposal
            seed. Approval activates the market and distributes the seed deterministically
            across its outcomes. Rejection, a tie, no votes, or an expired trading deadline
            returns the full ten-token seed; the one-token proposal fee remains paid.
          </p>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            An address with the team-market role may activate a market without proposal
            voting, but must supply at least the same ten-token minimum seed. Every market
            has two to four unique non-empty outcome labels, bounded metadata, a future
            trading deadline, and evidence URIs beginning with <code>https://</code>,
            <code> ipfs://</code>, or <code> ar://</code>.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-5 border-b border-border pb-2 text-3xl font-bold text-foreground font-mono">
            2. Trading and prices
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            InterPredict is a pool-based share system, not a central-limit order book. Let
            <code> V</code> be total virtual balance, <code>Bᵢ</code> the selected outcome
            balance, <code>G</code> the gross purchase, and <code>F = floor(G × 50 / 10,000)</code>.
            The net amount is <code>N = G − F</code> and issued shares are
            <code> floor(N × V / Bᵢ)</code>. The displayed price is <code>Bᵢ / V</code>;
            after a purchase it is <code>(Bᵢ + N) / (V + N)</code>. Consequently, buying an
            outcome raises its displayed probability while all prices remain non-negative
            and sum to one within integer rounding.
          </p>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Community-market fee allocation is 20 basis points to treasury, 20 to DEC
            rewards, and the residual 10 basis points to the creator. Team-market allocation
            is 30 basis points to treasury and 20 to DEC rewards. Integer residuals are
            assigned deterministically so allocations never exceed the collected fee.
            Trades are rejected at or after the on-chain deadline even if no keeper has
            synchronized the stored market state.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-5 border-b border-border pb-2 text-3xl font-bold text-foreground font-mono">
            3. Resolution governance
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            A trader, the creator, or a currently active DEC member may request resolution
            after trading closes. After a one-hour abandonment grace period, any address may
            request it so collateral cannot remain trapped by absent participants.
          </p>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            The request stores the membership epoch, active member count, quorum rounded
            upward at 50%, and a deadline exactly three hours later. Eligibility is evaluated
            against membership checkpoints at that epoch: later additions cannot vote, and
            later suspension or removal does not erase a snapshotted member&apos;s vote right.
            A unique quorum-backed plurality is binding. No votes, inadequate quorum, or a
            tie enters evidence-backed admin verification.
          </p>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Admin verification lasts 24 hours and requires a reason plus a valid evidence URI.
            If the admin does not act, anyone may execute the timeout: a valid binding DEC
            plurality is confirmed automatically; failed or tied votes cancel the market and
            preserve user refund and creator-seed recovery paths.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-5 border-b border-border pb-2 text-3xl font-bold text-foreground font-mono">
            4. Settlement, rewards, and solvency
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Once finalized, winning shares claim the remaining trading collateral in
            proportion to remaining winning shares. The last winning claimant receives only
            the legitimate integer remainder. If no winning shares exist, traders recover
            their recorded net contributions. Creator seed, creator fees, trading collateral,
            proposal seed, and DEC rewards are tracked as separate aggregate liabilities.
          </p>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Anyone may settle a DEC voter&apos;s resolution participation. Correct votes gain
            reputation and eligible correct voters accrue a fixed per-voter reward; incorrect
            votes lose reputation. Eligibility for new rewards is frozen when the vote is
            cast. Previously vested rewards remain claimable even if a member is later
            suspended, removed, or falls below the future-accrual threshold.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Transfers verify both protocol and recipient balance deltas. Fee-on-transfer,
            rebasing, callback-dependent, or otherwise non-exact tokens are unsupported.
            Production operators must validate the settlement token bytecode, decimals, and
            behavior before deployment.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-5 border-b border-border pb-2 text-3xl font-bold text-foreground font-mono">
            5. Lifecycle and safety controls
          </h2>
          <div className="mb-6 flex flex-wrap gap-2">
            {states.map((state, index) => (
              <span key={state} className="rounded border border-border bg-secondary/20 px-3 py-1 text-xs text-muted-foreground">
                {index}: {state}
              </span>
            ))}
          </div>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            The global pause blocks community creation, team creation, and trading. A market
            pause blocks trading only for that active market. Deadline synchronization,
            voting finalization, resolution, cancellation, claims, refunds, reward
            settlement, and withdrawals remain available where their normal state guards
            permit, because stopping those paths could trap collateral.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The deployed system consists of the main InterPredict contract and a separately
            deployed, externally linked InterPredictReader library. Both bytecodes and the
            exact link address must be verified. The public market getters return canonical
            ABI-encoded bytes decoded by the shared client schema.
          </p>
        </section>

        <section className="rounded-xl border border-primary/20 bg-primary/5 p-6">
          <h2 className="mb-3 text-xl font-bold text-foreground font-mono">Further reading</h2>
          <p className="text-sm text-muted-foreground">
            See the <Link href="/documentation" className="font-semibold text-primary hover:underline">user guide</Link>
            {' '}for the operating workflow. Repository documentation contains the complete
            protocol specification, architecture, migration, deployment, and audit material.
          </p>
        </section>

        <div className="mt-16 border-t border-border pt-8 text-[10px] leading-relaxed text-muted-foreground">
          InterPredict V2 is experimental software. This document is informational only and
          is not financial, investment, legal, tax, or regulatory advice. Prediction markets
          may be restricted in your jurisdiction and can result in complete loss of funds.
        </div>
      </div>
    </main>
  )
}
