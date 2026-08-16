# InterPredict V1 (Closed Beta) — Legacy Architecture Audit

> Branch: `interpredict-v2-rebuild`
> Audited commit: `342db966faa68d448f6e01f38d8efb5c8fe276e3` (tag: `interpredict-beta-final`)
> Date: 2026-08-16
> Purpose: Classify the legacy implementation into REUSE / REFACTOR / REWRITE / DELETE / REFERENCE_ONLY before the V2 ground-up rebuild.

---

## 1. Executive Summary

InterPredict V1 is a **Next.js 16 (App Router) + ethers.js v6** single-page dApp that talks directly to a single Solidity contract (`InterPredict.sol`) on the **InterLink testnet** (chain ID `19042026`) via an authenticated RPC gateway.

The application has **no database**. Market data is reconstructed at request time by making **8 `eth_call` RPC requests per market**, then cached as a single JSON blob in **Netlify Blobs** (a `snapshot.json`-style cache). This is the direct root cause of every beta market-loading failure.

### Critical architectural contradiction

The legacy contract implements **real-money wagering**: `bO()` accepts native-token bets (`msg.value`), `cW()` pays out winnings, `cCF()`/`cCS()` pay creator fees, and `cDR()`/`aDR()` distribute DEC rewards. This **directly contradicts V2 specification §1**, which mandates testnet/non-cash participation with **no** real-money wagering, payouts, or profit mechanisms.

This is a **PRODUCT-level contradiction** (not merely engineering) and is flagged for explicit owner decision in `V2_REBUILD_PLAN.md`.

---

## 2. Repository Structure Map

```
InterPredict/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, theme-init, Web3Provider)
│   ├── page.tsx                  # Landing page (544 lines)
│   ├── globals.css               # Design tokens / theme CSS
│   ├── app/page.tsx             # Main dApp (1000+ lines — giant component)
│   ├── api/                      # API routes
│   │   ├── markets/route.ts      # GET markets (cache + wallet enrichment)
│   │   ├── markets/refresh/route.ts
│   │   ├── dec-membership/route.ts
│   │   ├── dec-requests/route.ts
│   │   ├── keeper/route.ts
│   │   └── upload-thumbnail/route.ts
│   ├── context/
│   │   ├── Web3Context.tsx       # 1090 lines — giant wallet/contract context
│   │   └── translations.ts       # en/zh/es/fr locale strings
│   ├── documentation/            # static docs pages
│   ├── governance-forum/
│   ├── privacy-policy/
│   ├── risk-disclosure/
│   ├── terms-of-service/
│   └── whitepaper/
├── components/
│   ├── navbar.tsx, footer.tsx, hero.tsx, logo.tsx, ...
│   ├── markets.tsx               # large market list component
│   ├── market-simulator.tsx     # large simulator component
│   ├── LanguageSelector.tsx
│   ├── theme-toggle.tsx
│   └── ui/button.tsx             # ONLY design-system primitive
├── lib/
│   ├── interlinkAuth.ts          # client wallet auth (challenge/verify/refresh)
│   ├── interlinkAuthBackend.ts   # thin re-export wrapper
│   ├── interlinkServiceAuth.ts   # server service-wallet auth
│   ├── interpredictAbi.json      # contract ABI
│   ├── marketsCache.ts           # Netlify Blobs snapshot cache
│   ├── scanMarkets.ts            # 8 RPC calls/market scanner
│   └── utils.ts
├── interpredict-deploy/          # Hardhat project
│   ├── contracts/InterPredict.sol  # 790 lines, single contract
│   ├── scripts/deploy.ts
│   ├── scripts/findDeploymentBlock.ts
│   ├── lib/interlinkAuthBackend.ts
│   └── hardhat.config.ts
├── netlify/functions/markets-refresh-cron.mjs
├── .github/workflows/markets-refresh.yml
├── data/                         # EMPTY
├── public/                       # branding assets, placeholders
├── scripts/generate_favicon.py
├── seed_markets.mjs              # manual full-refresh script
├── verify_markets.mjs
├── temp_markets.json             # scratch data
├── netlify.toml
├── next.config.mjs
├── package.json
└── .env.example
```

