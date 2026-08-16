# InterPredict V2 — Migration Strategy

> Version: 2.0.0
> Date: 2026-08-16
> Status: DRAFT (Phase Zero)

---

## 1. Overview

V2 is a ground-up rebuild inside the existing repository. The migration is **incremental**, not a big-bang replacement. The legacy application remains recoverable at every checkpoint.

---

## 2. Incremental Replacement Strategy

```
AUDIT
  ↓
ARCHITECT
  ↓
BUILD NEW FOUNDATION
  ↓
TEST FOUNDATION
  ↓
REPLACE OLD MODULE
  ↓
TEST
  ↓
CONTINUE
```

---

## 3. Legacy Code Classification

Per `LEGACY_ARCHITECTURE_AUDIT.md`:

- **REUSE** — branding, network config, auth flow, env conventions, theme, locale assets, utils, Netlify config.
- **REFACTOR** — wallet primitives, localization, auth modules, API routes.
- **REWRITE** — contract, data layer, indexer, market API, UI, design system.
- **DELETE** — dead/obsolete files (recorded in `V2_REBUILD_CHANGELOG.md`).
- **REFERENCE_ONLY** — legacy contract, scanMarkets, marketsCache.

---

## 4. Data Migration (zero-downtime)

```
Phase A: Deploy database/indexer
Phase B: Backfill
Phase C: Validate parity
Phase D: Enable DB read API
Phase E: Switch frontend reads
Phase F: Monitor
Phase G: Remove obsolete code only after confidence period
```

---

## 5. Backfill

If existing testnet data must appear in V2, a dedicated backfill script indexes historical events. Backfill is resumable, observable, idempotent — never mixed with request handling.

---

## 6. Contract Migration

The legacy `InterPredict.sol` is replaced by `InterPredictV2.sol`. The new contract is deployed to testnet with a new address; the frontend is reconfigured via `NEXT_PUBLIC_CONTRACT_ADDRESS`. No Mainnet deployment.

---

## 7. Rollback

See `ROLLBACK_PLAN.md`. The legacy application remains on `main` (tag `interpredict-beta-final`) and can be restored by reverting the branch or re-deploying the legacy commit.

---

## 8. Git Safety

- Work on `interpredict-v2-rebuild` branch.
- No force push, no history rewrite, no main deletion.
- Local commits after each completed stage.
- No merge to main without explicit authorization.