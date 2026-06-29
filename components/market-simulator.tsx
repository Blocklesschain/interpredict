"use client"

import { useMemo, useState } from "react"
import { Activity, CheckCircle2, RotateCcw, ShieldCheck, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"

type Side = "YES" | "NO"
type Stage = "select" | "review" | "settled"

const INITIAL_YES = 62
const STAKE = 25

function probabilityFor(side: Side | null, stage: Stage) {
  if (!side) return INITIAL_YES
  const delta = stage === "settled" ? 13 : 6
  return side === "YES" ? INITIAL_YES + delta : INITIAL_YES - delta
}

function MiniChart({ yes }: { yes: number }) {
  const points = [54, 58, 57, 61, INITIAL_YES, yes - 3, yes]
    .map((value, index) => `${(index / 6) * 100},${100 - value}`)
    .join(" ")

  return (
    <svg viewBox="0 0 100 46" className="h-24 w-full" aria-hidden="true">
      <defs>
        <linearGradient id="simulatorLine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#6200ee" />
          <stop offset="100%" stopColor="#ffa000" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke="url(#simulatorLine)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export function MarketSimulator() {
  const [side, setSide] = useState<Side | null>(null)
  const [stage, setStage] = useState<Stage>("select")

  const yes = probabilityFor(side, stage)
  const no = 100 - yes
  const sidePrice = side === "NO" ? no : yes
  const shares = useMemo(() => (STAKE / (sidePrice / 100)).toFixed(2), [sidePrice])

  function choose(nextSide: Side) {
    setSide(nextSide)
    setStage("review")
  }

  function reset() {
    setSide(null)
    setStage("select")
  }

  return (
    <section id="simulator" className="relative scroll-mt-28 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Functional Demo
            </span>
            <h2 className="mt-4 text-balance font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Interactive <span className="gradient-text">market simulator</span>
            </h2>
            <p className="mt-4 max-w-xl text-pretty leading-relaxed text-muted-foreground">
              Test the core flow from directional choice to finality. Pick YES or
              NO, review the simulated fill, and settle the demo position without
              using real funds.
            </p>
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                ["1", "Choose side"],
                ["2", "Review fill"],
                ["3", "Settle finality"],
              ].map(([step, label]) => (
                <div key={step} className="glass rounded-2xl p-4">
                  <div className="font-heading text-xl font-bold text-primary">
                    {step}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass overflow-hidden rounded-3xl p-4 shadow-2xl sm:p-6">
            <div className="rounded-[1.35rem] bg-background/70 p-4 ring-1 ring-border sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                    <Activity className="size-3.5 text-primary" />
                    Live demo market
                  </div>
                  <h3 className="mt-4 text-pretty font-heading text-xl font-bold leading-tight text-foreground sm:text-2xl">
                    Will InterPredict reach 250k active traders before Q4 2026?
                  </h3>
                </div>
                <div className="shrink-0 rounded-2xl bg-[#FFD700]/45 px-4 py-3 text-right ring-1 ring-[#FFD700]/70">
                  <div className="text-xs font-medium text-muted-foreground">
                    Pool
                  </div>
                  <div className="font-heading text-lg font-bold tabular-nums">
                    $842.7k
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.72fr]">
                <div className="glass rounded-2xl p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">
                      Probability
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      YES {yes}% / NO {no}%
                    </span>
                  </div>
                  <MiniChart yes={yes} />
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-500"
                      style={{ width: `${yes}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => choose("YES")}
                    className={`w-full rounded-2xl p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      side === "YES"
                        ? "bg-primary text-primary-foreground shadow-[0_18px_40px_-24px_rgba(98,0,238,0.75)]"
                        : "glass hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-heading text-lg font-bold">YES</span>
                      <span className="font-heading text-2xl font-bold tabular-nums">
                        {yes}¢
                      </span>
                    </div>
                    <div className={side === "YES" ? "text-primary-foreground/75" : "text-muted-foreground"}>
                      Buy if you think it resolves true.
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => choose("NO")}
                    className={`w-full rounded-2xl p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      side === "NO"
                        ? "bg-[#FFD700] text-foreground shadow-[0_18px_40px_-24px_rgba(255,160,0,0.75)]"
                        : "glass hover:border-[#FFD700]/70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-heading text-lg font-bold">NO</span>
                      <span className="font-heading text-2xl font-bold tabular-nums">
                        {no}¢
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Buy if you think it resolves false.
                    </div>
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-border bg-card/80 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      {stage === "settled" ? (
                        <CheckCircle2 className="size-4 text-primary" />
                      ) : stage === "review" ? (
                        <ShieldCheck className="size-4 text-primary" />
                      ) : (
                        <Timer className="size-4 text-accent" />
                      )}
                      {stage === "settled"
                        ? "Finality reached"
                        : stage === "review"
                          ? "Ready for confirmation"
                          : "Awaiting a YES or NO selection"}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {side
                        ? `$${STAKE} demo order buys ${shares} ${side} shares at ${sidePrice} cents.`
                        : "Select either side to preview price movement, shares, and settlement."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {stage === "settled" && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={reset}
                        className="h-11 rounded-xl"
                      >
                        <RotateCcw className="size-4" />
                        Reset
                      </Button>
                    )}
                    <Button
                      type="button"
                      disabled={!side || stage === "settled"}
                      onClick={() => setStage("settled")}
                      className="glow-purple h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-[#4f00c5] disabled:opacity-45"
                    >
                      Settle Demo
                    </Button>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Demo only. No wallet connection, real collateral, or live oracle
                settlement is used.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
