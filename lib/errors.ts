// ---------------------------------------------------------------------------
// Central error normalization (V2 §30).
//
// Users NEVER see raw errors (SERVER_ERROR, CALL_EXCEPTION, eth_sendTransaction,
// missing revert data). Technical diagnostics belong in logs.
// ---------------------------------------------------------------------------

export type ErrorCode =
  | 'USER_CANCELLED'
  | 'RPC_RATE_LIMITED'
  | 'NETWORK_UNAVAILABLE'
  | 'INVALID_STATE'
  | 'ACTION_ALREADY_COMPLETED'
  | 'TRANSACTION_REVERTED'
  | 'INDEXING_DELAY'
  | 'WALLET_DISCONNECTED'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'UNKNOWN'

export interface NormalizedError {
  code: ErrorCode
  message: string
  technical?: string
}

const CONTRACT_ERROR_MAP: Record<string, ErrorCode> = {
  InvalidMarketState: 'INVALID_STATE',
  AlreadyParticipated: 'ACTION_ALREADY_COMPLETED',
  AlreadyVoted: 'ACTION_ALREADY_COMPLETED',
  ResolutionAlreadyRequested: 'ACTION_ALREADY_COMPLETED',
  Unauthorized: 'UNAUTHORIZED',
  InvalidOutcome: 'VALIDATION_ERROR',
  MarketClosed: 'INVALID_STATE',
  MarketNotEnded: 'INVALID_STATE',
  InsufficientFee: 'VALIDATION_ERROR',
  InvalidQuestion: 'VALIDATION_ERROR',
  InvalidOutcomes: 'VALIDATION_ERROR',
  DuplicateOutcome: 'VALIDATION_ERROR',
  NothingToClaim: 'ACTION_ALREADY_COMPLETED',
  NotFinalized: 'INVALID_STATE',
  NotCreator: 'UNAUTHORIZED',
  NotActiveDEC: 'UNAUTHORIZED',
  MarketDoesNotExist: 'NOT_FOUND',
  InvalidEndTime: 'VALIDATION_ERROR',
  SlippageExceeded: 'TRANSACTION_REVERTED',
}

function detectWalletCancelled(err: unknown): boolean {
  const message = String(
    (err as { message?: string })?.message ??
    (err as { shortMessage?: string })?.shortMessage ??
    err ??
    '',
  ).toLowerCase()
  const code = (err as { code?: number | string })?.code
  return (
    message.includes('user rejected') ||
    message.includes('user denied') ||
    message.includes('rejected by user') ||
    code === 4001 ||
    code === 'ACTION_REJECTED'
  )
}

function detectRateLimited(err: unknown): boolean {
  const message = String((err as { message?: string })?.message ?? err ?? '').toLowerCase()
  return message.includes('429') || message.includes('rate limit') || message.includes('too many requests')
}

function detectNetworkUnavailable(err: unknown): boolean {
  const message = String((err as { message?: string })?.message ?? err ?? '').toLowerCase()
  return (
    message.includes('network') ||
    message.includes('fetch failed') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('enotfound')
  )
}

function detectContractErrorName(err: unknown): string | null {
  const revertName = (err as { revert?: { name?: string } })?.revert?.name
  if (revertName) return revertName

  // ethers v6 custom error: err.info?.error?.data or err.data contains selector
  const data = (err as { data?: string })?.data
  const infoData = (err as { info?: { error?: { data?: string } } })?.info?.error?.data
  const raw = data ?? infoData
  if (typeof raw === 'string') {
    for (const name of Object.keys(CONTRACT_ERROR_MAP)) {
      if (raw.includes(name)) return name
    }
  }
  return null
}

export function normalizeError(err: unknown): NormalizedError {
  if (err === null || err === undefined) {
    return { code: 'UNKNOWN', message: 'An unknown error occurred.' }
  }

  // 1. Wallet cancellation is never a protocol failure.
  if (detectWalletCancelled(err)) {
    return { code: 'USER_CANCELLED', message: 'Transaction was cancelled in your wallet.' }
  }

  // 2. Rate limiting.
  if (detectRateLimited(err)) {
    return { code: 'RPC_RATE_LIMITED', message: 'The network is busy. Please try again shortly.' }
  }

  // 3. Network unavailable.
  if (detectNetworkUnavailable(err)) {
    return { code: 'NETWORK_UNAVAILABLE', message: 'The network is unavailable. Please check your connection.' }
  }

  // 4. Contract custom errors.
  const contractErrorName = detectContractErrorName(err)
  if (contractErrorName) {
    const code = CONTRACT_ERROR_MAP[contractErrorName] ?? 'TRANSACTION_REVERTED'
    return {
      code,
      message: friendlyMessage(code),
      technical: contractErrorName,
    }
  }

  // 5. Generic revert.
  const message = String((err as { message?: string })?.message ?? err ?? '')
  if (message.includes('revert') || message.includes('execution reverted')) {
    return { code: 'TRANSACTION_REVERTED', message: 'The transaction was reverted on-chain.' }
  }

  // 6. Fallback.
  return { code: 'UNKNOWN', message: 'Something went wrong. Please try again.' }
}

function friendlyMessage(code: ErrorCode): string {
  switch (code) {
    case 'INVALID_STATE':
      return 'This action is not available for the current market state.'
    case 'ACTION_ALREADY_COMPLETED':
      return 'This action has already been completed.'
    case 'UNAUTHORIZED':
      return 'You are not authorized to perform this action.'
    case 'VALIDATION_ERROR':
      return 'The provided input is invalid.'
    case 'NOT_FOUND':
      return 'The requested item was not found.'
    case 'TRANSACTION_REVERTED':
      return 'The transaction was reverted on-chain.'
    default:
      return 'Something went wrong. Please try again.'
  }
}