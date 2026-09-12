'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, ChevronDown, Coins, ExternalLink, Link2, Plus, Send, ShieldCheck, TimerReset, Volume2, VolumeX, WalletCards, X, Zap } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { useWeb3 } from '@/app/context/Web3Context'
import { SocialConnect } from './SocialConnect'
import {
  isBackendAvailable,
  authenticate,
  getStoredToken,
  getServerState,
  getTasks as fetchServerTasks,
  recordResult as recordServerResult,
  submitVerification,
  getAdminLedger,
} from '@/lib/spin-to-win/client'

const prizes = [
  { label: '2.1 ITP', detail: 'A little lucky start', color: '#7c3aed', weight: 28 },
  { label: '21 ITP', detail: 'A bright hit', color: '#db2777', weight: 22 },
  { label: '210 ITP', detail: 'Now we are talking', color: '#ea580c', weight: 10 },
  { label: '2,100 ITP', detail: 'The biggest reward', color: '#ca8a04', weight: 10 },
  { label: 'NIL ITP', detail: 'No reward this time', color: '#65a30d', weight: 5 },
  { label: '1 SPIN', detail: 'Another chance', color: '#0d9488', weight: 10 },
  { label: '2 SPINS', detail: 'Keep the momentum', color: '#0284c7', weight: 10 },
  { label: 'Try Again', detail: 'Fortune is fickle', color: '#4f46e5', weight: 5 },
]

type TaskKind = 'x-like' | 'x-post' | 'x-quote' | 'x-follow' | 'telegram-follow'
type Task = { id: string; kind: TaskKind; title: string; description: string; href: string; active: boolean; createdSession: number; source?: 'default' | 'admin' }
type AccountLinks = { x: string | null; telegram: string | null }
type WalletReward = { wallet: string; itp: number; spins: number }

const defaultTasks = (createdSession: number): Task[] => [
  { id: `daily-x-like-${createdSession}`, kind: 'x-like', title: 'Like the daily X post', description: 'Like the featured InterPredict post on X.', href: 'https://x.com/InterPredict', active: true, createdSession, source: 'default' },
  { id: `daily-x-retweet-${createdSession}`, kind: 'x-quote', title: 'Quote the daily X post', description: 'Quote-post the daily prompt and share your prediction.', href: 'https://x.com/InterPredict', active: true, createdSession, source: 'default' },
  { id: `daily-telegram-${createdSession}`, kind: 'telegram-follow', title: 'Join InterPredict Telegram', description: 'Follow the official community channel for daily drops.', href: 'https://t.me/interpredict', active: true, createdSession, source: 'default' },
]

const multipliers = [
  { value: 1, cost: 'Free', label: 'Standard spin' },
  { value: 2, cost: '0.01 tITL', label: 'X2 multiplier' },
  { value: 5, cost: '0.02 tITL', label: 'X5 multiplier' },
  { value: 15, cost: '0.05 tITL', label: 'X15 multiplier' },
  { value: 50, cost: '0.1 tITL', label: 'X50 multiplier' },
]

const segmentAngle = 360 / prizes.length
const SESSION_LENGTH = 12 * 60 * 60 * 1000
const stateKey = 'interpredict-spin-to-win-v2'
const tasksStateKey = `${stateKey}:tasks`
const rewardsStateKey = `${stateKey}:rewards`
const ADMIN_ADDRESS = '0x6e832252ea4c78068ee109d953724d2762431992'

function getWindowStart(now: number) {
  return Math.floor(now / SESSION_LENGTH) * SESSION_LENGTH
}

function getDayStart(now: number) {
  return new Date(new Date(now).setHours(0, 0, 0, 0)).getTime()
}

function formatTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function taskIcon(kind: TaskKind) {
  if (kind === 'telegram-follow') return <Send className="size-4" />
  if (kind === 'x-follow') return <ShieldCheck className="size-4" />
  return <ExternalLink className="size-4" />
}