---

## 3. Technology Stack (Legacy)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 16.2.6 (App Router), React 19, TypeScript 5.7 | |
| Blockchain | Solidity ^0.8.20, Hardhat, ethers.js v6, OpenZeppelin v5 (AccessControl, ReentrancyGuard, Pausable) | |
| Database | **NONE** — Netlify Blobs JSON snapshot | Major gap |
| Storage | Netlify Blobs (`markets-cache` store) | |
| Hosting | Netlify + `@netlify/plugin-nextjs` | |
| Styling | Tailwind CSS v4, `class-variance-authority`, `clsx`, `tailwind-merge`, `@base-ui/react`, `shadcn` | |
| Testing | **NONE** — zero test files | Major gap |
| Package manager | pnpm 10.34.5 | |

---

## 4. Smart Contract Audit

**File:** `interpredict-deploy/contracts/InterPredict.sol` (790 lines)

### 4.1 Roles
- `TEAM_ROLE` = `keccak256("TEAM_MARKET_ROLE")`
- `DEC_ROLE` = `keccak256("DEC_ROLE")`
- `ADMIN_ROLE` = `keccak256("ADMIN_VERIFIER_ROLE")`
- `PAUSE_ROLE` = `keccak256("PAUSER_ROLE")`
- `DEFAULT_ADMIN_ROLE` (OZ)

### 4.2 Enums
- `Origin`: Community(0), Team(1)
- `Category` (18 values): Sports, Politics, Crypto, Blockchain, Technology, AI, Economics, Finance, Business, Science, Climate, Entertainment, Culture, Health, RealEstate, Gaming, Web3, Other
- `State` (14 values): Proposed(0), DECVoting(1), Rejected(2), Cancelled(3), Approved(4), Active(5), Closed(6), Unresolved(7), ResReq(8), DECResVoting(9), AdminVer(10), Confirmed(11), Finalized(12), Resolved(13)
- `PVote`: None(0), Approve(1), Reject(2)

### 4.3 State machine (legacy)
```
Proposed → DECVoting → {Rejected | Cancelled | Approved} → Active → Closed
  → Unresolved → ResReq → DECResVoting → AdminVer → Confirmed → Finalized → Resolved
```

### 4.4 Money-related functions (CONTRADICT V2 §1)
| Function | Purpose | V2 conflict |
|----------|---------|-------------|
| `bO(id, oi, minSh)` payable | Place a bet with native token | Real-money wagering |
| `cW(id)` | Claim winnings | Payout |
| `cCF(id)` / `cCS(id)` | Claim creator fees / seed | Profit mechanism |
| `cDR()` / `aDR(id)` | Claim / allocate DEC rewards | Profit mechanism |
| `pM(...)` payable | Community proposal requires 11 tITL | Fee |
| `cTM(...)` payable | Team market requires 10 tITL seed | Fee |
| `_dF` / `_dS` | Distribute fees to treasury/DEC/creator | Fee distribution |

### 4.5 Events (obfuscated names)
`MP, MEV, PVC, PF, PA, MA, PR, PC, AR, TMC, TMA, SP, RR, RVC, RVF, NQ, TR, OC, MFNL, WC, CFC, CSC, MCAN, DMA, DMR, DMACT, DMSUS, DRC, RU, TU`

### 4.6 Contract quality issues
- **Obfuscated identifiers** (`mb`, `mv`, `mr`, `mf`, `ms`, `ol`, `op`, `csp`, `rvc`, `sh`, `ht`, `hcw`, `dm`, `dvp`, `hvp`, `hvr`, `pv`, `rv`) — unmaintainable.
- **Obfuscated error strings** (`"!e"`, `"!d"`, `"!c"`, `"!l"`, `"!q"`, `"!t"`, `"!p"`, `"!s"`, `"!v"`, `"!"`, `"!11"`, `"!o"`, `"!f"`, `"a"`, `"d"`, `"s"`, `"i"`) — no custom errors, frontend must guess.
- **Unbounded loops** in `gADC()`, `cO()`, `aDR()` iterate over `dml` (DEC member list) — DoS risk.
- **No custom errors** — violates V2 §8.
- **`Closed` and `Unresolved` states are declared but never set** by any function (dead states).
- **`Resolved` state is declared but never reached** (finalization stops at `Finalized`).

