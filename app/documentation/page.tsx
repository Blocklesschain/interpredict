'use client'

import Link from 'next/link'
import { BackHomeButton } from '@/components/back-home-button'

const lifecycle = [
  ['Community proposal', 'Submit two to four outcomes and approve an exact 11-token transfer: one-token fee plus ten-token seed.'],
  ['DEC proposal vote', 'Active DEC members vote Approve or Reject during the 24-hour on-chain window.'],
  ['Activation or refund', 'Anyone may finalize after the deadline. Approval activates trading; every other result automatically returns the ten-token seed.'],
  ['Trading', 'Buy an outcome with slippage protection before the on-chain deadline. A 0.50% fee is included in each gross purchase.'],
  ['Resolution vote', 'An eligible requester starts a three-hour vote with membership eligibility and quorum frozen at that instant.'],
  ['Verification', 'A quorum-backed unique DEC leader is binding. Failed or tied votes require evidence-backed admin review.'],
  ['Finalization and claims', 'Anyone finalizes a confirmed outcome; winners, the creator, and DEC voters then use their independent claim or settlement paths.'],
]

export default function DocumentationPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12">
          <BackHomeButton />
          <h1 className="mt-8 text-4xl font-bold tracking-tight text-foreground sm:text-6xl font-mono">
            How InterPredict V2 Works
          </h1>
          <p className="mt-4 text-xl text-muted-foreground font-mono">
            User and operator guide for multi-outcome ERC-20 prediction markets
          </p>
        </div>

        <section className="mb-12 rounded-xl border border-border bg-secondary/30 p-8">
          <h2 className="mb-6 text-2xl font-bold text-foreground font-mono">Before you transact</h2>
          <ol className="space-y-4 text-sm text-muted-foreground">
            <li><strong className="text-foreground">1. Verify the network.</strong> Use the chain shown by the application and compare the published contract and settlement-token addresses.</li>
            <li><strong className="text-foreground">2. Connect deliberately.</strong> Read every wallet simulation and token-approval request. InterPredict never needs your seed phrase.</li>
            <li><strong className="text-foreground">3. Understand the token.</strong> V2 settles through the configured ERC-20 token, not native gas currency. Keep separate native currency for gas.</li>
            <li><strong className="text-foreground">4. Confirm deadlines and evidence.</strong> On-chain timestamps and contract state are authoritative; frontend labels are conveniences.</li>
          </ol>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 border-b border-border pb-2 text-3xl font-bold text-foreground font-mono">
            Market lifecycle
          </h2>
          <div className="space-y-3">
            {lifecycle.map(([title, description], index) => (
              <div key={title} className="rounded-lg border border-border bg-secondary/20 p-4">
                <p className="mb-1 font-semibold text-foreground">{index + 1}. {title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-5 border-b border-border pb-2 text-3xl font-bold text-foreground font-mono">
            Creating a valid market
          </h2>
          <ul className="space-y-3 pl-5 text-sm text-muted-foreground list-disc">
            <li>Use an objective question no longer than 280 bytes and two to four unique, non-empty outcome labels.</li>
            <li>State precise resolution criteria and a future trading deadline. Community deadlines must leave the full 24-hour proposal vote before trading ends.</li>
            <li>Use a supported category; the Other category requires a custom label.</li>
            <li>Provide a thumbnail and primary evidence URI using <code>https://</code>, <code>ipfs://</code>, or <code>ar://</code>. A backup URI is optional but must use one of those schemes when present.</li>
            <li>Community creators pay one whole settlement token and seed ten. Team-role creators seed at least ten and bypass proposal voting.</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="mb-5 border-b border-border pb-2 text-3xl font-bold text-foreground font-mono">
            Trading and settlement
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            A quote shows gross amount, fee, net collateral, shares, current price, and
            post-trade price. Set a minimum acceptable share amount before submitting.
            Buying increases the selected outcome&apos;s virtual balance and therefore its
            displayed probability. InterPredict V2 does not provide sell orders or guaranteed
            liquidity before resolution.
          </p>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Winning claims receive a proportional share of trading collateral. Integer
            division can leave dust until the last legitimate winner claims; that final
            winner receives only the recorded remainder. Creator seed return, creator fees,
            DEC rewards, cancellation refunds, and winning payouts are separate transactions.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            When an active market is administratively cancelled, each trader may recover
            recorded net contributions and the creator may recover the original seed. Trading
            fees already routed to treasury are not reversed; unassigned DEC reward funds are
            sent to treasury.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-5 border-b border-border pb-2 text-3xl font-bold text-foreground font-mono">
            DEC members
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Proposal votes require current active membership. Resolution eligibility is
            different: the contract freezes the membership epoch at the request, so additions
            after that moment cannot vote and later removals do not invalidate an address
            that was eligible at the snapshot.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Vote participation must be settled after the market resolves. Anyone can settle
            a voter, preventing incorrect voters from avoiding a reputation loss. Reputation
            below 400 prevents eligibility for new resolution rewards; rewards vested from
            earlier eligible votes remain claimable regardless of later membership or
            reputation changes.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-5 border-b border-border pb-2 text-3xl font-bold text-foreground font-mono">
            Pauses and recovery
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            A protocol pause stops new markets and purchases. A market pause stops purchases
            only for that market. Pauses do not extend immutable deadlines and do not disable
            deterministic finalization, resolution, refunds, payouts, seed return, or vested
            reward claims when the normal state requirements are met.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The scheduled keeper is an operational convenience, not a trusted resolver.
            Expired lifecycle transitions remain permissionless. If the interface has not
            refreshed, use its refresh control and verify the latest transaction and state in
            a block explorer before retrying.
          </p>
        </section>

        <section className="rounded-lg border border-primary/20 bg-primary/5 p-6">
          <p className="mb-2 font-semibold text-foreground">Learn more</p>
          <p className="text-sm text-muted-foreground">
            Read the <Link href="/whitepaper" className="font-semibold text-primary hover:underline">V2 whitepaper</Link>
            {' '}for pricing and governance design, the
            {' '}<Link href="/risk-disclosure" className="font-semibold text-primary hover:underline">risk disclosure</Link>
            {' '}before using the protocol, and the
            {' '}<Link href="/governance-forum" className="font-semibold text-primary hover:underline">governance page</Link>
            {' '}for DEC responsibilities.
          </p>
        </section>
      </div>
    </main>
  )
}
