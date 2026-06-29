import { Check } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const points = [
  "Choose YES or NO and preview probability movement instantly",
  "Review a simulated fill without connecting a wallet",
  "Settle the demo position to see finality in action",
]

export function MobileHighlight() {
  return (
    <section id="prototype" className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="glass grid items-center gap-8 overflow-hidden rounded-2xl p-6 sm:p-8 lg:grid-cols-[0.95fr_0.8fr]">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Functional Demo
            </span>
            <h2 className="mt-3 text-balance font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Interactive <span className="gradient-text">market simulator</span>
            </h2>
            <p className="mt-3 max-w-xl text-pretty leading-relaxed text-muted-foreground">
              Test the core InterPredict flow from directional choice to finality.
              The demo lets users explore market mechanics without using real
              funds or connecting a wallet.
            </p>

            <ul className="mt-6 space-y-3">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-accent ring-1 ring-primary/30">
                    <Check className="size-3 text-primary" />
                  </span>
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    {p}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="#simulator"
              className={cn(
                buttonVariants({ size: "default" }),
                "glow-purple mt-6 rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-[#4f00c5]",
              )}
            >
              Open Interactive Prototype
            </a>
          </div>

          <div className="flex justify-center">
            <PhoneMock />
          </div>
        </div>
      </div>
    </section>
  )
}

function PhoneMock() {
  return (
    <div className="relative w-[220px]">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 m-auto h-60 w-60 rounded-full bg-[#FFD700]/25 blur-[70px]"
      />
      <div className="glass rounded-[2.5rem] p-3 shadow-2xl">
        <div className="overflow-hidden rounded-[2rem] bg-[#FAF9FF]">
          <div className="flex items-center justify-between px-5 pt-5 text-xs text-muted-foreground">
            <span>9:41</span>
            <span>InterPredict</span>
          </div>

          <div className="p-4">
            <div className="text-xs text-muted-foreground">Trending Market</div>
            <div className="mt-2 font-heading text-sm font-semibold leading-snug">
              Will ETH close above $5,000 by Q4?
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-primary/15 p-3 ring-1 ring-primary/30">
                <div className="text-xs text-muted-foreground">YES</div>
                <div className="font-heading text-lg font-bold text-foreground">
                  64¢
                </div>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <div className="text-xs text-muted-foreground">NO</div>
                <div className="font-heading text-lg font-bold text-foreground">
                  36¢
                </div>
              </div>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-primary to-accent" />
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span>64% probability</span>
              <span>$1.2M pool</span>
            </div>

            <div className="mt-5 rounded-xl bg-gradient-to-r from-primary to-[#FFD700] py-2.5 text-center text-sm font-semibold text-primary-foreground">
              Trade Position
            </div>

            <div className="mt-4 space-y-2">
              {["Fed cuts rates in March", "BTC ETF inflows top $5B"].map(
                (m) => (
                  <div
                    key={m}
                    className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2"
                  >
                    <span className="text-[11px] text-muted-foreground">{m}</span>
                    <span className="text-[11px] font-semibold text-accent">
                      Vote
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