### 4.7 ABI summary
The ABI (`lib/interpredictAbi.json`) mirrors the contract: all public getters (`mb`, `ms`, `gL`, `gP`, `gPr2`, `mv`, `mf`, `mr`, `tm`, `drt`, `drp`, `tdm`, `dml`, `gAD`, `gADC`, `gTP`, `gPr`, `gSO`, `gUS`, `gDMI`, `iad`, `treasury`), all state-changing functions, all 27 events, and the `receive()` fallback. No custom errors in ABI.

---

## 5. Data / Cache Architecture (root cause of beta failures)

### 5.1 `lib/scanMarkets.ts`
- Performs **8 `eth_call` requests per market** (`mb`, `ms`, `gL`, `gP`, `gPr2`, `mv`, `mf`, `mr`).
- `BATCH_SIZE = 1` market per batch (deliberately tiny to avoid rate limits).
- Full refresh = `totalCount` × 8 RPC calls, driven by repeated calls to `/api/markets/refresh?startId=X&count=1`.
- This is the **exact anti-pattern** V2 §2 forbids ("5 RPC calls per market … dozens/hundreds of RPC requests").

### 5.2 `lib/marketsCache.ts`
- Stores the entire market list as **one JSON snapshot** in Netlify Blobs (`markets-cache` store, key `snapshot`).
- This is the `snapshot.json` anti-pattern V2 §12 explicitly forbids.
- Refresh lock via a Blob key with 45s TTL.

### 5.3 `app/api/markets/route.ts`
- `GET /api/markets` reads the Blob snapshot (fast path).
- When `?address=` is supplied, it performs **wallet enrichment**: up to 5+ RPC calls per market (`pv`, `rv`, `hvp`, `hcw`, `sh` per outcome) in batches of 5 markets.
- This is a **per-market RPC fan-out on the read path** — the beta "My Votes missing" and "partial markets" root cause.

### 5.4 Refresh triggers
- Netlify scheduled function `markets-refresh-cron` every 45s (`netlify.toml`).
- GitHub Actions workflow `.github/workflows/markets-refresh.yml`.
- `seed_markets.mjs` / `verify_markets.mjs` manual scripts.

---

## 6. Authentication / RPC Infrastructure

Three modules implement the same InterLink challenge/verify/refresh flow against `https://evm-rpc.test-net.interlinklabs.ai/v1/auth`:

| File | Scope | Purpose |
|------|-------|---------|
| `lib/interlinkAuth.ts` | Client | Per-user wallet auth; caches tokens in `localStorage` keyed by lowercase address |
| `lib/interlinkServiceAuth.ts` | Server | Service-wallet auth using `SERVICE_WALLET_PRIVATE_KEY` |
| `lib/interlinkAuthBackend.ts` | Server | Thin re-export of `getValidServiceToken` as `getBackendToken` |

**Assessment:** The challenge/verify/refresh flow is correct and tested in production. **REUSE** the auth primitives, but consolidate the three modules and remove the redundant re-export wrapper.

---

## 7. Wallet Integration

`app/context/Web3Context.tsx` (1090 lines) is a **god-object** containing:
- Wallet connect/disconnect/account-change handling.
- Network switching (`wallet_switchEthereumChain`, chain `19042026`).
- All contract transaction methods (`createMarketOnChain`, `placeBetOnChain`, `castVoteOnChain`, `requestResolutionOnChain`, `resolveMarketOnChain`, `voteOnResolutionOnChain`, `claimPayoutOnChain`, `claimDecRewardsOnChain`, `claimCreatorFeesOnChain`, `joinDecOnChain`, `approveDecRequestOnChain`, etc.).
- History logging to `localStorage`.
- Locale state.
- DEC member directory.

