import Image from "next/image"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 pb-12 sm:pt-44 sm:pb-16">
      {/* ambient glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[12%] top-8 -z-10 h-[520px] w-[520px] rounded-full bg-primary/12 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[8%] top-20 -z-10 h-[420px] w-[420px] rounded-full bg-[#FFD700]/25 blur-[130px]"
      />
      <div className="cosmic-grid pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />

      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <div className="glass mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-foreground">
          <Image
            src="/images/interlink-network-logo.jfif"
            alt=""
            width={22}
            height={22}
            className="size-5 rounded-full object-cover ring-1 ring-primary/20"
          />
          Built natively on the Interlink Network
        </div>

        <h1 className="mt-6 text-balance font-heading text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
          Trade your insights on{" "}
          <span className="gradient-text">anything &amp; everything</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          A community-owned prediction marketplace. Create the market, predict
          the future, and earn from the outcome.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href="#markets"
            className={cn(
              buttonVariants({ size: "lg" }),
              "glow-purple h-12 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground hover:bg-[#4f00c5]",
            )}
          >
            Explore Markets
          </a>
          <a
            href="#simulator"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "gold-glow h-12 rounded-full border-[#FFD700]/70 bg-[#FFD700] px-7 text-base font-semibold text-foreground hover:bg-[#FFA000]",
            )}
          >
            View Mobile Demo
          </a>
        </div>

        <dl className="mx-auto mt-12 grid max-w-lg grid-cols-3 gap-6">
          {[
            { v: "Ultra-low", l: "latency execution" },
            { v: "On-chain", l: "AMM liquidity" },
            { v: "Community", l: "owned & curated" },
          ].map((s) => (
            <div key={s.l}>
              <dt className="font-heading text-xl font-bold text-foreground">
                {s.v}
              </dt>
              <dd className="mt-1 text-xs text-muted-foreground">{s.l}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
