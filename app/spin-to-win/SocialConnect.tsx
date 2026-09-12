'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Send, Check, ExternalLink, Copy, RefreshCw, Loader2, ArrowRight } from 'lucide-react'
import {
  requestPendingLink,
  verifyXAccountByTweet,
  getSocialLinks,
} from '@/lib/spin-to-win/client'
import type { SocialProvider, SocialLink } from '@/lib/spin-to-win/types'

type Step = 'instructions' | 'code' | 'verify' | 'done'

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
  const [step, setStep] = useState<Step>(currentHandle ? 'done' : 'instructions')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [handle, setHandle] = useState('')
  const [tweetUrl, setTweetUrl] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const telegramPollRef = useRef<number | null>(null)

  const isX = provider === 'x'

  useEffect(() => {
    if (currentHandle) setStep('done')
  }, [currentHandle])

  useEffect(() => {
    return () => {
      if (telegramPollRef.current) window.clearInterval(telegramPollRef.current)
    }
  }, [])

  const startVerification = async () => {
    setError('')
    if (!token || !backendReady) {
      setError('Backend connection not available yet. Please reconnect your wallet.')
      return
    }
    setLoading(true)
    setStep('code')
    try {
      const pending = await requestPendingLink(token, provider)
      setCode(pending.code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start verification.')
      setStep('instructions')
    } finally {
      setLoading(false)
    }
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore clipboard failures
    }
  }

  const pollTelegram = async () => {
    if (!token) return
    try {
      const { links } = await getSocialLinks(token)
      const tg = links.find((l: SocialLink) => l.provider === 'telegram' && l.verified)
      if (tg) {
        if (telegramPollRef.current) window.clearInterval(telegramPollRef.current)
        setStep('done')
        onVerified('telegram', tg.handle)
      }
    } catch {
      // keep polling
    }
  }

  const startTelegramPoll = () => {
    setError('')
    setStep('verify')
    if (telegramPollRef.current) window.clearInterval(telegramPollRef.current)
    telegramPollRef.current = window.setInterval(pollTelegram, 3000)
    void pollTelegram()
  }

  const submitXVerification = async () => {
    setError('')
    const trimmedHandle = handle.trim().replace(/^@/, '')
    const trimmedUrl = tweetUrl.trim()
    if (!trimmedHandle) {
      setError('Enter your X username.')
      return
    }
    if (!trimmedUrl) {
      setError('Paste the URL of your tweet that contains the code.')
      return
    }
    if (!token) {
      setError('Backend connection not available yet.')
      return
    }
    setLoading(true)
    try {
      const result = await verifyXAccountByTweet(token, trimmedHandle, trimmedUrl, code)
      setStep('done')
      onVerified('x', (result.username || trimmedHandle).toLowerCase())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'X verification failed.')
    } finally {
      setLoading(false)
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
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
              {error}
            </p>
          )}

          {step === 'instructions' && (
            <>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">1</span>
                  <span>
                    {isX ? (
                      <>Follow <strong className="text-foreground">@InterPredict</strong> on X.</>
                    ) : (
                      <>Join our <strong className="text-foreground">Telegram channel</strong>.</>
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">2</span>
                  <span>Generate a one-time verification code.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">3</span>
                  <span>
                    {isX ? (
                      <>Post the code in a tweet, then paste its URL to confirm.</>
                    ) : (
                      <>Message the code to our verification bot, then confirm.</>
                    )}
                  </span>
                </li>
              </ol>
              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href={CHANNEL_URLS[provider]}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-background/60 px-4 py-2 text-sm font-bold text-primary ring-1 ring-border hover:ring-primary/40"
                >
                  {isX ? <>Follow on X</> : <>Join on Telegram</>} <ExternalLink className="size-4" />
                </a>
                <button
                  type="button"
                  onClick={startVerification}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-[#4f00c5] disabled:opacity-60"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                  Get code
                </button>
              </div>
            </>
          )}

          {step === 'code' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {isX ? (
                  <>Post a tweet (or reply) containing this exact code, then paste the tweet URL below.</>
                ) : (
                  <>Open Telegram and message <strong className="text-foreground">@{BOT_HANDLE}</strong> with this exact code.</>
                )}
              </p>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-accent/40 bg-background/70 px-3 py-2">
                <code className="font-mono text-lg font-extrabold tracking-[0.15em] text-accent">{code}</code>
                <button
                  type="button"
                  onClick={copyCode}
                  className="inline-flex items-center gap-1 rounded-md bg-background/70 px-2 py-1 text-xs font-bold text-muted-foreground ring-1 ring-border hover:text-primary"
                >
                  {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="text-[11px] text-muted-foreground">Code expires in 10 minutes.</div>

              {isX ? (
                <div className="space-y-2">
                  <input
                    value={handle}
                    onChange={event => setHandle(event.target.value)}
                    placeholder="Your X username (without @)"
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-primary focus:ring-2"
                  />
                  <input
                    value={tweetUrl}
                    onChange={event => setTweetUrl(event.target.value)}
                    placeholder="Paste tweet URL, e.g. https://x.com/you/status/123"
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-primary focus:ring-2"
                  />
                  <button
                    type="button"
                    onClick={submitXVerification}
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground hover:opacity-90 disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Verify & connect
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <a
                    href={`https://t.me/${BOT_HANDLE}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-background/60 px-4 py-2.5 text-sm font-bold text-primary ring-1 ring-border hover:ring-primary/40"
                  >
                    Open @{BOT_HANDLE} in Telegram <ExternalLink className="size-4" />
                  </a>
                  <button
                    type="button"
                    onClick={startTelegramPoll}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground hover:opacity-90"
                  >
                    <RefreshCw className="size-4" /> I've sent the code — check
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'verify' && (
            <div className="flex items-center gap-3 py-2">
              <Loader2 className="size-5 animate-spin text-accent" />
              <p className="text-sm text-muted-foreground">
                Waiting for verification… be sure you messaged <strong className="text-foreground">@{BOT_HANDLE}</strong> with the code.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}