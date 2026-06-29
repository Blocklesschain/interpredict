import { BackHomeButton } from '@/components/back-home-button'

export default function GovernanceForumPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="glass rounded-[2rem] border border-border bg-white/85 p-10 shadow-2xl dark:bg-[#120025]/90">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-accent">
              Governance Forum
            </p>
            <h1 className="mt-4 text-4xl font-heading font-bold tracking-tight text-foreground sm:text-5xl">
              Decentralized decision-making and market curation
            </h1>
          </div>

          <div className="mb-8">
            <BackHomeButton />
          </div>

          <section className="space-y-6 text-base leading-8 text-muted-foreground">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Committee-led curation</h2>
              <p className="mt-4">
                InterPredict uses a Decentralized Curation Committee to review new market proposals and maintain quality across the marketplace. Committee members evaluate proposals for clarity, fairness, and compliance with platform policies.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">Submitting proposals</h2>
              <p className="mt-4">
                Users bring forward ideas for new prediction markets through the governance forum. Each proposal should clearly define outcomes, specify measurement methods, and explain why the event belongs on InterPredict.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">Voting process</h2>
              <p className="mt-4">
                After submission, markets are reviewed and voted on by the committee. The forum is the place where discussion happens, concerns are raised, and committee reasoning is documented for transparency.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">Community participation</h2>
              <p className="mt-4">
                The governance forum is designed for active community participation. Members can share insights, flag ambiguous questions, and recommend improvements before the market is accepted.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">Dispute and finalization</h2>
              <p className="mt-4">
                Once a market is voted live, the forum remains the reference point for dispute resolution. Outcomes are finalized through transparent evidence review and committee consensus.
              </p>
            </div>

            <div className="rounded-3xl bg-secondary/60 p-6">
              <p className="text-sm font-semibold text-foreground">Why governance matters</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Strong governance ensures markets are fair, trusted, and aligned with the decentralized ethos of InterPredict. It also makes the platform resilient against low-quality or misleading speculation.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
