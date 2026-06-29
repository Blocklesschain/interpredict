import { BackHomeButton } from '@/components/back-home-button'

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

          <section className="space-y-8 text-base leading-8 text-muted-foreground">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Scope and acceptance</h2>
              <p className="mt-4">
                These Terms of Service govern your use of InterPredict, a decentralized prediction marketplace built on the Interlink Network. By accessing or using the platform, you agree to the terms of service, privacy policies, and all relevant community governance rules.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">Decentralized marketplace participation</h2>
              <p className="mt-4">
                InterPredict is designed to allow users to create market proposals, participate in market curation, and trade positions in a permissionless way. Users may propose new markets when they meet platform criteria, and approved markets are made available for trading under our decentralized framework.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">Market proposal and review</h2>
              <p className="mt-4">
                When a user creates a market, it enters a review process conducted by the Decentralized Curation Committee. The committee reviews proposals for clear outcome definitions, measurable resolution conditions, and alignment with community standards before the market is listed.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">User responsibilities</h2>
              <p className="mt-4">
                Users are responsible for ensuring their proposals and trading activities follow applicable laws, platform rules, and the spirit of decentralized governance. Any abusive, misleading, or ambiguous market proposals may be rejected by the committee.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">Disclaimers</h2>
              <p className="mt-4">
                InterPredict is provided as a decentralized marketplace and does not offer financial, legal, or investment advice. The platform is inspired by Polymarket’s transparency and event-driven model, but negotiations and decisions are made by the community through governance and curation mechanisms.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
