# InterPredict V2 — Rebuild Changelog

> Branch: `interpredict-v2-rebuild`
> Records removed/replaced files with reasons, per the safe rebuild procedure.

Format:

```
OLD: path/to/file
ACTION: REUSED | REFACTORED | REWRITTEN | DELETED
REASON: ...
REPLACEMENT: path/to/new/file
```

---

## Status

**No legacy files have been modified or deleted yet.** This changelog currently records the *planned* disposition of significant legacy files, established during the Phase Zero audit. Entries will be confirmed (and moved to a "completed" section) as each stage of the rebuild is executed.

---

## Planned Dispositions (from audit)

### Smart Contract
```
OLD: interpredict-deploy/contracts/InterPredict.sol
ACTION: REWRITTEN
REASON: Implements real-money wagering (bets, payouts, creator fees, DEC rewards) contradicting V2 §1 non-cash requirement; obfuscated identifiers and error strings; no custom errors; unbounded loops; dead states (Closed/Unresolved/Resolved never set/reached).
REPLACEMENT: contracts/InterPredictV2.sol (pending §0 product decision)
```

### Data / Cache Layer
```
OLD: lib/scanMarkets.ts
ACTION: REWRITTEN
REASON: 8 eth_call RPC requests per market with BATCH_SIZE=1; request-time chain reconstruction is the root cause of partial/missing market beta failures. Replaced by event-driven incremental indexer.
REPLACEMENT: services/indexer/* (to be created)
```

```
OLD: lib/marketsCache.ts
ACTION: REWRITTEN
REASON: Single JSON snapshot in Netlify Blobs (the "snapshot.json" anti-pattern V2 §12 forbids). Replaced by Supabase PostgreSQL read model.
REPLACEMENT: repositories/* + supabase/migrations/*
```

```
OLD: app/api/markets/route.ts
ACTION: REWRITTEN
REASON: Per-market RPC fan-out for wallet enrichment (5+ calls/market) on the read path; no standard envelope; no validation. Replaced by PostgreSQL-backed typed API.
REPLACEMENT: app/api/markets/route.ts (V2)
```

### Auth
```
OLD: lib/interlinkAuth.ts
ACTION: REUSED
REASON: Correct, production-tested client wallet challenge/verify/refresh flow.
REPLACEMENT: (retained, possibly relocated to services/)
```

```
OLD: lib/interlinkServiceAuth.ts
ACTION: REUSED
REASON: Correct, production-tested server service-wallet auth flow.
REPLACEMENT: (retained, possibly relocated to services/)
```

```
OLD: lib/interlinkAuthBackend.ts
ACTION: DELETED
REASON: Redundant thin re-export wrapper; consolidate to a single import path.
REPLACEMENT: (none — import getValidServiceToken directly)
```

### Wallet / Context
```
OLD: app/context/Web3Context.tsx
ACTION: REFACTORED
REASON: 1090-line god-object mixing wallet, contract transactions, history, locale, and DEC directory. Extract wallet primitives (BrowserProvider, authenticated JsonRpcProvider, eth_sendTransaction) into a wallet service + hooks; remove money-related methods.
REPLACEMENT: services/wallet/* + hooks/* (to be created)
```

### Localization
```
OLD: app/context/translations.ts
ACTION: REFACTORED
REASON: Preserve en/zh/es/fr locale content; centralize all strings (eliminate hard-coded English), add deterministic fallback + persistence.
REPLACEMENT: i18n/* (to be created)
```

### Design System
```
OLD: components/ui/button.tsx
ACTION: REWRITTEN
REASON: Only one primitive exists; V2 §44 requires a full design system (Button, Input, Select, Card, Modal, Toast, Badge, Tabs, Tooltip, Skeleton, EmptyState, ErrorState, TransactionStatus).
REPLACEMENT: components/ui/* (to be created)
```

### UI Components
```
OLD: app/app/page.tsx
ACTION: REWRITTEN
REASON: 1000+ line giant component; violates V2 §5 (no giant component files).
REPLACEMENT: app/app/* modular pages + components (to be created)
```

```
OLD: components/markets.tsx
ACTION: REWRITTEN
REASON: Large monolithic market list; rebuild with design system + data-driven categories.
REPLACEMENT: components/markets/* (to be created)
```

```
OLD: components/market-simulator.tsx
ACTION: DELETED
REASON: Demo/simulator component, not production functionality.
REPLACEMENT: (none)
```

### Dead / Obsolete Files
```
OLD: data/ (empty directory)
ACTION: DELETED
REASON: Empty.
REPLACEMENT: (none)
```

```
OLD: temp_markets.json
ACTION: DELETED
REASON: Scratch data.
REPLACEMENT: (none)
```

```
OLD: dev_server.log, dev_server_err.log
ACTION: DELETED
REASON: Committed log files.
REPLACEMENT: (none)
```

```
OLD: tsconfig.tsbuildinfo
ACTION: DELETED
REASON: Build artifact.
REPLACEMENT: (none)
```

```
OLD: interpredict-deploy/.vscode_hardhat_config_*.ts (5 files)
ACTION: DELETED
REASON: Editor scratch files.
REPLACEMENT: (none)
```

```
OLD: InterPredict-Protocol-Upgrade
ACTION: DELETED
REASON: Stray file.
REPLACEMENT: (none)
```

```
OLD: seed_markets.mjs, verify_markets.mjs
ACTION: DELETED
REASON: Manual full-refresh scripts superseded by the incremental indexer.
REPLACEMENT: scripts/backfill.ts (to be created)
```

### Environment Variables
```
OLD: NEXT_PUBLIC_TITL_TOKEN_ADDRESS
ACTION: DELETED
REASON: Obsolete — no ERC20 token is used anywhere in the contract.
REPLACEMENT: (none)
```

---

## Completed Changes

*(None yet — no legacy files have been modified or deleted. This section will be populated as the rebuild proceeds.)*