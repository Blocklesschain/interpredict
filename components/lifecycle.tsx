import { FilePlus2, Vote, Droplets, BadgeCheck } from "lucide-react"

const phases = [
  {
    n: "01",
    icon: FilePlus2,
    phase: "Market Creation",
    tag: "The Proposal Phase",
    body: "To prevent spam and align incentives, a user connects their wallet and locks a minimum threshold of native Interlink (ITL) tokens into the core governance smart contract to submit a market proposal — e.g. \u201CWill BTC break $150k before Dec 31?\u201D",
  },
  {
    n: "02",
    icon: Vote,
    phase: "Decentralized Curation (DEC)",
    tag: "The Voting Phase",
    body: "The proposal populates a public Market Menu portal where members of the DEC vote to approve or reject it on formatting and validity. Fail the threshold and the creator's stake is safely returned; pass it and the contract officially initializes the market.",
  },
  {
    n: "03",
    icon: Droplets,
    phase: "Liquidity Deployment",
    tag: "The Trading Phase",
    body: "Custom AMM liquidity pools deploy dynamically on-chain. Users mint collateralized YES or NO outcome tokens with stablecoins or ITL, while the contract automatically updates real-time outcome probabilities from the changing token ratio inside the pool.",
  },
  {
    n: "04",
    icon: BadgeCheck,
    phase: "Resolution & Payout",
    tag: "The Settlement Phase",
    body: "On expiry the contract queries an Interlink-compatible decentralized oracle network to verify the real-world outcome. Winners burn their shares to claim collateralized payouts automatically, and a percentage of trading fees routes back to the market creator as ongoing yield.",
  },
]

export function Lifecycle() {
  return (
    <section id="architecture" className="relative py-24 sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-96 w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFD700]/18 blur-[140px]"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            How It Works
          </span>
          <h2 className="mt-4 text-balance font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Protocol architecture &amp;{" "}
            <span className="gradient-text">on-chain workflow</span>
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            InterPredict lets you trade fractionalized position shares to
            monetize your knowledge on real-world outcomes. Instead of a
            centralized team dictating listings, the entire platform runs
            through a transparent, permissionless lifecycle on-chain.
          </p>
        </div>

        <div className="relative mt-16 grid gap-6 lg:grid-cols-4">
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-[#FFD700] to-transparent lg:block"
          />
          {phases.map((p) => (
            <div key={p.n} id="features" className="relative">
              <div className="glass relative flex size-14 items-center justify-center rounded-2xl text-primary ring-1 ring-primary/20">
                <p.icon className="size-6" />
              </div>
              <div className="mt-6 font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent">
                Step {p.n}
              </div>
              <h3 className="mt-1 font-heading text-lg font-semibold">
                {p.phase}
              </h3>
              <div className="mt-1 text-sm font-semibold text-primary">{p.tag}</div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
