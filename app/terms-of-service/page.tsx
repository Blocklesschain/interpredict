import { BackHomeButton } from '@/components/back-home-button'

export default function TermsOfServicePage() {
  // String definitions to completely avoid raw JSX character comparison errors
  const rejectRatio = "10% / 90%";
  const totalFeePct = "5.0%";
  const baseSplit = "2.0% (DEC) / 2.0% (Team) / 1.0% (Creator)";
  const teamSplit = "2.0% (DEC) / 3.0% (Team)";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="glass rounded-[2rem] border border-border bg-white/90 p-10 shadow-2xl dark:bg-[#120025]/90">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-accent">
              Terms of Service
            </p>
            <h1 className="mt-4 text-4xl font-heading font-bold tracking-tight text-foreground sm:text-5xl">
              InterPredict User Agreement
            </h1>
          </div>

          <div className="mb-8">
            <BackHomeButton />
          </div>

          <section className="space-y-8 text-base leading-8 text-muted-foreground">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">1. Scope and Acceptance</h2>
              <p className="mt-4">
                These Terms of Service govern your interaction with the InterPredict smart contracts and frontend portal deployed on the Interlink L1 network. By connecting a Web3 wallet, transmitting native ITL tokens to the contract, proposing markets, or purchasing YES/NO shares, you unconditionally agree to these Terms. If you do not accept these constraints, you must immediately terminate your interaction with our interfaces.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">2. Non-Custodial and Peer-to-Peer Operations</h2>
              <p className="mt-4">
                InterPredict is an entirely non-custodial, peer-to-peer prediction marketplace protocol. All pool assets are locked securely inside immutable on-chain smart contracts. InterPredict does not manage trade order books, operate central clearinghouses, custody user collateral, or control individual wallet private keys. All transactions, bets, and claims occur autonomously on the Interlink Network.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">3. Market Proposal, Escrow, and Rejection Penalty</h2>
              <p className="mt-4">
                Any user may propose a market by locking exactly 1.0 ITL as a proposal stake. This proposal triggers a 24-hour curation window during which the DEC Committee curates the query:
              </p>
              <ul className="mt-4 list-disc list-inside space-y-2 text-sm pl-4">
                <li>
                  <strong>Curation Approval:</strong> If the proposal receives favorable committee consensus, the market transitions to the Active state, enabling public share trading.
                </li>
                <li>
                  <strong>Curation Rejection:</strong> If the proposal fails to clear curation, the contract executes an immutable <strong>{rejectRatio}</strong> split. A 10% penalty (0.1 ITL) is sent directly to the Team Treasury Wallet to compensate for committee curation overhead, and the remaining 90% (0.9 ITL) is returned to the creator.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">4. Dynamic Fee Dedication and Payout Claims</h2>
              <p className="mt-4">
                Upon resolving a prediction pool, a flat <strong>{totalFeePct}</strong> fee is automatically subtracted from the total payout of winning shareholders during the execution of <code>claimPayout()</code>. This fee is dynamically split by the smart contract:
              </p>
              <ul className="mt-4 list-disc list-inside space-y-2 text-sm pl-4">
                <li>
                  <strong>User-Created Pools:</strong> The 5% total fee is parsed as <strong>{baseSplit}</strong>. The 1% creator yield remains held in escrow and is claimable exclusively by the community creator via <code>claimCreatorYield()</code>.
                </li>
                <li>
                  <strong>Team-Created Pools:</strong> The 5% total fee is parsed as <strong>{teamSplit}</strong>. Since the team deployed the market, the creator yield is absorbed.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">5. Subjective Oracle Verification and Timeline Constraints</h2>
              <p className="mt-4">
                Markets are resolved based on real-world outcomes validated by our designated Team Oracle Wallet (<code>0x6E832252eA4c78068EE109d953724D2762431992</code>). You acknowledge that resolution can only be executed after the block timestamp has surpassed the market's registered <code>marketEndTime</code>. Only the authorized oracle address can settle outcomes, preventing unauthorized actors from executing malicious state changes.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">6. Financial Risks and Technical Disclaimers</h2>
              <p className="mt-4">
                InterPredict is a decentralized protocol and does not provide financial, legal, or investment advice. Trading in prediction markets is highly speculative. You can lose 100% of your committed ITL tokens if an outcome does not settle in your favor. All smart contract actions are final, permanent, and completely irreversible.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}