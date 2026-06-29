import { BackHomeButton } from '@/components/back-home-button'

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
              InterPredict Data Practices
            </h1>
          </div>

          <div className="mb-8">
            <BackHomeButton />
          </div>

          <section className="space-y-8 text-base leading-8 text-muted-foreground">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Data collection</h2>
              <p className="mt-4">
                InterPredict collects only the data necessary to operate the decentralized marketplace and support user interactions. Because the platform is built on Interlink, many trading and settlement activities are verified through the network rather than centralized user profiles.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">Decentralized identity and privacy</h2>
              <p className="mt-4">
                Users interact with the platform through decentralized identifiers and wallet-based authentication. We prioritize privacy by minimizing personally identifiable data and using the underlying Interlink primitives for authentication and transaction settlement.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">Market proposal information</h2>
              <p className="mt-4">
                Market proposals and governance discussions are public by design, because the platform depends on transparency and shared curation. Users should not submit private or sensitive information within market descriptions or forum discussions.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">Data use and sharing</h2>
              <p className="mt-4">
                The platform uses collected data to support market creation, committee review, and the settlement process. Public market metadata and trade activity are visible on-chain or in platform interfaces, while private account details remain limited to wallet addresses and session metadata.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">Security and compliance</h2>
              <p className="mt-4">
                InterPredict follows best practices for decentralized applications: no centralized storage of secret keys, transparent transaction handling, and user control over wallet connections. Privacy is balanced with the need for a secure, auditable marketplace.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
