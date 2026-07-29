import { BackHomeButton } from '@/components/back-home-button'
import Link from 'next/link'

export default function TermsOfServicePage() {
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

          {/* Key Terms Summary */}
          <section className="space-y-6 text-base leading-8 text-muted-foreground">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">1. Scope and Acceptance</h2>
              <p className="mt-4">
                These Terms of Service govern your interaction with the InterPredict Protocol deployed on the Interlink Network. 
                By connecting a Web3 wallet, transmitting tITL tokens, proposing markets, or purchasing shares, you agree to these Terms.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">2. Non-Custodial Operations</h2>
              <p className="mt-4">
                InterPredict is a non-custodial protocol. All assets are locked in immutable smart contracts. 
                InterPredict does not manage order books, custody collateral, or control private keys.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">3. Fees</h2>
              <ul className="mt-4 space-y-2 text-sm pl-4 list-disc">
                <li><strong>Proposal Fee:</strong> 1 tITL (non-refundable, community markets only)</li>
                <li><strong>Trading Fee:</strong> 0.5% deducted from each trade</li>
                <li><strong>Settlement Fee:</strong> 5% deducted from winning payouts</li>
                <li><strong>DEC Joining Fee:</strong> 0.1 tITL (non-refundable)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">4. Prohibited Activities</h2>
              <ul className="mt-4 space-y-2 text-sm pl-4 list-disc">
                <li>Market manipulation, fraud, or collusion</li>
                <li>Wash trading or artificial volume generation</li>
                <li>Sybil attacks on the DEC voting system</li>
                <li>Creating markets for illegal activities</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">5. Disclaimers</h2>
              <p className="mt-4">
                The Protocol is provided "as is" without warranties. Smart contracts may contain vulnerabilities. 
                All transactions are irreversible. InterPredict does not provide financial advice.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">Related Documents</h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <Link href="/privacy-policy" className="p-3 rounded-lg border border-border bg-secondary/20 hover:text-primary transition-colors">
                  <span className="font-semibold text-foreground">Privacy Policy</span>
                  <p className="text-xs mt-1 text-muted-foreground">Data collection and privacy practices</p>
                </Link>
                <Link href="/risk-disclosure" className="p-3 rounded-lg border border-border bg-secondary/20 hover:text-primary transition-colors">
                  <span className="font-semibold text-foreground">Risk Disclosure</span>
                  <p className="text-xs mt-1 text-muted-foreground">Comprehensive risk assessment</p>
                </Link>
                <Link href="/whitepaper" className="p-3 rounded-lg border border-border bg-secondary/20 hover:text-primary transition-colors">
                  <span className="font-semibold text-foreground">Whitepaper</span>
                  <p className="text-xs mt-1 text-muted-foreground">Technical protocol specification</p>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}