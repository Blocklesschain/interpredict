import { BackHomeButton } from '@/components/back-home-button'

export default function PrivacyPolicyPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="glass rounded-[2rem] border border-border bg-white/90 p-10 shadow-2xl dark:bg-[#120025]/90">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-accent">Privacy Policy</p>
            <h1 className="mt-4 text-4xl font-heading font-bold tracking-tight text-foreground sm:text-5xl">
              InterPredict Data Practices
            </h1>
            <p className="mt-3 text-xs text-muted-foreground">Effective July 23, 2026</p>
          </div>
          <div className="mb-8"><BackHomeButton /></div>

          <section className="space-y-8 text-base leading-8 text-muted-foreground">
            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">1. Public blockchain data</h2>
              <p className="mt-4">
                Blockchain activity is public and cannot be treated as private. Wallet
                addresses, token transfers, market metadata, votes, purchases, roles,
                reputation updates, and claims may be permanently available to anyone and
                can be combined with other information to identify or profile a user.
                InterPredict cannot delete or correct finalized public-chain records.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">2. Wallet and authentication data</h2>
              <p className="mt-4">
                When you connect, the interface receives your public address, selected chain,
                accounts exposed by the wallet, and transaction or signature responses.
                Interlink RPC authentication sends the public wallet address, a signed
                challenge, and authentication tokens to Interlink-operated endpoints. The
                application never needs your seed phrase or private key; never disclose them.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">3. Local browser storage</h2>
              <p className="mt-4">
                The interface stores theme and language preferences, connection preference,
                wallet-scoped activity history, and wallet-scoped Interlink access and refresh
                tokens in browser storage. Browser storage is accessible to scripts running
                under the same origin and can persist after a tab closes. Disconnecting hides
                or clears some active state but does not guarantee deletion of every browser,
                wallet, provider, cache, or blockchain record. You can clear site data through
                browser settings.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">4. Hosted APIs and infrastructure</h2>
              <p className="mt-4">
                The hosted market, membership, and keeper APIs communicate with hosting and
                Interlink RPC infrastructure. Requests can expose IP address, user agent,
                timing, requested URLs and query parameters, approximate location inferred by
                providers, and operational logs. Providers may retain and process that data
                under their own terms, security controls, and legal obligations. Do not put
                secrets or personal information in market metadata, URLs, or API queries.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">5. Analytics</h2>
              <p className="mt-4">
                The production interface enables Vercel Analytics to measure site usage and
                performance. The hosting and analytics providers may process device, request,
                page-view, and network metadata. InterPredict does not promise that the
                interface is free from all analytics, logs, cookies, or similar storage.
                Browser privacy controls or content blockers may limit some collection but
                can also impair functionality.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">6. Sharing, retention, and security</h2>
              <p className="mt-4">
                Data may be processed by hosting, RPC, wallet, analytics, security, and legal
                service providers as needed to operate the interface, prevent abuse, comply
                with law, or investigate incidents. Retention varies by provider and
                configuration. No internet service, browser store, wallet, or blockchain
                interaction can be guaranteed secure or anonymous.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">7. Your choices</h2>
              <p className="mt-4">
                You may browse public information without connecting a wallet, decline wallet
                requests, clear local site data, use browser privacy controls, or interact
                directly with verified contracts instead of the hosted interface. Those
                choices do not erase public blockchain data or records independently held by
                infrastructure providers. Verify current provider policies before use.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">8. Changes</h2>
              <p className="mt-4">
                Data practices may change when the interface, network, providers, or law
                changes. The effective date above identifies this version. Continued use after
                an update is subject to the then-current notice.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
