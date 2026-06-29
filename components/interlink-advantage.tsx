import { Zap, Cpu, Link2, Coins } from "lucide-react"

const advantages = [
  {
    icon: Zap,
    title: "Ultra-Low Latency",
    body: "Markets settle and update in real time. Interlink's high-throughput execution keeps trading snappy even under heavy load.",
  },
  {
    icon: Cpu,
    title: "Decentralized State Machine",
    body: "Every proposal, vote and trade runs through Interlink's verifiable state machine — fully transparent and tamper-resistant.",
  },
  {
    icon: Link2,
    title: "Cross-Chain Infrastructure",
    body: "Inherit native cross-chain capability, letting liquidity and collateral flow across ecosystems without fragile bridges.",
  },
  {
    icon: Coins,
    title: "Native Token Synergy",
    body: "Direct alignment with Interlink's native token utility powers governance, staking and market creation incentives.",
  },
]

export function InterlinkAdvantage() {
  return (
    <section id="ecosystem" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Ecosystem Integration
          </span>
          <h2 className="mt-4 text-balance font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            The <span className="gradient-text">Interlink Network</span> advantage
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            By launching natively on Interlink, InterPredict inherits the raw
            infrastructure of a modern, decentralized network — not a sidechain
            bolted on after the fact.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {advantages.map((a) => (
            <div
              key={a.title}
              className="glass group rounded-2xl p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_70px_-38px_rgba(98,0,238,0.45)]"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <a.icon className="size-5" />
              </div>
              <h3 className="mt-5 font-heading text-lg font-semibold">
                {a.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {a.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
