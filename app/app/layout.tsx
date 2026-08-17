'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/useLocale'
import { useTheme } from '@/hooks/useTheme'
import { getWalletState, connectWallet, disconnectWallet, subscribe } from '@/services/wallet/wallet'
import { SUPPORTED_LOCALES, type Locale } from '@/i18n/index'
import { cn } from '@/lib/utils'
import { Menu, X, Sun, Moon, Monitor, Globe, Wallet } from 'lucide-react'

// ---------------------------------------------------------------------------
// App layout with responsive navigation (V2 §34, §35, §36).
// Primary destinations immediately discoverable, not buried in dropdowns.
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { href: '/app/marketplace', labelKey: 'nav.marketplace' as const },
  { href: '/app/proposals', labelKey: 'nav.proposals' as const },
  { href: '/app/activity', labelKey: 'nav.activity' as const },
  { href: '/app/create', labelKey: 'nav.create' as const },
  { href: '/app/dec', labelKey: 'nav.dec' as const },
  { href: '/app/help', labelKey: 'nav.help' as const },
]

const THEME_ICONS: Record<string, React.ReactNode> = {
  dark: <Moon className="size-4" />,
  light: <Sun className="size-4" />,
  system: <Monitor className="size-4" />,
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useLocale()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(getWalletState().address)

  // Subscribe to wallet state changes
  useState(() => {
    return subscribe(() => {
      setWalletAddress(getWalletState().address)
    })
  })

  const handleConnect = async () => {
    try {
      await connectWallet()
    } catch {
      // Error handled by the wallet service
    }
  }

  const handleDisconnect = () => {
    disconnectWallet()
  }

  const cycleTheme = () => {
    const themes: Array<'dark' | 'light' | 'system'> = ['dark', 'light', 'system']
    const idx = themes.indexOf(theme)
    setTheme(themes[(idx + 1) % themes.length])
  }

  const cycleLocale = () => {
    const idx = SUPPORTED_LOCALES.indexOf(locale)
    setLocale(SUPPORTED_LOCALES[(idx + 1) % SUPPORTED_LOCALES.length])
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 h-14">
          {/* Logo + Home */}
          <div className="flex items-center gap-6">
            <Link href="/app" className="text-lg font-bold tracking-tight">
              {t('app.title')}
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t(item.labelKey)}
                </Link>
              ))}
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Locale */}
            <Button variant="ghost" size="icon-sm" onClick={cycleLocale} title={locale.toUpperCase()}>
              <Globe className="size-4" />
            </Button>

            {/* Theme */}
            <Button variant="ghost" size="icon-sm" onClick={cycleTheme} title={theme}>
              {THEME_ICONS[theme]}
            </Button>

            {/* Wallet */}
            {walletAddress ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs text-muted-foreground font-mono">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  {t('wallet.disconnect')}
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={handleConnect}>
                <Wallet className="size-4 mr-1" />
                {t('wallet.connect')}
              </Button>
            )}

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="border-t border-border md:hidden">
            <div className="flex flex-col gap-1 p-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t(item.labelKey)}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Page content */}
      <main>{children}</main>
    </div>
  )
}