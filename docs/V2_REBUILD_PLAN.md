# InterPredict V2 — Ground-Up Rebuild Plan

> Branch: `interpredict-v2-rebuild`
> Base commit: `342db966faa68d448f6e01f38d8efb5c8fe276e3`
> Date: 2026-08-16
> Status: PLANNING (Phase Zero complete — audit done)

---

## 0. PRODUCT DECISION (RESOLVED 2026-08-16)

**Owner decision:** Keep the existing real-money mechanism using the **native ITL token**, but deployed **on the testnet network only**.

**Consequences for V2:**
- The contract retains value-transfer mechanics: native-token bets (`msg.value`), winnings payouts, creator fees, and DEC rewards.
- All value is **testnet ITL** (no real-world monetary value); this satisfies the "testnet/non-cash" intent of V2 §1 while preserving the full wagering UX.
- The database schema must include stake/payout/volume/fee/reward columns.
- The UI must include wager, payout, creator-fee, and DEC-reward flows.
- **No Mainnet deployment** — testnet only, per the git-safety and deployment rules.

---

## 1. Architecture (V2)

```
InterLink EVM Chain (authoritative state)
        │  events
        ▼
Blockchain Synchronizer / Indexer (incremental, resumable, idempotent)
        │  transactional upserts
        ▼
Supabase PostgreSQL (query-optimized read model)
        │  optimized queries
        ▼
Next.js Backend APIs (typed, validated, enveloped)
        │
        ▼
Next.js Frontend (React, design system, i18n, theme)
```

- **Read path:** Browser → API → PostgreSQL → response. Zero full-chain scans, zero per-market RPC fan-out.
- **Write path:** UI → wallet signature → contract → confirmation → targeted sync → PostgreSQL → query invalidation → updated UI.

---

## 2. Technology Stack (V2)

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16 App Router, TypeScript (strict), React 19 |
| Blockchain | Solidity ^0.8.20, Hardhat, ethers.js v6, OpenZeppelin v5 |
| Database | Supabase PostgreSQL |
| Indexer | Netlify Background Function (or scheduled function) + TypeScript |
| Storage | Dedicated object storage (Netlify Blobs for media; PostgreSQL for data) |
| Testing | Hardhat (contracts), Vitest (TS/React/API), Playwright (E2E) |
| Hosting | Netlify + `@netlify/plugin-nextjs` |

---

## 3. Monorepo Organization (target)

```
app/            # Next.js App Router pages + API routes
components/     # UI components + design system (components/ui/)
contracts/      # Solidity contracts + Hardhat config + tests
lib/            # domain logic, config, types
services/       # blockchain, wallet, indexer, auth services
repositories/   # Supabase data access
hooks/          # React hooks
types/          # shared TypeScript types
i18n/           # locale files
tests/          # unit/integration tests
scripts/        # build/deploy/backfill scripts
supabase/       # migrations
docs/           # documentation
public/         # static assets
```

---

## 4. Smart Contract Design

### 4.1 State machine (V2 target)
```
Proposed → DECReview → {Rejected | Cancelled | Approved} → Active → Closed
  → Unresolved → ResolutionRequested → DECResolutionVoting → AdminVerification
  → Confirmed → Finalized → Resolved
```

### 4.2 Events (indexable, self-describing)
`MarketProposed`, `MarketApproved`, `MarketRejected`, `MarketCancelled`, `MarketActivated`, `ParticipationRecorded`, `ResolutionRequested`, `ResolutionVoteCast`, `ResolutionConfirmed`, `MarketFinalized`, `DECMemberJoined`, …

### 4.3 Custom errors
`InvalidMarketState`, `AlreadyParticipated`, `ResolutionAlreadyRequested`, `Unauthorized`, `InvalidOutcome`, `MarketClosed`, …

### 4.4 Requirements
- Native ITL value transfer retained (testnet only): bets (`msg.value`), payouts, creator fees, DEC rewards.
- Clear identifiers (no obfuscated `mb`/`mv`/`mr`).
- Bounded loops only.
- Custom errors (no `"!"` strings).

