'use client'

import Link from 'next/link'
import {
  ChevronDown,
  Home,
  LogOut,
  RefreshCw,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useWeb3 } from '@/app/context/Web3Context'
import { Logo } from '@/components/logo'
import { LanguageSelector } from '@/components/LanguageSelector'
import { ThemeToggle } from '@/components/theme-toggle'
import { primaryButton, secondaryButton } from './ProtocolUI'

export type WorkspaceTab = {
  id: string
  label: string
  icon: LucideIcon
}

export function AppShell({
  tabs,
  activeTab,
  onTabChange,
  onRefresh,
  refreshing,
  children,
}: {
  tabs: WorkspaceTab[]
  activeTab: string
  onTabChange: (tab: string) => void
  onRefresh: () => void
  refreshing: boolean
  children: ReactNode
}) {
  const {
    account,
    connectWallet,
    disconnectWallet,
    isConnecting,
    isConfigured,
    isCorrectNetwork,
    switchNetwork,
    txStatus,
    txError,
    clearTransactionStatus,
    t,
  } = useWeb3()
  const [menuOpen, setMenuOpen] = useState(false)
  const selected = tabs.find(tab => tab.id === activeTab) ?? tabs[0]

  const selectTab = (tab: string) => {
    onTabChange(tab)
    setMenuOpen(false)
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-16 text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="focus-ring flex items-center gap-2.5 rounded-xl">
            <Logo className="size-9 rounded-xl" />
            <span className="hidden font-heading text-lg font-bold sm:inline">
              InterPredict
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className={`${secondaryButton} px-3`}
              aria-label={t('refresh')}
            >
              <RefreshCw
                className={`size-4 ${refreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">{t('refresh')}</span>
            </button>
            <Link
              href="/"
              className={`${secondaryButton} hidden px-3 md:inline-flex`}
            >
              <Home className="size-4" aria-hidden="true" />
              {t('home')}
            </Link>
            <div className="hidden items-center gap-1 sm:flex">
              <ThemeToggle />
              <LanguageSelector />
            </div>
            {account ? (
              <div className="flex items-center gap-1 rounded-full border border-border bg-secondary/50 p-1 pl-3">
                <span className="font-mono text-xs">
                  {account.slice(0, 6)}…{account.slice(-4)}
                </span>
                <button
                  type="button"
                  onClick={disconnectWallet}
                  aria-label={t('disconnectWallet')}
                  className="focus-ring rounded-full p-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void connectWallet()}
                disabled={isConnecting}
                className={`${primaryButton} px-3 sm:px-4`}
              >
                <Wallet className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">
                  {isConnecting ? '…' : t('connectWallet')}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pt-28 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
        <div className="relative z-30 lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(open => !open)}
            aria-expanded={menuOpen}
            aria-controls="workspace-mobile-tabs"
            className={`${secondaryButton} w-full justify-between`}
          >
            <span className="flex items-center gap-2">
              {selected && <selected.icon className="size-4" aria-hidden="true" />}
              {selected?.label}
            </span>
            {menuOpen ? (
              <X className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
          </button>
          {menuOpen && (
            <div
              id="workspace-mobile-tabs"
              role="tablist"
              aria-label="Protocol workspace"
              className="protocol-panel absolute inset-x-0 top-full mt-2 space-y-1 bg-background p-2 shadow-2xl"
            >
              {tabs.map(tab => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  key={tab.id}
                  onClick={() => selectTab(tab.id)}
                  className={`focus-ring flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-secondary'
                  }`}
                >
                  <tab.icon className="size-4" aria-hidden="true" />
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <aside
          role="tablist"
          aria-label="Protocol workspace"
          className="protocol-panel sticky top-28 hidden h-fit space-y-1 p-2 lg:block"
        >
          {tabs.map(tab => (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              className={`focus-ring flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <tab.icon className="size-4" aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </aside>

        <main className="min-w-0">
          {!isConfigured && (
            <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
              {t('configureContract')}
            </div>
          )}
          {account && !isCorrectNetwork && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              <span>{t('wrongNetwork')}</span>
              <button
                type="button"
                onClick={() => void switchNetwork()}
                className={primaryButton}
              >
                {t('switchNetwork')}
              </button>
            </div>
          )}
          <section
            role="tabpanel"
            aria-label={selected?.label}
            className="protocol-panel min-h-[560px] p-4 sm:p-6"
          >
            {children}
          </section>
        </main>
      </div>

      {(txStatus || txError) && (
        <div
          role={txError ? 'alert' : 'status'}
          aria-live={txError ? 'assertive' : 'polite'}
          className={`fixed bottom-5 right-5 z-[70] flex max-w-sm items-start gap-3 rounded-xl border p-4 text-sm shadow-2xl ${
            txError
              ? 'border-rose-500/40 bg-rose-950 text-rose-100'
              : 'border-primary/40 bg-background text-foreground'
          }`}
        >
          <span className="min-w-0 break-words">{txError || txStatus}</span>
          <button
            type="button"
            onClick={clearTransactionStatus}
            aria-label={t('close')}
            className="focus-ring rounded-md p-1"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
