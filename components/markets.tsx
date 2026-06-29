"use client"

import { useMemo, useState } from "react"
import {
  Bitcoin,
  Landmark,
  Trophy,
  Cpu,
  TrendingUp,
  Clapperboard,
  Globe,
  Search,
  X,
  Clock,
  BarChart3,
  Microscope,
  Thermometer,
  Music,
  Heart,
  Home,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

type Outcome = { label: string; prob: number }

type Market = {
  id: string
  category: string
  icon: LucideIcon
  question: string
  volume: string
  liquidity: string
  endDate: string
  outcomes: Outcome[]
  description: string
  history: number[]
}

const CATEGORIES = [
  "Trending",
  "Crypto",
  "Politics",
  "Sports",
  "Tech",
  "Economics",
  "Culture",
  "Science",
  "Climate",
  "Entertainment",
  "Health",
  "Real Estate",
] as const

const MARKETS: Market[] = [
  {
    id: "btc-150k",
    category: "Crypto",
    icon: Bitcoin,
    question: "Will Bitcoin break $150,000 before Dec 31, 2026?",
    volume: "$4.2m",
    liquidity: "$880k",
    endDate: "Dec 31, 2026",
    outcomes: [
      { label: "Yes", prob: 64 },
      { label: "No", prob: 36 },
    ],
    description:
      "Resolves YES if any major exchange (Coinbase, Binance, Kraken) prints a BTC/USD spot price at or above $150,000 before the cutoff, verified by the Interlink oracle network.",
    history: [38, 41, 45, 43, 52, 58, 55, 61, 64],
  },
  {
    id: "us-election",
    category: "Politics",
    icon: Landmark,
    question: "Which party wins the 2028 US Presidential Election?",
    volume: "$12.8m",
    liquidity: "$2.1m",
    endDate: "Nov 7, 2028",
    outcomes: [
      { label: "Democrats", prob: 47 },
      { label: "Republicans", prob: 46 },
      { label: "Independent", prob: 7 },
    ],
    description:
      "Resolves to the party of the candidate who wins a majority of Electoral College votes, as certified by Congress.",
    history: [50, 49, 48, 47, 45, 46, 48, 47, 47],
  },
  {
    id: "worldcup",
    category: "Sports",
    icon: Trophy,
    question: "Will Brazil win the 2026 FIFA World Cup?",
    volume: "$6.5m",
    liquidity: "$1.4m",
    endDate: "Jul 19, 2026",
    outcomes: [
      { label: "Yes", prob: 22 },
      { label: "No", prob: 78 },
    ],
    description:
      "Resolves YES if Brazil lifts the trophy in the final match of the 2026 tournament. Resolves NO otherwise.",
    history: [18, 19, 21, 20, 24, 23, 22, 21, 22],
  },
  {
    id: "agi-2027",
    category: "Tech",
    icon: Cpu,
    question: "Will a frontier lab announce AGI before 2028?",
    volume: "$3.1m",
    liquidity: "$540k",
    endDate: "Jan 1, 2028",
    outcomes: [
      { label: "Yes", prob: 18 },
      { label: "No", prob: 82 },
    ],
    description:
      "Resolves YES if OpenAI, Google DeepMind, or Anthropic publicly declares achievement of artificial general intelligence with third-party benchmark validation.",
    history: [12, 14, 13, 15, 16, 17, 16, 18, 18],
  },
  {
    id: "fed-cut",
    category: "Economics",
    icon: TrendingUp,
    question: "Will the Fed cut rates at the next FOMC meeting?",
    volume: "$8.9m",
    liquidity: "$1.9m",
    endDate: "Mar 18, 2026",
    outcomes: [
      { label: "Yes", prob: 71 },
      { label: "No", prob: 29 },
    ],
    description:
      "Resolves YES if the Federal Reserve announces a reduction to the federal funds target range at the next scheduled FOMC meeting.",
    history: [55, 58, 62, 60, 65, 68, 70, 69, 71],
  },
  {
    id: "eth-flip",
    category: "Crypto",
    icon: Bitcoin,
    question: "Will Ethereum flip Bitcoin by market cap in 2026?",
    volume: "$2.4m",
    liquidity: "$410k",
    endDate: "Dec 31, 2026",
    outcomes: [
      { label: "Yes", prob: 9 },
      { label: "No", prob: 91 },
    ],
    description:
      "Resolves YES if ETH total market capitalization exceeds BTC market capitalization at any point during 2026, per CoinGecko snapshots verified on-chain.",
    history: [11, 10, 12, 9, 8, 10, 9, 9, 9],
  },
  {
    id: "oscar",
    category: "Culture",
    icon: Clapperboard,
    question: "Will a streaming film win Best Picture at the 2027 Oscars?",
    volume: "$1.1m",
    liquidity: "$220k",
    endDate: "Mar 14, 2027",
    outcomes: [
      { label: "Yes", prob: 34 },
      { label: "No", prob: 66 },
    ],
    description:
      "Resolves YES if a film distributed primarily on a streaming platform wins the Academy Award for Best Picture.",
    history: [28, 30, 29, 32, 35, 33, 34, 35, 34],
  },
  {
    id: "spacex-mars",
    category: "Tech",
    icon: Globe,
    question: "Will SpaceX launch a crewed Mars mission before 2030?",
    volume: "$5.7m",
    liquidity: "$1.2m",
    endDate: "Jan 1, 2030",
    outcomes: [
      { label: "Yes", prob: 14 },
      { label: "No", prob: 86 },
    ],
    description:
      "Resolves YES if SpaceX launches a spacecraft carrying at least one human crew member on a trajectory toward Mars before January 1, 2030.",
    history: [16, 15, 17, 14, 13, 15, 14, 14, 14],
  },
  {
    id: "premier-league",
    category: "Sports",
    icon: Trophy,
    question: "Who wins the 2025/26 Premier League title?",
    volume: "$9.3m",
    liquidity: "$1.7m",
    endDate: "May 24, 2026",
    outcomes: [
      { label: "Man City", prob: 38 },
      { label: "Arsenal", prob: 33 },
      { label: "Liverpool", prob: 19 },
    ],
    description:
      "Resolves to the club that finishes top of the Premier League table at the end of the 2025/26 season.",
    history: [40, 39, 37, 38, 36, 35, 37, 38, 38],
  },
  {
    id: "cern-particle",
    category: "Science",
    icon: Microscope,
    question: "Will CERN confirm a new fundamental particle by end of 2027?",
    volume: "$1.8m",
    liquidity: "$320k",
    endDate: "Dec 31, 2027",
    outcomes: [
      { label: "Yes", prob: 12 },
      { label: "No", prob: 88 },
    ],
    description:
      "Resolves YES if CERN publishes a peer-reviewed paper confirming discovery of a particle outside the Standard Model, verified by at least one independent collaboration.",
    history: [10, 11, 10, 12, 11, 13, 12, 11, 12],
  },
  {
    id: "artemis-moon",
    category: "Science",
    icon: Globe,
    question: "Will NASA's Artemis crewed mission land on the Moon by Dec 2026?",
    volume: "$3.4m",
    liquidity: "$680k",
    endDate: "Dec 31, 2026",
    outcomes: [
      { label: "Yes", prob: 27 },
      { label: "No", prob: 73 },
    ],
    description:
      "Resolves YES if NASA's Artemis program successfully lands at least one astronaut on the lunar surface before January 1, 2027.",
    history: [30, 32, 28, 29, 27, 26, 28, 27, 27],
  },
  {
    id: "hottest-year-2026",
    category: "Climate",
    icon: Thermometer,
    question: "Will 2026 set a new global average temperature record?",
    volume: "$4.1m",
    liquidity: "$760k",
    endDate: "Jan 31, 2027",
    outcomes: [
      { label: "Yes", prob: 58 },
      { label: "No", prob: 42 },
    ],
    description:
      "Resolves YES if NASA GISS or NOAA confirms 2026 as the warmest year on record for global mean surface temperature.",
    history: [48, 50, 53, 55, 54, 57, 56, 58, 58],
  },
  {
    id: "co2-peak",
    category: "Climate",
    icon: Thermometer,
    question: "Will global CO₂ emissions peak before 2028?",
    volume: "$2.7m",
    liquidity: "$490k",
    endDate: "Dec 31, 2028",
    outcomes: [
      { label: "Yes", prob: 31 },
      { label: "No", prob: 69 },
    ],
    description:
      "Resolves YES if the IEA or IPCC reports that annual global CO₂ emissions in any year before 2028 are lower than all prior recorded years.",
    history: [25, 27, 28, 30, 29, 31, 32, 31, 31],
  },
  {
    id: "taylor-swift-album",
    category: "Entertainment",
    icon: Music,
    question: "Will Taylor Swift's next album break first-week streaming records?",
    volume: "$2.2m",
    liquidity: "$380k",
    endDate: "Dec 31, 2026",
    outcomes: [
      { label: "Yes", prob: 44 },
      { label: "No", prob: 56 },
    ],
    description:
      "Resolves YES if Taylor Swift releases a new studio album in 2026 that achieves more global Spotify streams in its first week than any prior album.",
    history: [40, 42, 43, 45, 44, 43, 45, 44, 44],
  },
  {
    id: "box-office-2026",
    category: "Entertainment",
    icon: Clapperboard,
    question: "Which franchise will lead the 2026 global box office?",
    volume: "$3.8m",
    liquidity: "$650k",
    endDate: "Dec 31, 2026",
    outcomes: [
      { label: "Marvel / MCU", prob: 41 },
      { label: "Star Wars", prob: 28 },
      { label: "Other", prob: 31 },
    ],
    description:
      "Resolves to the franchise whose highest-grossing 2026 theatrical release earns the most worldwide box office revenue, per Box Office Mojo.",
    history: [38, 40, 42, 41, 43, 42, 40, 41, 41],
  },
  {
    id: "weight-loss-drug",
    category: "Health",
    icon: Heart,
    question: "Will GLP-1 weight-loss drugs exceed $30B in global sales in 2026?",
    volume: "$5.5m",
    liquidity: "$1.1m",
    endDate: "Mar 31, 2027",
    outcomes: [
      { label: "Yes", prob: 67 },
      { label: "No", prob: 33 },
    ],
    description:
      "Resolves YES if combined global revenue for GLP-1 receptor agonist drugs (Ozempic, Wegovy, Mounjaro, Zepbound) exceeds $30 billion USD in calendar year 2026, per company earnings reports.",
    history: [55, 58, 60, 62, 64, 65, 66, 67, 67],
  },
  {
    id: "mrna-flu-vaccine",
    category: "Health",
    icon: Heart,
    question: "Will an mRNA flu vaccine achieve FDA approval before 2028?",
    volume: "$1.9m",
    liquidity: "$340k",
    endDate: "Dec 31, 2027",
    outcomes: [
      { label: "Yes", prob: 38 },
      { label: "No", prob: 62 },
    ],
    description:
      "Resolves YES if the FDA grants full approval (not EUA) to any mRNA-based influenza vaccine before January 1, 2028.",
    history: [30, 32, 33, 35, 36, 37, 36, 38, 38],
  },
  {
    id: "us-home-prices",
    category: "Real Estate",
    icon: Home,
    question: "Will US median home prices fall more than 10% by end of 2026?",
    volume: "$7.2m",
    liquidity: "$1.5m",
    endDate: "Dec 31, 2026",
    outcomes: [
      { label: "Yes", prob: 16 },
      { label: "No", prob: 84 },
    ],
    description:
      "Resolves YES if the NAR or Case-Shiller index shows US median existing-home sale price at least 10% below its peak recorded value before December 31, 2026.",
    history: [18, 17, 16, 15, 16, 17, 16, 16, 16],
  },
]

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 100 - ((d - min) / range) * 100
      return `${x},${y}`
    })
    .join(" ")
  const up = data[data.length - 1] >= data[0]
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={up ? "oklch(0.55 0.18 150)" : "oklch(0.58 0.24 27)"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function OutcomeBar({ outcome }: { outcome: Outcome }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{outcome.label}</span>
        <span className="font-semibold tabular-nums text-foreground">
          {outcome.prob}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${outcome.prob}%` }}
        />
      </div>
    </div>
  )
}

function MarketCard({
  market,
  onOpen,
}: {
  market: Market
  onOpen: (m: Market) => void
}) {
  const Icon = market.icon
  const isBinary =
    market.outcomes.length === 2 &&
    market.outcomes[0].label === "Yes" &&
    market.outcomes[1].label === "No"
  const topYes = market.outcomes[0]

  return (
    <button
      type="button"
      onClick={() => onOpen(market)}
      className="glass group flex h-full flex-col rounded-2xl p-5 text-left transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_70px_-38px_rgba(98,0,238,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="size-5" />
        </span>
        <h3 className="line-clamp-2 text-pretty text-sm font-semibold leading-snug text-foreground">
          {market.question}
        </h3>
      </div>

      <div className="mt-5 flex-1">
        {isBinary ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-heading text-2xl font-bold tabular-nums text-foreground">
                {topYes.prob}%
              </div>
              <div className="text-xs text-muted-foreground">chance</div>
            </div>
            <Sparkline data={market.history} className="h-10 w-24" />
          </div>
        ) : (
          <div className="space-y-2.5">
            {market.outcomes.map((o) => (
              <OutcomeBar key={o.label} outcome={o} />
            ))}
          </div>
        )}
      </div>

      {isBinary && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <span className="rounded-lg bg-primary/10 py-2 text-center text-sm font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            Buy Yes
          </span>
          <span className="rounded-lg bg-[#FFD700]/35 py-2 text-center text-sm font-semibold text-foreground transition-colors group-hover:bg-[#FFD700]">
            Buy No
          </span>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="tabular-nums">{market.volume} Vol</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          {market.endDate}
        </span>
      </div>
    </button>
  )
}

function MarketModal({
  market,
  onClose,
}: {
  market: Market
  onClose: () => void
}) {
  const Icon = market.icon
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#1E005A]/35 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={market.question}
      onClick={onClose}
    >
      <div
        className="glass max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Icon className="size-5" />
            </span>
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-primary">
                {market.category}
              </span>
              <h2 className="text-pretty font-heading text-lg font-bold leading-snug text-foreground">
                {market.question}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="glass mt-5 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <BarChart3 className="size-3.5" />
              Probability history
            </span>
            <span className="font-heading text-xl font-bold tabular-nums text-foreground">
              {market.outcomes[0].prob}%
            </span>
          </div>
          <Sparkline data={market.history} className="mt-3 h-20 w-full" />
        </div>

        <div className="mt-5 space-y-3">
          {market.outcomes.map((o) => (
            <OutcomeBar key={o.label} outcome={o} />
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button className="glow-purple h-11 rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-[#4f00c5]">
            Buy {market.outcomes[0].label}
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-xl border-[#FFD700]/70 bg-[#FFD700]/80 text-base font-semibold text-foreground hover:bg-[#FFD700]"
          >
            Buy {market.outcomes[1]?.label ?? "No"}
          </Button>
        </div>

        <div className="glass mt-5 grid grid-cols-3 gap-3 rounded-2xl p-4 text-center">
          <div>
            <div className="text-sm font-semibold tabular-nums text-foreground">
              {market.volume}
            </div>
            <div className="text-xs text-muted-foreground">Volume</div>
          </div>
          <div>
            <div className="text-sm font-semibold tabular-nums text-foreground">
              {market.liquidity}
            </div>
            <div className="text-xs text-muted-foreground">Liquidity</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              {market.endDate}
            </div>
            <div className="text-xs text-muted-foreground">Ends</div>
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-foreground">
            Resolution criteria
          </h3>
          <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground">
            {market.description}
          </p>
        </div>

        <p className="mt-5 rounded-lg bg-secondary/60 px-3 py-2 text-center text-xs text-muted-foreground">
          Demo market — for illustration only. No real funds are involved.
        </p>
      </div>
    </div>
  )
}

export function Markets() {
  const [active, setActive] = useState<(typeof CATEGORIES)[number]>("Trending")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Market | null>(null)

  const filtered = useMemo(() => {
    return MARKETS.filter((m) => {
      const matchesCat = active === "Trending" || m.category === active
      const matchesQuery = m.question
        .toLowerCase()
        .includes(query.toLowerCase())
      return matchesCat && matchesQuery
    })
  }, [active, query])

  return (
    <section id="markets" className="relative scroll-mt-24 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-balance font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Explore <span className="gradient-text">live markets</span>
            </h2>
            <p className="mt-2 text-pretty text-muted-foreground">
              Trade your insights on real-world outcomes. Click any market for
              full details.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search markets..."
              className="glass h-11 w-full rounded-full pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActive(cat)}
              className={
                "rounded-full px-4 py-2 text-sm font-medium transition-colors " +
                (active === cat
                  ? "gold-glow bg-[#FFD700] text-foreground"
                  : "glass text-foreground hover:border-primary/30 hover:text-primary")
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => (
              <MarketCard key={m.id} market={m} onOpen={setSelected} />
            ))}
          </div>
        ) : (
          <p className="mt-12 text-center text-muted-foreground">
            No markets match your search.
          </p>
        )}
      </div>

      {selected && (
        <MarketModal market={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  )
}