export default function SpinToWinPage() {
  const { walletAddress, txStatus, connectWallet, disconnectWallet } = useWeb3()
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [winner, setWinner] = useState<(typeof prizes)[number] | null>(null)
  const [soundOn, setSoundOn] = useState(true)
  const [now, setNow] = useState(0)
  const [spinsUsed, setSpinsUsed] = useState(0)
  const [bonusSpins, setBonusSpins] = useState(0)
  const [verifiedTaskIds, setVerifiedTaskIds] = useState<string[]>([])
  const [submittedTaskId, setSubmittedTaskId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<AccountLinks>({ x: null, telegram: null })
  const [selectedMultiplier, setSelectedMultiplier] = useState(1)
  const [showMultiplierMenu, setShowMultiplierMenu] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [wonItp, setWonItp] = useState(0)
  const [walletRewards, setWalletRewards] = useState<WalletReward[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskUrl, setNewTaskUrl] = useState('')
  const [newTaskKind, setNewTaskKind] = useState<TaskKind>('x-like')
  const [taskLinks, setTaskLinks] = useState<Record<string, string>>({})
  const [loadedWalletState, setLoadedWalletState] = useState<string | null>(null)
  const [loadedTasks, setLoadedTasks] = useState(false)
  const [backendReady, setBackendReady] = useState(false)
  const [serverToken, setServerToken] = useState<string | null>(null)
  const [serverSyncedWallet, setServerSyncedWallet] = useState<string | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const soundTimerRef = useRef<number | null>(null)

  const isWalletConnected = Boolean(walletAddress)
  const isAdmin = walletAddress?.toLowerCase() === ADMIN_ADDRESS.toLowerCase()
  const sessionStart = getWindowStart(now)
  const dayStart = getDayStart(now)
  const sessionEndsIn = sessionStart + SESSION_LENGTH - now
  const nextSessionIn = sessionEndsIn
  const tasksCompletedToday = verifiedTaskIds.filter(id => id.startsWith(`${dayStart}-`)).length
  const connected = isWalletConnected && Boolean(accounts.x && accounts.telegram)
  const remainingSpins = Math.max(0, 3 - spinsUsed) + bonusSpins
  const walletStateKey = walletAddress ? `${stateKey}:wallet:${walletAddress.toLowerCase()}` : null

  useEffect(() => {
    setNow(Date.now())
  }, [])

  useEffect(() => {
    if (!walletAddress) {
      setServerToken(null)
      setServerSyncedWallet(null)
      return
    }
    const detectAndSync = async () => {
      const ready = await isBackendAvailable()
      setBackendReady(ready)
      if (!ready) {
        setServerToken(null)
        return
      }
      const stored = getStoredToken()
      let token = stored?.wallet === walletAddress.toLowerCase() ? stored.token : null
      if (!token) {
        try {
          const session = await authenticate(walletAddress)
          token = session.accessToken
        } catch {
          token = null
        }
      }
      setServerToken(token)
      if (!token) {
        setServerSyncedWallet(walletAddress.toLowerCase())
        return
      }
      try {
        const state = await getServerState(sessionStart, token)
        if (state.sessionStart === sessionStart) {
          if (state.bonusSpins > 0) setBonusSpins(state.bonusSpins)
          if (state.verifiedTaskIds.length) setVerifiedTaskIds(state.verifiedTaskIds)
          // Server is authoritative: `state.accounts` only contains VERIFIED
          // handles, so it both unlocks and revokes connected status.
          setAccounts(state.accounts)
        }
        const serverTasks = await fetchServerTasks()
        if (serverTasks.tasks.length) setTasks(serverTasks.tasks as Task[])
        setServerSyncedWallet(walletAddress.toLowerCase())
      } catch {
        // Server unreachable/permission issues → keep local state.
        setServerSyncedWallet(walletAddress.toLowerCase())
      }
    }
    void detectAndSync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, sessionStart])

  useEffect(() => {
    if (!now) return
    try {
      setLoadedWalletState(null)
      setSpinsUsed(0)
      setBonusSpins(0)
      setVerifiedTaskIds([])
      setAccounts({ x: null, telegram: null })
      setTaskLinks({})
      setWinner(null)
      setWonItp(0)
      setLoadedTasks(false)

      const saved = walletStateKey
        ? JSON.parse(localStorage.getItem(walletStateKey) || 'null') as Partial<{ sessionStart: number; dayStart: number; spinsUsed: number; bonusSpins: number; verifiedTaskIds: string[]; accounts: AccountLinks; wonItp: number }> | null
        : null
      const savedTasks = JSON.parse(localStorage.getItem(tasksStateKey) || 'null') as Task[] | null
      const legacyState = JSON.parse(localStorage.getItem(stateKey) || 'null') as { tasks?: Task[] } | null
      if (saved?.sessionStart === sessionStart) setSpinsUsed(saved.spinsUsed || 0)
      if (saved?.dayStart === dayStart) {
        setBonusSpins(saved.bonusSpins || 0)
        setVerifiedTaskIds(saved.verifiedTaskIds || [])
      }
      // NOTE: `accounts` is intentionally NOT restored from localStorage — social
      // handles must be re-verified against the backend, so we never unlock the
      // spinner off stale/unverified data. The server sync populates accounts with
      // verified handles; SocialConnect drives the verification itself.
      if (saved?.wonItp) setWonItp(saved.wonItp)
      setLoadedWalletState(walletStateKey)
      const publishedTasks = savedTasks ?? legacyState?.tasks ?? defaultTasks(sessionStart)
      const sessionTasks = publishedTasks.map(task => ({ ...task, createdSession: task.createdSession ?? sessionStart }))
      setTasks(sessionTasks)
      setLoadedTasks(true)
      if (!savedTasks && legacyState?.tasks) localStorage.setItem(tasksStateKey, JSON.stringify(legacyState.tasks))
      if (isAdmin) setWalletRewards(JSON.parse(localStorage.getItem(rewardsStateKey) || '[]') as WalletReward[])
    } catch {
      // Ignore malformed local state and start a fresh reward session.
    }
  }, [walletStateKey, sessionStart, dayStart, isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    const refreshRewards = () => {
      try {
        setWalletRewards(JSON.parse(localStorage.getItem(rewardsStateKey) || '[]') as WalletReward[])
      } catch {
        setWalletRewards([])
      }
      if (serverToken && serverSyncedWallet === walletAddress?.toLowerCase()) {
        void getAdminLedger(serverToken)
          .then((data) => {
            const aggregated: WalletReward[] = []
            for (const row of data.ledger) {
              const key = String(row.wallet || '').toLowerCase()
              if (!key) continue
              const itp = Number(row.won_itp || 0)
              const existing = aggregated.find((item) => item.wallet === key)
              if (existing) {
                existing.itp += itp
                existing.spins += 1
              } else {
                aggregated.push({ wallet: key, itp, spins: 1 })
              }
            }
            if (aggregated.length) setWalletRewards(aggregated)
          })
          .catch(() => {})
      }
    }
    refreshRewards()
    const interval = window.setInterval(refreshRewards, 3000)
    return () => window.clearInterval(interval)
  }, [isAdmin, serverToken, serverSyncedWallet, walletAddress])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!now || !walletStateKey || !walletAddress || loadedWalletState !== walletStateKey) return
    localStorage.setItem(walletStateKey, JSON.stringify({ sessionStart, dayStart, spinsUsed, bonusSpins, verifiedTaskIds, accounts, wonItp }))
  }, [walletStateKey, loadedWalletState, walletAddress, sessionStart, dayStart, spinsUsed, bonusSpins, verifiedTaskIds, accounts, wonItp, now])

  useEffect(() => {
    if (!loadedTasks) return
    localStorage.setItem(tasksStateKey, JSON.stringify(tasks))
  }, [tasks, loadedTasks])

  useEffect(() => {
    return () => {
      if (soundTimerRef.current) window.clearInterval(soundTimerRef.current)
      void audioContextRef.current?.close()
    }
  }, [])

  const playTick = (frequency = 170) => {
    if (!soundOn || typeof window === 'undefined') return
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = audioContextRef.current ?? new AudioContextClass()
    audioContextRef.current = context
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, context.currentTime)
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.06)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.065)
  }

  const spin = () => {
    if (isSpinning || remainingSpins === 0 || !connected) return
    const winningIndex = selectWeightedPrize()
    const winningPrize = prizes[winningIndex]
    const currentAngle = ((rotation % 360) + 360) % 360
    const desiredAngle = ((360 - winningIndex * segmentAngle) + 360) % 360
    const alignmentTurn = (desiredAngle - currentAngle + 360) % 360
    const targetRotation = rotation + 360 * 6 + alignmentTurn
    setRotation(targetRotation)
    setWinner(null)
    if (spinsUsed < 3) {
      setSpinsUsed(value => value + 1)
    } else {
      setBonusSpins(value => Math.max(0, value - 1))
    }
    setIsSpinning(true)
    playTick(120)
    let tick = 0
    if (soundOn) {
      soundTimerRef.current = window.setInterval(() => {
        tick += 1
        playTick(145 + Math.min(tick, 18) * 4)
      }, 150)
    }
    window.setTimeout(() => {
      if (soundTimerRef.current) window.clearInterval(soundTimerRef.current)
      soundTimerRef.current = null
      setWinner(winningPrize)
      const earnedItp = prizeTokenAmount(winningPrize.label) * selectedMultiplier
      const earnedSpins = prizeSpinAmount(winningPrize.label)
      if (earnedSpins > 0) setBonusSpins(value => value + earnedSpins)
      if (walletAddress) {
        setWonItp(value => value + earnedItp)
        const rewards = JSON.parse(localStorage.getItem(rewardsStateKey) || '[]') as WalletReward[]
        const walletKey = walletAddress.toLowerCase()
        const existing = rewards.find(reward => reward.wallet === walletKey)
        const updated = existing
          ? rewards.map(reward => reward.wallet === walletKey ? { ...reward, itp: reward.itp + earnedItp, spins: reward.spins + 1 } : reward)
          : [...rewards, { wallet: walletKey, itp: earnedItp, spins: 1 }]
        localStorage.setItem(rewardsStateKey, JSON.stringify(updated))
        if (isAdmin) setWalletRewards(updated)
      }
      setIsSpinning(false)
      playTick(360)
      if (serverToken && serverSyncedWallet === walletAddress?.toLowerCase()) {
        void recordServerResult(serverToken, {
          sessionStart,
          prizeIndex: winningIndex,
          prizeLabel: winningPrize.label,
          multiplier: selectedMultiplier,
          wonItp: String(earnedItp),
          wonSpins: earnedSpins,
          merchantClientId: `spin-${walletAddress?.toLowerCase()}-${Date.now()}`,
        }).catch(() => {})
      }
    }, 4800)
  }

  const handleSocialVerified = (provider: 'x' | 'telegram', handle: string) => {
    setAccounts(value => ({ ...value, [provider]: handle }))
  }

  const verifyTask = (task: Task) => {
    if (!connected) return
    const link = taskLinks[task.id]?.trim()
    if ((task.kind === 'x-post' || task.kind === 'x-quote') && !link) return
    setSubmittedTaskId(task.id)
    window.setTimeout(() => {
      const verificationId = `${dayStart}-${task.id}`
      if (!verifiedTaskIds.includes(verificationId) && tasksCompletedToday < 3) {
        setVerifiedTaskIds(value => [...value, verificationId])
        setBonusSpins(value => value + 2)
      }
      setSubmittedTaskId(null)
      if (serverToken && serverSyncedWallet === walletAddress?.toLowerCase() && link) {
        void submitVerification(serverToken, task.id, link).catch(() => {})
      }
    }, 900)
  }

  const createTask = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newTaskTitle.trim() || !newTaskUrl.trim()) return
    setTasks(value => {
      const task = { id: `admin-${Date.now()}`, kind: newTaskKind, title: newTaskTitle.trim(), description: 'New daily community task.', href: newTaskUrl.trim(), active: true, createdSession: sessionStart, source: 'admin' as const }
      const hasPublishedTaskThisSession = value.some(item => item.source === 'admin' && item.createdSession === sessionStart)
      return hasPublishedTaskThisSession ? [...value, task] : [task]
    })
    setNewTaskTitle('')
    setNewTaskUrl('')
  }

  return (
    <main className="min-h-screen overflow-hidden text-foreground selection:bg-primary/20">
      <Navbar />
      <div className="light-leaks relative isolate px-4 pb-20 pt-32 sm:px-6 md:pt-40">
        <div className="pointer-events-none absolute inset-0 -z-10 cosmic-grid opacity-40" />
        <div className="mx-auto max-w-7xl">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"><ArrowLeft className="size-4" /> Back to InterPredict</Link>
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-primary"><Zap className="size-3.5" /> ITP rewards</div>
              {isAdmin && <section className="mt-8 glass rounded-3xl p-5 sm:p-7"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Admin overview</p><h2 className="mt-1 font-heading text-2xl font-bold">Wallet reward ledger</h2><p className="mt-1 text-sm text-muted-foreground">All locally recorded spins and ITP winnings.</p></div><Coins className="size-5 text-accent" /></div><div className="mt-5 space-y-2">{walletRewards.length === 0 ? <p className="text-sm text-muted-foreground">No spins recorded yet.</p> : walletRewards.map(reward => <div key={reward.wallet} className="flex flex-col justify-between gap-2 rounded-xl border border-border bg-background/35 px-4 py-3 text-sm sm:flex-row sm:items-center"><span className="truncate font-mono text-muted-foreground">{reward.wallet}</span><span className="font-bold text-accent">{reward.itp.toLocaleString()} ITP · {reward.spins} spins</span></div>)}</div></section>}

              <h1 className="font-heading text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-7xl">Spin <span className="gradient-text">to Win</span></h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">Your wheel resets every 12 hours. Connect both accounts, complete daily tasks, and turn community energy into extra spins.</p>
            </div>
            {isAdmin && <button type="button" onClick={() => setShowAdmin(value => !value)} className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-background/60 px-4 py-2 text-xs font-bold text-muted-foreground hover:border-primary/40 hover:text-primary md:self-end"><ShieldCheck className="size-4" /> {showAdmin ? 'Close admin tools' : 'Admin tools'} <ChevronDown className={`size-3 transition-transform ${showAdmin ? 'rotate-180' : ''}`} /></button>}
          </div>

          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="glass rounded-2xl p-4"><div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground"><span>Spins this session</span><Zap className="size-4 text-primary" /></div><p className="mt-2 font-heading text-3xl font-extrabold">{remainingSpins}<span className="text-base text-muted-foreground"> / 3 base</span></p><p className="mt-1 text-xs text-muted-foreground">Renews in {formatTime(nextSessionIn)}{bonusSpins > 0 ? ` + ${bonusSpins} bonus` : ''}</p></div>
            <div className="glass rounded-2xl p-4"><div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground"><span>Task bonus spins</span><Coins className="size-4 text-accent" /></div><p className="mt-2 font-heading text-3xl font-extrabold">+{bonusSpins}</p><p className="mt-1 text-xs text-muted-foreground">{tasksCompletedToday} of 3 tasks verified today</p></div>
            <div className="glass rounded-2xl p-4"><div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground"><span>Next reset</span><TimerReset className="size-4 text-primary" /></div><p className="mt-2 font-heading text-3xl font-extrabold">{formatTime(sessionEndsIn)}</p><p className="mt-1 text-xs text-muted-foreground">Two sessions every day</p></div>
          </div>

          <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)]">
            <section className="grid grid-cols-1 items-center gap-8 rounded-3xl border border-border bg-background/25 p-5 sm:p-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(360px,1fr)]">
              <div className="max-w-sm">
                <h2 className="font-heading text-2xl font-bold">The daily wheel</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Three base spins per 12-hour session. Each verified task adds two more spins, up to three tasks per day.</p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={spin} disabled={isSpinning || remainingSpins === 0 || !connected} className="glow-purple hidden min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-[#4f00c5] disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"><Coins className="size-4" />{isSpinning ? 'Spinning...' : remainingSpins === 0 ? 'Come back later' : 'Spin the wheel'}</button>
                  <button type="button" aria-label={soundOn ? 'Mute spinning sound' : 'Enable spinning sound'} onClick={() => setSoundOn(value => !value)} className="inline-flex size-12 items-center justify-center rounded-full border border-border bg-background/60 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">{soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}</button>
                </div>
                {!isWalletConnected && <p className="mt-3 text-xs font-semibold text-accent">Connect your wallet to unlock the wheel.</p>}
                {isWalletConnected && !connected && <p className="mt-3 text-xs font-semibold text-accent">Connect X and Telegram below to unlock the wheel.</p>}
                <div aria-live="polite" className="mt-6 min-h-24">{winner ? <div className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-accent/30 bg-accent/10 p-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">You landed on</p><p className="mt-1 font-heading text-3xl font-extrabold">{winner.label}</p><p className="mt-1 text-sm text-muted-foreground">{winner.detail}. Your reward multiplier was X{selectedMultiplier}.</p></div> : <p className="text-sm text-muted-foreground">The wheel is waiting. Choose your moment.</p>}</div>
              </div>
              <section aria-label="Prize wheel" className="relative mx-auto w-full max-w-[300px] sm:max-w-[380px] md:max-w-[460px] lg:max-w-[500px]"><div className="absolute inset-8 rounded-full bg-primary/20 blur-3xl" /><div className="relative aspect-square rounded-full border border-white/20 bg-background/40 p-3 shadow-2xl shadow-primary/20 sm:p-5"><div className="absolute left-1/2 top-[-5px] z-20 -translate-x-1/2 drop-shadow-lg"><div className="h-0 w-0 border-x-[18px] border-t-[30px] border-x-transparent border-t-accent sm:border-x-[22px] sm:border-t-[36px]" /></div><div className="relative h-full w-full overflow-hidden rounded-full border-[5px] border-background shadow-[inset_0_0_0_2px_rgba(255,255,255,0.24),0_0_45px_rgba(98,0,238,0.3)] transition-transform" style={{ transform: `rotate(${rotation}deg)`, transitionDuration: isSpinning ? '4.8s' : '0ms', transitionTimingFunction: 'cubic-bezier(0.12, 0.78, 0.16, 1)', background: `conic-gradient(from -22.5deg, ${prizes.map((prize, index) => `${prize.color} ${index * 12.5}% ${(index + 1) * 12.5}%`).join(', ')})` }}>{prizes.map((prize, index) => { const angle = index * segmentAngle; return <span key={prize.label} className="absolute flex w-[22%] -translate-x-1/2 -translate-y-1/2 justify-center text-center font-heading text-[0.6rem] sm:text-[0.72rem] md:text-[0.82rem] lg:text-[0.92rem] font-extrabold leading-tight text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)]" style={{ left: `${50 + 34 * Math.sin(angle * Math.PI / 180)}%`, top: `${50 - 34 * Math.cos(angle * Math.PI / 180)}%` }}>{prize.label}</span> })}<div className="absolute left-1/2 top-1/2 flex size-[22%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-background bg-background shadow-lg"><span className="font-heading text-[0.72rem] sm:text-[0.84rem] md:text-[0.95rem] lg:text-[1.05rem] font-extrabold text-primary">ITP</span></div></div></div><p className="mt-5 text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Eight chances. One bright moment.</p><button type="button" onClick={spin} disabled={isSpinning || remainingSpins === 0 || !connected} className="glow-purple mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-[#4f00c5] disabled:cursor-not-allowed disabled:opacity-60 sm:hidden"><Coins className="size-4" />{isSpinning ? 'Spinning...' : remainingSpins === 0 ? 'Come back later' : 'Spin the wheel'}</button></section>
            </section>

            <aside className="space-y-5">
              <section className="glass rounded-3xl border border-primary/20 p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="font-heading text-xl font-bold">Wallet access</h2><p className="mt-1 text-xs text-muted-foreground">Required for spins and reward eligibility</p></div><WalletCards className="size-5 text-primary" /></div>{walletAddress ? <div className="mt-4 flex items-center gap-2"><p className="min-w-0 flex-1 truncate rounded-xl bg-secondary/60 px-3 py-2 text-xs font-mono text-muted-foreground">{walletAddress}</p><button type="button" onClick={disconnectWallet} className="shrink-0 rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-rose-400/50 hover:text-rose-400">Disconnect</button></div> : <button type="button" onClick={() => void connectWallet()} className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-[#4f00c5]">Connect wallet to spin</button>}{walletAddress && <p className="mt-3 rounded-xl bg-accent/10 px-3 py-2 text-sm font-bold text-accent">Won balance: {wonItp.toLocaleString()} ITP</p>}{txStatus && <p className="mt-3 text-xs leading-relaxed text-accent">{txStatus}</p>}{walletAddress && isAdmin && <p className="mt-3 text-xs font-semibold text-emerald-400">Admin wallet recognized. Task studio unlocked.</p>}</section>
              <section className="glass rounded-3xl p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-heading text-xl font-bold">Boost your odds</h2><p className="mt-1 text-xs text-muted-foreground">Choose a multiplier before spinning</p></div><Zap className="size-5 text-accent" /></div><div className="relative mt-4"><button type="button" onClick={() => setShowMultiplierMenu(value => !value)} className="flex w-full items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3 text-left"><span><span className="block text-sm font-bold">X{selectedMultiplier} multiplier</span><span className="block text-xs text-muted-foreground">{multipliers.find(item => item.value === selectedMultiplier)?.cost}</span></span><ChevronDown className="size-4 text-muted-foreground" /></button>{showMultiplierMenu && <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl">{multipliers.map(item => <button type="button" key={item.value} onClick={() => { setSelectedMultiplier(item.value); setShowMultiplierMenu(false) }} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-secondary"><span><span className="block font-bold">X{item.value} multiplier</span><span className="text-xs text-muted-foreground">{item.label}</span></span><span className="text-xs font-bold text-accent">{item.cost}</span></button>)}</div>}</div><p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Multiplier purchases are prepared for tITL checkout. A wallet transaction endpoint is required before these charges can be settled on-chain.</p></section>

              <section className="glass rounded-3xl p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="font-heading text-xl font-bold">Connect accounts</h2><p className="mt-1 text-xs text-muted-foreground">Required before spins and task verification</p></div><Link2 className="size-5 text-primary" /></div><div className="mt-4 space-y-2"><SocialConnect provider="x" token={serverToken} backendReady={backendReady} currentHandle={accounts.x} onVerified={handleSocialVerified} /><SocialConnect provider="telegram" token={serverToken} backendReady={backendReady} currentHandle={accounts.telegram} onVerified={handleSocialVerified} /></div></section>
            </aside>
          </div>

          <section className="mt-8 glass rounded-3xl p-5 sm:p-7"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Session missions</p><h2 className="mt-1 font-heading text-2xl font-bold">Complete tasks, earn +2 spins</h2><p className="mt-1 text-sm text-muted-foreground">Tasks are published every 12 hours and stay active for two sessions. Maximum three verified tasks per day.</p></div><div className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground">{tasksCompletedToday} / 3 verified today</div></div><div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3">{tasks.filter(task => task.active).map(task => { const verificationId = `${dayStart}-${task.id}`; const verified = verifiedTaskIds.includes(verificationId); const needsLink = task.kind === 'x-post' || task.kind === 'x-quote'; return <div key={task.id} className="rounded-2xl border border-border bg-background/35 p-4"><div className="flex items-start justify-between gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{taskIcon(task.kind)}</div>{verified ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400"><Check className="size-3.5" /> Verified</span> : <span className="text-xs font-bold text-accent">+2 spins</span>}</div><h3 className="mt-4 text-sm font-bold">{task.title}</h3><p className="mt-1 min-h-10 text-xs leading-relaxed text-muted-foreground">{task.description}</p><a href={task.href} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">Open task <ExternalLink className="size-3" /></a>{needsLink && !verified && <input value={taskLinks[task.id] || ''} onChange={event => setTaskLinks(value => ({ ...value, [task.id]: event.target.value }))} placeholder="Paste your post link" className="mt-3 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-xs outline-none ring-primary focus:ring-2" />}{!verified && <button type="button" disabled={!connected || tasksCompletedToday >= 3 || submittedTaskId === task.id || (needsLink && !taskLinks[task.id])} onClick={() => verifyTask(task)} className="mt-3 w-full rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50">{submittedTaskId === task.id ? 'Verifying...' : 'Submit for verification'}</button>}</div> })}</div></section>

          {isAdmin && showAdmin && <section className="mt-8 rounded-3xl border border-accent/30 bg-accent/5 p-5 sm:p-7"><div className="flex items-start gap-3"><ShieldCheck className="mt-1 size-5 text-accent" /><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Admin task studio</p><h2 className="mt-1 font-heading text-2xl font-bold">Create daily missions</h2><p className="mt-1 text-sm text-muted-foreground">This local studio previews task publishing. Production access must be protected by admin authentication and server-side social verification.</p></div></div><form onSubmit={createTask} className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_180px_auto]"><input value={newTaskTitle} onChange={event => setNewTaskTitle(event.target.value)} placeholder="Task title" className="rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none ring-accent focus:ring-2" /><input value={newTaskUrl} onChange={event => setNewTaskUrl(event.target.value)} placeholder="Task URL" className="rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none ring-accent focus:ring-2" /><select value={newTaskKind} onChange={event => setNewTaskKind(event.target.value as TaskKind)} className="rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none"><option value="x-like">Like / repost</option><option value="x-post">Create X post</option><option value="x-quote">Quote post</option><option value="x-follow">Follow on X</option><option value="telegram-follow">Follow Telegram</option></select><button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground hover:opacity-90"><Plus className="size-4" /> Add task</button></form></section>}
        </div>
      </div>
    </main>
  )
}

function selectWeightedPrize() {
  const random = Math.random() * 100
  let cumulative = 0
  for (let index = 0; index < prizes.length; index += 1) {
    cumulative += prizes[index].weight
    if (random < cumulative) return index
  }
  return prizes.length - 1
}

function prizeTokenAmount(label: string) {
  const match = label.replace(/,/g, '').match(/^(\d+(?:\.\d+)?) ITP$/)
  return match ? Number(match[1]) : 0
}

function prizeSpinAmount(label: string) {
  const match = label.match(/^(\d+) SPINS?$/)
  return match ? Number(match[1]) : 0
}