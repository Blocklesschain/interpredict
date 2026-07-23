import { BackHomeButton } from '@/components/back-home-button'

export default function RiskDisclosurePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="glass rounded-[2rem] border border-border bg-white/90 p-10 shadow-2xl dark:bg-[#120025]/90">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-accent">Risk Disclosure</p>
            <h1 className="mt-4 text-4xl font-heading font-bold tracking-tight text-foreground sm:text-5xl">
              InterPredict V2 Participant Notice
            </h1>
          </div>
          <div className="mb-8"><BackHomeButton /></div>

          <section className="space-y-8 text-base leading-8 text-muted-foreground">
            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">1. Complete loss is possible</h2>
              <p className="mt-4">
                Each market has two to four outcomes. A position in any non-winning outcome
                normally receives no payout, so you may lose the entire net amount committed
                to that position plus fees and gas. Shares do not represent a stablecoin,
                debt claim, deposit account, or guaranteed redemption value.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">2. Proposal-cost risk</h2>
              <p className="mt-4">
                A community proposal requires 11 whole settlement tokens. The one-token fee
                is transferred to treasury and is not refunded. The ten-token seed is returned
                after rejection, a tie, no votes, or an expired trading deadline, but remains
                committed through an approved market&apos;s lifecycle until seed return is
                available. Token, gas, contract, and availability risks apply throughout.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">3. Price, liquidity, and fee risk</h2>
              <p className="mt-4">
                Pool prices are ratios of virtual balances, not independent valuations or
                guarantees of real-world probability. A purchase changes its own execution
                context and increases the selected outcome&apos;s displayed price. There is no
                V2 sell function or guaranteed exit before settlement. Each purchase takes a
                0.50% fee from its gross amount; gas and integer rounding are additional
                economic costs.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">4. Governance and evidence risk</h2>
              <p className="mt-4">
                DEC membership is role-managed. Resolution voting uses epoch-snapshotted
                eligibility, an upward-rounded 50% quorum, and a three-hour deadline. A
                quorum-backed unique leader is binding, but no votes, inadequate quorum, or a
                tie requires evidence-based admin verification. Evidence may be ambiguous,
                unavailable, manipulated, or disputed. Admin keys and DEC membership can be
                compromised, unavailable, concentrated, or used incorrectly.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">5. Pause, cancellation, and timing risk</h2>
              <p className="mt-4">
                Authorized accounts can pause all new creation and trading, pause an
                individual active market, or cancel eligible active markets. A pause does not
                extend on-chain deadlines. Cancellation refunds only recorded net trading
                contributions; purchase fees already routed to treasury are not reversed.
                Claims and permissionless lifecycle calls still require a working chain,
                sufficient gas, and successful exact ERC-20 transfers.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">6. Token and accounting assumptions</h2>
              <p className="mt-4">
                InterPredict checks exact balance changes on incoming and outgoing transfers.
                Fee-on-transfer, rebasing, blacklist-dependent, callback-dependent, or
                otherwise non-standard tokens can make transactions revert or funds
                unavailable. The settlement token itself may depeg, lose value, be paused, be
                upgraded, or contain defects. Liability accounting reduces risk but does not
                prove the absence of every implementation or economic error.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">7. Contract and linked-library risk</h2>
              <p className="mt-4">
                Core operations such as <code>buyOutcome()</code>,
                <code> claimPayout()</code>, and <code> claimDECRewards()</code> depend on the
                main contract, a separately deployed and linked InterPredictReader library,
                the settlement token, and the EVM network. Verification or deployment mistakes
                involving either runtime bytecode or the link address can invalidate expected
                behavior. Audits and tests reduce, but never eliminate, smart-contract risk.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">8. Operational and interface risk</h2>
              <p className="mt-4">
                The website, RPC service, market API, authentication service, and scheduled
                keeper may be slow, incorrect, censored, or unavailable. The keeper is not
                trusted to choose outcomes, and critical expired transitions are
                permissionless, but users may need to call them directly. Always verify
                addresses, chain ID, calldata, block timestamp, market state, token approval,
                and transaction receipt independently.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">9. Legal and regulatory risk</h2>
              <p className="mt-4">
                Prediction-market access may be restricted, licensed, taxed, or prohibited
                depending on location and circumstances. Rules can change without notice.
                You are solely responsible for obtaining professional advice and complying
                with applicable law.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
