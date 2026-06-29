import { Send } from "lucide-react"
import { Logo } from "@/components/logo"

const X_URL = "https://x.com/interpredict"
const TELEGRAM_URL = "https://t.me/interpredict"

const socials = [
  {
    label: "Follow InterPredict on X",
    href: X_URL,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "Join InterPredict on Telegram",
    href: TELEGRAM_URL,
    icon: <Send className="size-4" />,
  },
]

const groups = [
  {
    title: "Community",
    links: [
      { label: "Documentation", href: "/documentation" },
      { label: "Governance Forum", href: "/governance-forum" },
      { label: "Whitepaper", href: "/whitepaper" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "Terms of Service", href: "/terms-of-service" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Risk Disclosure", href: "/risk-disclosure" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-white/45 py-16 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_repeat(2,1fr)]">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo className="size-9 rounded-xl" />
              <span className="font-heading text-lg font-bold tracking-tight">
                InterPredict
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A decentralized, community-owned prediction marketplace built
              natively on the Interlink Network.
            </p>

            <div className="mt-6 flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="glass flex size-10 items-center justify-center rounded-xl text-foreground transition-colors hover:border-primary/30 hover:bg-primary hover:text-primary-foreground"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {groups.map((g) => (
            <div key={g.title}>
              <h3 className="font-heading text-sm font-semibold">{g.title}</h3>
              <ul className="mt-4 space-y-3">
                {g.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm font-medium text-foreground transition-[color,text-shadow] duration-200 hover:text-primary hover:[text-shadow:0_0_14px_rgba(98,0,238,0.2)]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} InterPredict. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Create the Market. Predict the Future. Earn from the Outcome.
          </p>
        </div>
      </div>
    </footer>
  )
}
