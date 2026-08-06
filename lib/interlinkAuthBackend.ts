import 'server-only'

// ---------------------------------------------------------------------------
// Thin re-export wrapper so callers can `import { getBackendToken } from
// '@/lib/interlinkAuthBackend'` as referenced throughout the codebase.
// The actual implementation lives in interlinkServiceAuth.ts which handles
// the SERVICE_WALLET_PRIVATE_KEY → challenge/verify → Bearer token flow.
// ---------------------------------------------------------------------------
export { getValidServiceToken as getBackendToken } from '@/lib/interlinkServiceAuth'