---

## 5. Database Schema (Supabase)

Normalized tables (derived from final contract spec):

```
markets
market_outcomes
market_state_history
participations          (user activity — replaces "My Votes" RPC fan-out)
proposal_votes
resolution_requests
resolution_votes
dec_members
transactions
sync_checkpoints
sync_failures
categories
supported_locales
```

Every chain-derived row carries provenance: `chain_id`, `contract_address`, `block_number`, `block_hash`, `transaction_hash`, `log_index`, `indexed_at`, `created_at`, `updated_at`.

Indexes on: market id, state, creator, category, created/end timestamps, wallet address (lowercase-normalized), transaction hash, block number. Composite indexes where queries justify them.

RLS enabled; server-only service key; no `NEXT_PUBLIC_*` secrets.

---

## 6. Indexer

- Incremental, resumable, idempotent, observable, retry-safe.
- `sync_checkpoints` table tracks `last_processed_block`, `last_processed_block_hash`, status, error.
- Idempotency key: `chain_id + transaction_hash + log_index`.
- RPC failure handling: bounded concurrency, exponential backoff + jitter, max retries, structured logging. Never overwrite good data with `0`/`[]`/`""` on failure.
- Targeted reconciliation after confirmed transactions (no full rescan).

---

## 7. API Architecture

Standard envelope `{ data, meta, error }` with machine-readable error codes.

```
GET /api/markets              (pagination, filter, sort)
GET /api/markets/:id
GET /api/activity
GET /api/users/:wallet/activity
GET /api/dec
GET /api/health
```

Input validation via schemas (zod). Rate limiting on sync/upload/report/admin routes.

---

## 8. Frontend

- Full design system primitives (Button, Input, Select, Card, Modal, Toast, Badge, Tabs, Tooltip, Skeleton, EmptyState, ErrorState, TransactionStatus).
- Dynamic action engine: `getAvailableActions(marketState, userContext)` → `{ visible, enabled, label, reasonDisabled }`.
- Central error normalization (`USER_CANCELLED`, `RPC_RATE_LIMITED`, `NETWORK_UNAVAILABLE`, `INVALID_STATE`, `ACTION_ALREADY_COMPLETED`, `TRANSACTION_REVERTED`, `INDEXING_DELAY`, `WALLET_DISCONNECTED`, `UNKNOWN`).
- Full i18n (en/zh/es/fr + extensible), theme (dark/light/system), mobile session restoration, proper router history.

---

## 9. Implementation Order (per V2 §87)

```
01 Requirements → 02 Architecture → 03 Threat model → 04 Contract spec
→ 05 Contract impl → 06 Contract tests → 07 DB architecture → 08 Migrations
→ 09 Indexer → 10 Indexer tests → 11 Repositories/services → 12 APIs
→ 13 API tests → 14 Design system → 15 Navigation/layout → 16 Wallet
→ 17 Market/proposal UI → 18 DEC UI → 19 Activity UI → 20 Resolution UI
→ 21 i18n → 22 Theme → 23 Help/support → 24 Mobile/session → 25 Errors
→ 26 Performance → 27 Integration → 28 E2E regression → 29 Security
→ 30 Documentation → 31 Deployment readiness
```

---

## 10. Git Safety

- Work on `interpredict-v2-rebuild` branch only.
- No force push, no history rewrite, no main deletion, no push/merge to main.
- Local commits after each completed stage with descriptive messages.
- No production deployment, no Mainnet contracts, no production secret changes.

---

## 11. Next Actions

1. Create Phase Zero docs (`PRODUCT_REQUIREMENTS.md`, `SYSTEM_ARCHITECTURE.md`, `SMART_CONTRACT_SPEC.md`, etc.).
3. Establish V2 foundation (monorepo structure, strict TS config, design system).
4. Implement contract + tests.
5. Implement Supabase migrations + indexer.
6. Implement APIs + UI.
7. Regression suite + security review + release readiness.