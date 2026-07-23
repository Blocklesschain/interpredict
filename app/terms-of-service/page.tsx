import { BackHomeButton } from '@/components/back-home-button'

export default function TermsOfServicePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="glass rounded-[2rem] border border-border bg-white/90 p-10 shadow-2xl dark:bg-[#120025]/90">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-accent">Terms of Service</p>
            <h1 className="mt-4 text-4xl font-heading font-bold tracking-tight text-foreground sm:text-5xl">
              InterPredict V2 User Agreement
            </h1>
            <p className="mt-3 text-xs text-muted-foreground">Effective July 23, 2026</p>
          </div>
          <div className="mb-8"><BackHomeButton /></div>

          <section className="space-y-8 text-base leading-8 text-muted-foreground">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">1. Acceptance and eligibility</h2>
              <p className="mt-4">
                These terms govern use of the InterPredict website and interactions with the
                referenced InterPredict V2 smart contracts. By using either, you represent
                that you have legal capacity, are permitted to use prediction markets in
                your jurisdiction, and accept these terms. Do not use the service where
                prohibited or if you do not accept the risks.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">2. Self-custody and public transactions</h2>
              <p className="mt-4">
                You control your wallet and authorize every signature. InterPredict does not
                possess your private keys, reverse confirmed transactions, or guarantee
                recovery from a wrong address or network. Collateral sent to the contract is
                controlled by its code and role-gated administration until an applicable
                claim, refund, or withdrawal path is available. Wallet addresses, market
                content, votes, purchases, and claims are public blockchain records.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">3. Settlement token and gas</h2>
              <p className="mt-4">
                V2 uses the ERC-20 settlement token configured in the deployed contract. It
                is distinct from native network gas currency. Only standard exact-transfer,
                non-rebasing ERC-20 behavior is supported. You are responsible for verifying
                the chain, contract, token address, decimals, wallet approval, and available
                gas before every transaction.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">4. Market creation</h2>
              <p className="mt-4">
                A community proposal transfers exactly 11 whole settlement tokens. One token
                is an immediately paid, non-refundable proposal fee; ten tokens form the
                proposal seed. Strict approval after the 24-hour DEC vote activates the
                market. Rejection, a tie, no votes, or an elapsed trading deadline returns
                the ten-token seed. An authorized team creator bypasses that vote but must
                deposit at least the ten-token minimum seed.
              </p>
              <p className="mt-4">
                Creators are responsible for lawful, objective content; two to four unique
                outcomes; accurate deadlines; and reliable resolution evidence. Content can
                be permanent once published on-chain.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">5. Trading, fees, and payouts</h2>
              <p className="mt-4">
                Every outcome purchase charges 50 basis points of the gross amount. For a
                community market, 20 basis points go to treasury, 20 to that market&apos;s DEC
                reward fund, and the residual 10 to the creator. For a team market, 30 basis
                points plus any rounding residual go to treasury and 20 basis points go to
                DEC rewards. Fees are taken when purchasing, not later from winning payouts.
              </p>
              <p className="mt-4">
                Quotes can change before confirmation. Slippage settings, network ordering,
                integer rounding, and pool activity affect issued shares and payout. Losing
                positions can be worth zero. InterPredict V2 does not promise a secondary
                sale, a fixed price, or a profit.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">6. DEC resolution and administration</h2>
              <p className="mt-4">
                Resolution uses a three-hour vote by members eligible at a frozen membership
                epoch and an upward-rounded 50% quorum. A unique quorum-backed DEC leader is
                binding. No votes, inadequate quorum, or a tie enters 24-hour administrative
                verification. Admin confirmation requires a reason and evidence URI.
                Permissionless timeout execution either confirms a binding leader or cancels
                a failed vote. Role holders may also pause trading, manage DEC membership,
                update treasury, or cancel eligible active markets under the contract rules.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">7. Cancellation and separate claims</h2>
              <p className="mt-4">
                Administrative cancellation returns each trader&apos;s recorded net
                contribution through an individual claim and permits creator-seed return.
                Purchase fees already paid to treasury are not reversed; unassigned DEC funds
                are routed to treasury. Winning payouts, cancellation refunds, creator fees,
                creator seed, and vested DEC rewards use separate functions and may require
                separate transactions and gas.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">8. No advice, warranty, or guarantee</h2>
              <p className="mt-4">
                The service is experimental and provided as available without financial,
                investment, legal, tax, outcome, uptime, liquidity, security, or fitness
                guarantees. Smart-contract defects, linked-library errors, compromised role
                keys, token failures, chain reorganization, congestion, data-source disputes,
                frontend defects, and regulatory action may cause delay or loss. To the
                extent permitted by law, you assume the risks of your transactions.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">9. Interface and terms changes</h2>
              <p className="mt-4">
                The hosted interface, supported networks, and these terms may change or be
                discontinued. A frontend change does not rewrite already deployed contract
                code. Always compare the interface against current published addresses,
                verified source, and on-chain state.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
