// Canonical Spin to Win configuration shared between the browser UI and the
// server (no imports allowed that depend on the browser or server-only envs).

export const SPIN_SESSION_LENGTH_MS = 12 * 60 * 60 * 1000 // 12h spin session
export const DEFAULT_ADMIN_ADDRESS = '0x6e832252ea4c78068ee109d953724d2762431992'

export type Prize = {
  label: string
  detail: string
  color: string
  weight: number
}

// Order defines segment positions on the wheel (conic-gradient slices at 12.5%).
export const prizes: Prize[] = [
  { label: '2.1 ITP', detail: 'A little lucky start', color: '#7c3aed', weight: 28 },
  { label: '21 ITP', detail: 'A bright hit', color: '#db2777', weight: 22 },
  { label: '210 ITP', detail: 'Now we are talking', color: '#ea580c', weight: 10 },
  { label: '2,100 ITP', detail: 'The biggest reward', color: '#ca8a04', weight: 10 },
  { label: 'NIL ITP', detail: 'No reward this time', color: '#65a30d', weight: 5 },
  { label: '1 SPIN', detail: 'Another chance', color: '#0d9488', weight: 10 },
  { label: '2 SPINS', detail: 'Keep the momentum', color: '#0284c7', weight: 10 },
  { label: 'Try Again', detail: 'Fortune is fickle', color: '#4f46e5', weight: 5 },
]

export const PRIZE_SEGMENT_ANGLE = 360 / prizes.length
export const PRIZE_PERCENT = 100 / prizes.length

export const DEFAULT_TASK_KINDS = ['x-like', 'x-post', 'x-quote', 'x-follow', 'telegram-follow']

export type Multiplier = {
  value: number
  cost: string
  label: string
  // Raw tITL cost in the chain's smallest unit (wei). Used server-side for the
  // multiplier payment flow. "Free" (value 1) has cost 0.
  costWei: string
}

export const multipliers: Multiplier[] = [
  { value: 1, cost: 'Free', label: 'Standard spin', costWei: '0' },
  { value: 2, cost: '0.01 tITL', label: 'X2 multiplier', costWei: '10000000000000000' },
  { value: 5, cost: '0.02 tITL', label: 'X5 multiplier', costWei: '20000000000000000' },
  { value: 15, cost: '0.05 tITL', label: 'X15 multiplier', costWei: '50000000000000000' },
  { value: 50, cost: '0.1 tITL', label: 'X50 multiplier', costWei: '100000000000000000' },
]

// Treasury recipient for multiplier payments. Override server-side via
// SPIN_TREASURY_ADDRESS; the shared default lives here for display only.
export const TREASURY_ADDRESS_DEFAULT = '0x000000000000000000000000000000000000000000'

export type TaskKind = 'x-like' | 'x-post' | 'x-quote' | 'x-follow' | 'telegram-follow'

export type DefaultTask = {
  id: string
  kind: TaskKind
  title: string
  description: string
  href: string
  active: boolean
  createdSession: number
  source: 'default'
}

export function defaultTasks(createdSession: number): DefaultTask[] {
  return [
    {
      id: `daily-x-like-${createdSession}`,
      kind: 'x-like',
      title: 'Like the daily X post',
      description: 'Like the featured InterPredict post on X.',
      href: 'https://x.com/InterPredict',
      active: true,
      createdSession,
      source: 'default',
    },
    {
      id: `daily-x-retweet-${createdSession}`,
      kind: 'x-quote',
      title: 'Quote the daily X post',
      description: 'Quote-post the daily prompt and share your prediction.',
      href: 'https://x.com/InterPredict',
      active: true,
      createdSession,
      source: 'default',
    },
    {
      id: `daily-telegram-${createdSession}`,
      kind: 'telegram-follow',
      title: 'Join InterPredict Telegram',
      description: 'Follow the official community channel for daily drops.',
      href: 'https://t.me/interpredict',
      active: true,
      createdSession,
      source: 'default',
    },
  ]
}

export function getWindowStart(nowMs: number): number {
  return Math.floor(nowMs / SPIN_SESSION_LENGTH_MS) * SPIN_SESSION_LENGTH_MS
}

export function getDayStart(nowMs: number): number {
  return new Date(new Date(nowMs).setHours(0, 0, 0, 0)).getTime()
}

export function prizeTokenAmount(label: string): number {
  const match = label.replace(/,/g, '').match(/^(\d+(?:\.\d+)?) ITP$/)
  return match ? Number(match[1]) : 0
}

export function prizeSpinAmount(label: string): number {
  const match = label.match(/^(\d+) SPINS?$/)
  return match ? Number(match[1]) : 0
}

export function selectWeightedPrizeIndex(): number {
  const random = Math.random() * 100
  let cumulative = 0
  for (let index = 0; index < prizes.length; index += 1) {
    cumulative += prizes[index].weight
    if (random < cumulative) return index
  }
  return prizes.length - 1
}