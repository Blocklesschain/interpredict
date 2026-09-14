'use client'

import { useEffect, useState } from 'react'
import { X, Send, Check, ExternalLink, Loader2, UserRound, ArrowRight } from 'lucide-react'
import { followCheck } from '@/lib/spin-to-win/client'
import type { SocialProvider } from '@/lib/spin-to-win/types'

type Step = 'intro' | 'check' | 'done'

type Props = {
  provider: SocialProvider
  token: string | null
  backendReady: boolean
  currentHandle: string | null
  onVerified: (provider: SocialProvider, handle: string) => void
}

const CHANNEL_URLS: Record<SocialProvider, string> = {
  x: 'https://x.com/InterPredict',
  telegram: 'https://t.me/InterPredict',
}

const BOT_HANDLE = 'InterPredictVerifyBot'

export function SocialConnect({
  provider,
  token,
  backendReady,
  currentHandle,
  onVerified,
}: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>(currentHandle ? 'done' : 'intro')
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err' | 'info'; text: string } | null>(null)

  const isX = provider === 'x'

  useEffect(() => {
    if (currentHandle) setStep('done')
  }, [currentHandle])

  const verify = async () => {
    const raw = username.trim().replace(/^@/, '')
    if (!raw) {
      setMessage({ type: 'err', text: `Enter your ${provider === 'x' ? 'X' : 'Telegram'} username.` })
      return
    }
    if (!token || !backendReady) {
      setMessage({ type: 'err', text: 'Backend connection not available yet. Please reconnect your wallet.' })
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const result = await followCheck(token, provider, raw)
      if (result.verified) {
        setMessage({ type: 'ok', text: `Verified! @${result.handle || raw} is following us.` })
        setStep('done')
        onVerified(provider, (result.handle || raw).toLowerCase())
      } else {
        setMessage({ type: 'err', text: 'Could not verify the follow. Please try again.' })
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : ''
      setMessage({ type: 'err', text: reason || 'Verification failed. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  if (step === 'done' && currentHandle) {
    return (
      <div className="flex w-full items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-4 py-3 text-sm font-semibold">
        <span className="flex items-center gap-2">
          {isX ? <X className="size-4 text-emerald-400" /> : <Send className="size-4 text-emerald-400" />}
          <span>@{currentHandle}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
          <Check className="size-3.5" /> Verified
        </span>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background/50">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
      >
        <span className="flex items-center gap-2">
          {isX ? <X className="size-4" /> : <Send className="size-4" />}
          Connect {isX ? 'X' : 'Telegram'} account
        </span>
        <span className="text-xs text-primary">{open ? 'Close' : 'Connect'}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-border p-4">
          {/* Telegram first-step nudge (no codes) */}
          {!isX && (
            <p className="rounded-lg bg-accent/10 px-3 py-2 text-xs text-muted-foreground">
              <strong className="text-accent">Tip:</strong> Open <strong className="text-foreground">@{BOT_HANDLE}</strong> on Telegram and send any message (or tap Start) once — it links your Telegram ID to your username. Then verify below.
            </p>
          )}

          {message && (
            <p className={`rounded-lg px-3 py-2 text-xs font-semibold ${message.type === 'ok' ? 'bg-emerald-400/10 text-emerald-400' : message.type === 'err' ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'}`}>
              {message.text}
            </p>
          )}

          {/* Follow / join link */}
          <a
            href={CHANNEL_URLS[provider]}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-background/60 px-4 py-2.5 text-sm font-bold text-primary ring-1 ring-border hover:ring-primary/40"
          >
            {isX ? <>Follow @InterPredict on X</> : <>Join @InterPredict on Telegram</>} <ExternalLink className="size-4" />
          </a>

          <p className="text-sm text-muted-foreground">
            Follow / join us above, then enter your {provider === 'x' ? 'X' : 'Telegram'} username to verify. Our system checks that you're following the account.
          </p>

          <div className="space-y-2">
            <input
              value={username}
              onChange={event => setUsername(event.target.value)}
              placeholder={provider === 'x' ? 'Your X username (without @)' : 'Your Telegram username (without @)'}
              onKeyDown={event => {
                if (event.key === 'Enter') void verify()
              }}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-primary focus:ring-2"
            />
            <button
              type="button"
              onClick={verify}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <UserRound className="size-4" />}
              Verify & connect
            </button>
          </div>
        </div>
      )}
    </div>
  )
}