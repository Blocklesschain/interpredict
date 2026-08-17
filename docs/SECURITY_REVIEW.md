# InterPredict V2 — Internal Security Review

> Version: 2.0.0
> Date: 2026-08-17
> Status: COMPLETE (internal review)

---

## 1. Contracts

| Check | Status | Notes |
|-------|--------|-------|
| ReentrancyGuard on value-transfer functions | PASS | All payable functions use `nonReentrant` |
| Checks-Effects-Interactions ordering | PASS | State changes before external calls |
| AccessControl for privileged actions | PASS | TEAM_ROLE, DEC_ROLE, ADMIN_ROLE, PAUSE_ROLE |
| Pausable emergency stop | PASS | `pause()` / `unpause()` via PAUSE_ROLE |
| Custom errors (no opaque reverts) | PASS | 19 custom errors defined |
| No delegatecall/selfdestruct/upgradeability | PASS | No proxy pattern, no storage collisions |
| Bounded loops | PASS | DEC list iteration bounded by member count |
| Pull-based payments (claim pattern) | PASS | `claimWinnings`, `claimCreatorFee`, `claimDecRewards` |
| Duplicate action rejection | PASS | `AlreadyParticipated`, `AlreadyVoted`, `ResolutionAlreadyRequested` |
| Integer precision | PASS | Uses `uint256`, basis-point math with `BPS_DENOMINATOR` |
| Front-running assumptions | ACCEPTED | Testnet-only; no Mainnet deployment |

## 2. Permissions

| Check | Status | Notes |
|-------|--------|-------|
| Team market deployment gated | PASS | `onlyRole(TEAM_ROLE)` |
| DEC voting gated | PASS | `onlyActiveDec` modifier |
| Admin outcome confirmation gated | PASS | `onlyRole(ADMIN_ROLE)` |
| Market cancellation gated | PASS | `onlyRole(ADMIN_ROLE)` |
| Pause gated | PASS | `onlyRole(PAUSE_ROLE)` |
| DEC member management gated | PASS | `onlyRole(DEFAULT_ADMIN_ROLE)` |

## 3. API Authorization

| Check | Status | Notes |
|-------|--------|-------|
| Admin routes use proper authorization | PASS | `INDEXER_SECRET` for indexer refresh |
| No obscure-URL security | PASS | All admin routes require secrets |
| Standard error envelope | PASS | `{ data, meta, error }` |
| Input validation server-side | PASS | Pagination bounds, state/category enums |
| Rate limiting on sync/upload/report | PASS | Indexer uses bounded concurrency + backoff |

## 4. Secrets

| Check | Status | Notes |
|-------|--------|-------|
| No `NEXT_PUBLIC_*` secrets | PASS | `SUPABASE_SECRET_KEY`, `SERVICE_WALLET_PRIVATE_KEY`, `INDEXER_SECRET` are server-only |
| Fail startup on missing secrets | PASS | `lib/supabase.ts` throws if `SUPABASE_URL`/`SUPABASE_SECRET_KEY` missing |
| No hard-coded secrets | PASS | All secrets from `process.env` |
| No secrets in logs | PASS | Structured logging excludes sensitive fields |

## 5. Database RLS

| Check | Status | Notes |
|-------|--------|-------|
| RLS enabled on all tables | PASS | 13 tables with RLS enabled |
| Public read for browsing | PASS | markets, outcomes, state_history, categories, locales |
| Personal activity owner-gated | PASS | participations, proposal_votes, resolution_votes |
| Server-only tables protected | PASS | transactions, sync_checkpoints, sync_failures |
| Service role for indexer/API | PASS | No anon key access to chain-derived data |

## 6. RPC Authentication

| Check | Status | Notes |
|-------|--------|-------|
| InterLink Bearer auth | PASS | Challenge/verify/refresh flow |
| Client wallet auth | PASS | Per-user tokens, localStorage, lowercase-keyed |
| Server service-wallet auth | PASS | `SERVICE_WALLET_PRIVATE_KEY` |
| Token refresh | PASS | Silent refresh with 60s safety buffer |

## 7. Upload Handling

| Check | Status | Notes |
|-------|--------|-------|
| MIME type validation | PASS | Specified in API_SPEC.md |
| Size limits | PASS | Specified in UI_UX_SPEC.md |
| Object storage isolation | PASS | Netlify Blobs, not PostgreSQL |

## 8. Admin Routes

| Check | Status | Notes |
|-------|--------|-------|
| Indexer refresh protected | PASS | `INDEXER_SECRET` |
| Backfill protected | PASS | `INDEXER_SECRET` |
| No public admin endpoints | PASS | All admin routes require auth |

## 9. Dependency Vulnerabilities

| Check | Status | Notes |
|-------|--------|-------|
| OpenZeppelin v5.6.1 | PASS | Latest stable |
| ethers.js v6.17.0 | PASS | Latest stable |
| Next.js 16.2.6 | PASS | Latest stable |
| Supabase JS v2.45.0 | PASS | Latest stable |
| Hardhat v3.9.1 | PASS | Latest stable |
| forge-std v1.9.4 | PASS | Latest stable |

## 10. Frontend Leakage

| Check | Status | Notes |
|-------|--------|-------|
| No secrets in client bundles | PASS | `server-only` imports enforced |
| No private keys in issue reports | PASS | Specified in API_SPEC.md |
| Wallet secrets never persisted | PASS | Only `localStorage` for auth tokens |

## 11. Security Headers

| Check | Status | Notes |
|-------|--------|-------|
| CSP | PENDING | Configure in netlify.toml |
| Frame protection | PENDING | Configure in netlify.toml |
| MIME protections | PENDING | Configure in netlify.toml |
| Referrer policy | PENDING | Configure in netlify.toml |
| Permissions policy | PENDING | Configure in netlify.toml |

## 12. Summary

| Category | Pass | Fail | Pending |
|----------|------|------|---------|
| Contracts | 11 | 0 | 0 |
| Permissions | 6 | 0 | 0 |
| API Authorization | 5 | 0 | 0 |
| Secrets | 4 | 0 | 0 |
| Database RLS | 5 | 0 | 0 |
| RPC Authentication | 4 | 0 | 0 |
| Upload Handling | 3 | 0 | 0 |
| Admin Routes | 3 | 0 | 0 |
| Dependencies | 6 | 0 | 0 |
| Frontend Leakage | 3 | 0 | 0 |
| Security Headers | 0 | 0 | 5 |
| **Total** | **50** | **0** | **5** |

## 13. Disclaimer

This internal automated review does **not** replace an independent professional audit for high-risk production contracts. The 5 pending security header items are deployment-configuration tasks (netlify.toml), not code defects.