**Assessment:** The wallet primitives (BrowserProvider, authenticated JsonRpcProvider via `FetchRequest` with Bearer header, `eth_sendTransaction` via `window.ethereum.request`) are correct and valuable. **REFACTOR** into a proper wallet service + hooks, removing the god-object and the money-related methods.

---

## 8. API Routes

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/markets` | GET | Read cached markets (+ wallet enrichment) | None |
| `/api/markets/refresh` | POST | Trigger chain scan | `CRON_SECRET` (keeper) |
| `/api/dec-membership` | GET | DEC member info | None (read-only) |
| `/api/dec-requests` | GET/POST/DELETE | DEC membership requests | None (⚠️) |
| `/api/keeper` | POST | Admin keeper actions | `CRON_SECRET` |
| `/api/upload-thumbnail` | POST | Upload market thumbnail | None (⚠️) |

**Security concerns:**
- `/api/dec-requests` and `/api/upload-thumbnail` appear to lack robust authorization.
- No standard API envelope (`{ data, meta, error }`) — V2 §23 requires it.
- No input validation schemas — V2 §60 requires it.

---

## 9. Localization

`app/context/translations.ts` provides `en`, `zh`, `es`, `fr` locale objects with a `t()` helper. However:
- Many components contain **hard-coded English strings** not routed through `t()`.
- Mixed-language UI was a confirmed beta defect (V2 §43).
- No fallback strategy beyond `translations[locale][key] || translations['en'][key]`.

**Assessment:** **REFACTOR** — preserve the locale assets, centralize all strings, add deterministic fallback + persistence.

---

## 10. Theme System

- `app/layout.tsx` injects a `theme-init` inline script reading `localStorage` (`theme` / `interpredict-theme`), toggling a `.dark` class.
- `components/theme-toggle.tsx` toggles dark/light.
- `app/globals.css` defines CSS variables for dark/light.

**Assessment:** **REUSE** the theme mechanism, extend to dark/light/system (V2 §46).

---

## 11. Design System

Only **one** primitive exists: `components/ui/button.tsx`. The spec (V2 §44) requires Button, Input, Select, Card, Modal, Toast, Badge, Tabs, Tooltip, Skeleton, EmptyState, ErrorState, TransactionStatus. Dependencies (`@base-ui/react`, `shadcn`, `cva`) are present but underused.

**Assessment:** **REWRITE** — build the full design system.

---

## 12. Environment Variables

| Variable | Scope | Status |
|----------|-------|--------|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Public | REUSE |
| `NEXT_PUBLIC_TITL_TOKEN_ADDRESS` | Public | **DELETE** (obsolete — no ERC20 used) |
| `PRIVATE_KEY` | Server secret | REFERENCE (deployer) |
| `INTERLINK_TOKEN` | Server secret | REFERENCE |
| `TREASURY_ADDRESS` | Server | REFERENCE |
| `ADMIN_ADDRESS` | Server | REFERENCE |
| `SERVICE_WALLET_PRIVATE_KEY` | Server secret | REUSE |
| `INTERLINK_BACKEND_PRIVATE_KEY` | Server secret | REUSE (alias) |
| `CRON_SECRET` | Server secret | REUSE |

---

## 13. Tests

**There are zero test files** in the repository (no Solidity tests, no TS tests, no React tests, no E2E). This is a major gap the V2 spec (§63–66) mandates closing.

---

## 14. Dead / Duplicated / Obsolete Code

| Item | Issue |
|------|-------|
| `lib/interlinkAuthBackend.ts` | Redundant re-export wrapper |
| `NEXT_PUBLIC_TITL_TOKEN_ADDRESS` | Obsolete (no ERC20) |
| `data/` directory | Empty |
| `temp_markets.json` | Scratch data |
| `dev_server.log`, `dev_server_err.log` | Committed log files |
| `tsconfig.tsbuildinfo` | Build artifact |
| `interpredict-deploy/.vscode_hardhat_config_*.ts` (5 files) | Editor scratch files |
| `InterPredict-Protocol-Upgrade` | Stray file |
| `seed_markets.mjs`, `verify_markets.mjs` | Manual scripts (superseded by indexer) |
| Contract `Closed`/`Unresolved`/`Resolved` states | Declared but never set/reached |
| `components/market-simulator.tsx` | Demo/simulator, not production |

---

## 15. Classification Summary

### REUSE (preserve as-is)
- Branding assets in `public/` (favicon, logos, placeholders).
- InterLink network configuration (chain ID `19042026`, RPC URL, explorer URL).
- InterLink auth challenge/verify/refresh flow (`interlinkAuth.ts`, `interlinkServiceAuth.ts`).
- Environment-variable conventions (minus obsolete `TITL_TOKEN`).
- Theme mechanism (dark/light CSS variables + init script).
- Localization assets (`translations.ts` en/zh/es/fr content).
- `lib/utils.ts` (cn helper).
- Netlify + Next.js plugin deployment configuration.
- Verified contract/network information (deployed address `0x3E5936F13e1194380A66c3c1d75D4D7342299CfF`).

### REFACTOR (keep concept, restructure)
- Wallet integration primitives (extract from `Web3Context.tsx` god-object).
- Localization (centralize all strings, add fallback).
- Auth modules (consolidate 3 → 2, drop wrapper).
- API routes (add envelope, validation, auth).

### REWRITE (replace entirely)
- Smart contract (remove money mechanics, add custom errors, clear naming, full state machine).
- Data layer (Netlify Blobs snapshot → Supabase PostgreSQL read model).
- Indexer (request-time RPC scan → event-driven incremental indexer).
- Market read API (RPC fan-out → PostgreSQL queries).
- UI components (giant components → modular design system).
- Design system (1 primitive → full set).

### DELETE (remove)
- `NEXT_PUBLIC_TITL_TOKEN_ADDRESS` references.
- `data/` (empty), `temp_markets.json`, log files, `tsconfig.tsbuildinfo`.
- `.vscode_hardhat_config_*.ts` scratch files.
- `InterPredict-Protocol-Upgrade` stray file.
- `seed_markets.mjs` / `verify_markets.mjs` (superseded).
- `market-simulator.tsx` (demo).
- `lib/interlinkAuthBackend.ts` (redundant wrapper).

### REFERENCE_ONLY (keep for reference, don't copy)
- `InterPredict.sol` (state machine concept, but money mechanics must go).
- `scanMarkets.ts` (anti-pattern to avoid).
- `marketsCache.ts` (snapshot anti-pattern to avoid).
- Beta failure reports (lessons learned).

---

## 16. Key Beta Failures → Root Causes

| Beta failure | Root cause (confirmed in code) |
|--------------|-------------------------------|
| Partial markets / missing markets | 8 RPC calls/market with `BATCH_SIZE=1`, silent `null` on failure → incomplete fields |
| Stale market counts / browser history vs fresh tab | Netlify Blobs snapshot + 45s cron lag + client-side cache |
| "You haven't placed any predictions yet" | Wallet enrichment depends on per-market RPC fan-out; case-sensitive address comparison |
| ~1 min balance delay | 45s cron refresh interval, no targeted invalidation |
| Created market only visible in history | No targeted sync after `pM()`; proposal waits for next cron |
| Raw `SERVER_ERROR`/`CALL_EXCEPTION`/`eth_sendTransaction` | No central error normalization; obfuscated contract revert strings |
| Error banners persist across pages | Global `txStatus` state never cleared on navigation |
| Mixed languages | Hard-coded English strings outside `t()` |
| Back returns to home | Custom navigation, not router history |
| Mobile session reset | No session restoration; `localStorage` rehydration incomplete |
| Thumbnail distortion | No `object-fit`/`aspect-ratio` enforcement |