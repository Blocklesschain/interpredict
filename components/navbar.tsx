"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import { useWeb3 } from "@/app/context/Web3Context"

const links = [
  { label: "Markets", href: "#markets" },
  { label: "How it works", href: "#architecture" },
  { label: "Ecosystem", href: "#ecosystem" },
  { label: "Whitepaper", href: "/whitepaper" },
  {
    label: "About InterLink",
    href: "https://interlinklabs.ai/",
    external: true,
  },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const { walletAddress } = useWeb3()

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">
        <nav className="nav-glass flex items-center justify-between rounded-2xl px-4 py-3 sm:px-6">
          <a href="#" className="flex items-center gap-2.5">
            <Logo className="size-9 rounded-xl" />
            <span className="font-heading text-lg font-bold tracking-tight text-foreground">
              InterPredict
            </span>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                className="text-sm font-semibold text-foreground transition-[color,text-shadow] duration-200 hover:text-primary hover:[text-shadow:0_0_16px_rgba(98,0,238,0.22)]"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop App Link Trigger */}
          <div className="hidden md:flex md:items-center md:gap-2">
            <ThemeToggle />
            <Link
              href="/app"
              className={cn(
                buttonVariants(),
                "glow-purple rounded-full bg-primary px-5 font-semibold text-primary-foreground hover:bg-[#4f00c5]",
              )}
            >
              {walletAddress ? "Go to App" : "Launch App"}
            </Link>
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              className="rounded-xl p-2 text-foreground transition-colors hover:bg-secondary"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </nav>

        {/* Mobile App Menu Overlay */}
        {open && (
          <div className="nav-glass mt-2 flex flex-col gap-1 rounded-2xl p-3 md:hidden">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground transition-[background-color,color,text-shadow] duration-200 hover:bg-secondary/80 hover:text-primary hover:[text-shadow:0_0_14px_rgba(98,0,238,0.2)]"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/app"
              onClick={() => setOpen(false)}
              className={cn(
                buttonVariants(),
                "glow-purple mt-1 rounded-full bg-primary font-semibold text-primary-foreground hover:bg-[#4f00c5]",
              )}
            >
              {walletAddress ? "Go to App" : "Launch App"}
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}