import { BackHomeButton } from '@/components/back-home-button'

export default function RiskDisclosurePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="glass rounded-[2rem] border border-border bg-white/90 p-10 shadow-2xl dark:bg-[#120025]/90">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-accent">
              Risk Disclosure
            </p>
            <h1 className="mt-4 text-4xl font-heading font-bold tracking-tight text-foreground sm:text-5xl">
              Market Risk and Participant Notice
            </h1>
          </div>

          <div className="mb-8">
            <BackHomeButton />
          </div>

          <section className="space-y-8 text-base leading-8 text-muted-foreground">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Trading risk</h2>
              <p className="mt-4">
                Trading in prediction markets carries financial risk. Market prices reflect collective expectations, and outcome uncertainty may lead to loss. InterPredict is intended for speculative participation, not investment advice.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">Decentralized market risk</h2>
              <p className="mt-4">
                Because InterPredict is a decentralized platform, users assume responsibility for the markets they create and trade. The Decentralized Curation Committee helps screen proposals, but final settlement is determined by outcome criteria and network state.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">Proposal and committee risk</h2>
              <p className="mt-4">
                Market proposals are reviewed by the committee, but approval does not guarantee clarity or accuracy. Users should carefully evaluate the terms of each market and understand that committee curation is a governance layer, not a regulatory guarantee.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">Reference and inspiration</h2>
              <p className="mt-4">
                InterPredict is inspired by Polymarket’s whitepaper model of open event markets and transparent settlement. We emphasize that decentralized market design introduces both opportunity and risk, and participants should use appropriate caution.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">No roadmap promises</h2>
              <p className="mt-4">
                This disclosure does not include specific timeline commitments. InterPredict focuses on decentralized governance, market integrity, and user-driven curation rather than fixed delivery dates.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
