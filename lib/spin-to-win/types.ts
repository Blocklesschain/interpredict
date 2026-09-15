// Shared request/response DTOs for the Spin to Win API.
// These types are browser-safe (no server-only imports).

export type SocialProvider = 'x' | 'telegram'

export type SocialLink = {
  provider: SocialProvider
  handle: string
  verified: boolean
}

export type ServerSpinState = {
  wallet: string
  sessionStart: number
  dayStart: number
  spinsUsed: number
  bonusSpins: number
  verifiedTaskIds: string[]
  accounts: { x: string | null; telegram: string | null }
  verifiedSocial: { x: boolean; telegram: boolean }
  wonItp: string
  multiplierConfirmed: boolean
  multiplier: number
}

export type ApiEnvelope<T> = {
  data: T | null
  meta: Record<string, unknown>
  error: { code: string; message: string } | null
}

export type ChallengePayload = {
  challengeId: string
  messageToSign: string
  expiresAt: number
}

export type AuthSession = {
  accessToken: string
  expiresAt: number
  wallet: string
}

export type ResultRecordDetail = {
  index: number
  label: string
  multiplier: number
  wonItp: string
  wonSpins: number
}

export type AdminLedgerRow = {
  id: string
  wallet: string
  prizeLabel: string
  multiplier: number
  wonItp: string
  wonSpins: number
  recordedBy: string | null
  createdAt: string
}

export type TaskDto = {
  id: string
  kind: string
  title: string
  description: string
  href: string
  active: boolean
  createdSession: number
  source: string
}

export type VerificationDto = {
  id: string
  taskId: string
  wallet: string
  dayStart: number
  proofLink: string | null
  verified: boolean
  createdAt: string
}

export type MultiplierIntent = {
  purchaseId: string
  recipient: string
  cost: string
  multiplier: number
  status: 'pending'
}