import { BackHomeButton } from '@/components/back-home-button'
import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="glass rounded-[2rem] border border-border bg-white/90 p-10 shadow-2xl dark:bg-[#120025]/90">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-accent">
              Privacy Policy
            </p>
            <h1 className="mt-4 text-4xl font-heading font-bold tracking-tight text-foreground sm:text-5xl">
              InterPredict Privacy Policy
            </h1>
          </div>

          <div className="mb-8">
            <BackHomeButton />
          </div>

          {/* Key Privacy Points */}
          <section className="space-y-6 text-base leading-8 text-muted-foreground">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">1. Information We Collect</h2>
              <ul className="mt-4 space-y-3 text-sm pl-4 list-disc">
                <li><strong>Wallet Address:</strong> Your public wallet address for on-chain interactions</li>
                <li><strong>Local Storage:</strong> Language preferences, transaction history, session state (stored in your browser)</li>
                <li><strong>API Usage:</strong> IP addresses (temporary, rate limiting), request parameters</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">2. Information We Do NOT Collect</h2>
              <ul className="mt-4 space-y-3 text-sm pl-4 list-disc">
                <li>Private keys or seed phrases</li>
                <li>Personal identification (names, emails, phone numbers)</li>
                <li>KYC documents or government IDs</li>
                <li>Bank accounts or credit card numbers</li>
                <li>Cookies for advertising or cross-site tracking</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">3. Data We Store</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Data</th>
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Purpose</th>
                      <th className="text-left py-2 font-semibold text-foreground">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-4">Wallet address</td>
                      <td className="py-2 pr-4">On-chain interactions</td>
                      <td className="py-2">Permanent (blockchain)</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-4">Language preference</td>
                      <td className="py-2 pr-4">UI localization</td>
                      <td className="py-2">Until cleared</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-4">Transaction history</td>
                      <td className="py-2 pr-4">UI display</td>
                      <td className="py-2">Until cleared</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">API request data</td>
                      <td className="py-2 pr-4">Rate limiting, security</td>
                      <td className="py-2">30 days max</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">4. Third-Party Services</h2>
              <ul className="mt-4 space-y-2 text-sm pl-4 list-disc">
                <li><strong>Pinata (IPFS):</strong> Image storage — uploaded images only</li>
                <li><strong>Netlify:</strong> DEC request storage — wallet addresses</li>
                <li><strong>Interlink Network:</strong> Blockchain infrastructure — all transaction data</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">Related Documents</h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <Link href="/terms-of-service" className="p-3 rounded-lg border border-border bg-secondary/20 hover:text-primary transition-colors">
                  <span className="font-semibold text-foreground">Terms of Service</span>
                  <p className="text-xs mt-1 text-muted-foreground">Legal terms and conditions</p>
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