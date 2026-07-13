"use client"

import { useState } from "react"
import { useWeb3 } from "@/app/context/Web3Context"
import { Menu, X } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSelector } from ".LanguageSelector"
import { cn } from "@/lib/utils"
import Link from "next/link"

export function Navbar() {
  const { t } = useWeb3()
  const [open, setOpen] = useState(false)

  // 🔮 Dynamic links array declared inside the component so it can use the translation engine
  const links = [
    { label: t('navMarkets'), href: "#markets" },
    { label: t('howItWorksBtn'), href: "#architecture" },
    { label: t('navEcosystem'), href: "#ecosystem" },
    { label: t('navWhitepaper'), href: "/whitepaper" },
    {
      label: t('navAbout'),
      href: "https://interlinklabs.ai/",
      external: true,
    },
  ]

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">
        <nav className="nav-glass flex items-center justify-between rounded-2xl px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="size-9 rounded-xl" />
            <span className="font-heading text-lg font-bold tracking-tight text-foreground">
              InterPredict
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-semibold text-foreground transition-[color,text-shadow] duration-200 hover:text-primary hover:[text-shadow:0_0_16px_rgba(98,0,238,0.22)]"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* DESKTOP NAV WRAPPER PANEL */}
          <div className="hidden md:flex md:items-center md:gap-3">
            <ThemeToggle />
            <LanguageSelector />
            <Link
              href="/app"
              className={cn(
                buttonVariants(),
                "glow-purple rounded-full bg-primary px-5 font-semibold text-primary-foreground hover:bg-[#4f00c5]",
              )}
            >
              {t('launchBtn')}
            </Link>
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              className="rounded-xl p-2 text-foreground transition-colors hover:bg-secondary"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </nav>

        {/* MOBILE LAYOUT COLLAPSE MENU CHANNELS */}
        {open && (
          <div className="nav-glass mt-2 flex flex-col gap-2 rounded-2xl p-3 md:hidden">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80 hover:text-primary"
              >
                {link.label}
              </a>
            ))}
            <div className="flex justify-between items-center px-3 py-1.5 border-t border-border/40 mt-1 pt-3">
              <span className="text-xs text-muted-foreground font-medium">Language:</span>
              <LanguageSelector />
            </div>
            <Link
              href="/app"
              onClick={() => setOpen(false)}
              className={cn(
                buttonVariants(),
                "glow-purple mt-2 rounded-full bg-primary font-semibold text-primary-foreground text-center",
              )}
            >
              {t('launchBtn')}
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}