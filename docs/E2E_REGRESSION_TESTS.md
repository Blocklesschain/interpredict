# InterPredict V2 — E2E Regression Test Specification

> Version: 2.0.0
> Date: 2026-08-17
> Status: SPECIFIED (implementation pending Playwright setup)

---

## 1. Test Framework

- **Tool:** Playwright
- **Network:** InterLink testnet (chain ID 19042026)
- **Wallet:** MetaMask or compatible EIP-1193 provider (test account)

---

## 2. Required E2E Journeys

### Wallet
```
E2E-001: connect wallet
E2E-002: disconnect wallet
E2E-003: switch account
E2E-004: wallet cancellation (reject signature)
```

### Market Lifecycle
```
E2E-005: create proposal → proposal becomes visible in marketplace
E2E-006: team deploy market → market appears in Active
E2E-007: DEC workflow (enter review → vote → finalize → approve)
E2E-008: market state transitions (Proposed → Active → Closed → Resolved)
E2E-009: participate → participation recorded → My Activity updates
E2E-010: request resolution → resolution workflow → final state
E2E-011: claim winnings → balance/state refresh
```

### Navigation
```
E2E-012: browser refresh preserves state
E2E-013: browser history (Home → Marketplace → Market → Back = Marketplace)
E2E-014: deep link to market detail
```

### Mobile
```
E2E-015: phone suspension/resume → session restored
E2E-016: mobile navigation (responsive breakpoints)
```

### Localization & Theme
```
E2E-017: language switch (en → zh → es → fr)
E2E-018: theme switch (dark → light → system)
```

### Rendering
```
E2E-019: thumbnail rendering (no distortion)
E2E-020: timezone conversion (UTC + local)
```

---

## 3. Beta Regression Suite

Tests named after historical beta failures:

```
regression_my_votes_missing
  → wallet participates → confirmation → event indexed → DB activity created
  → My Activity refetch → participation visible

regression_created_market_missing
  → successful creation → receipt → event → targeted sync → proposal appears

regression_partial_market_loading
  → marketplace page loads → all markets visible → no incomplete fields

regression_stale_browser_cache
  → fresh tab shows same market count as browser history

regression_balance_delay
  → transaction confirmed → balance updates within 10s

regression_resolution_button_invalid
  → resolution already requested → "Request Resolution" button hidden/disabled

regression_raw_rpc_error
  → trigger contract revert → user sees friendly message, not raw error

regression_global_error_persistence
  → error on page A → navigate to page B → error cleared

regression_mixed_localization
  → switch language → entire interface changes consistently

regression_back_navigation
  → Home → Marketplace → Market → Back = Marketplace (not forced Home)

regression_mobile_session_reset
  → lock phone → return → app restores previous route

regression_thumbnail_distortion
  → market with thumbnail → image uses object-fit, not stretched
```

---

## 4. Failure Testing

```
FAIL-001: RPC offline → app shows "network unavailable", not blank
FAIL-002: RPC slow → loading states visible, no freeze
FAIL-003: RPC 429 → retry with backoff, friendly message
FAIL-004: RPC 500 → graceful degradation
FAIL-005: Supabase offline → markets show "failed to load", not empty
FAIL-006: transaction rejected → wallet cancellation message
FAIL-007: transaction reverted → friendly revert message
FAIL-008: indexer crash mid-batch → checkpoint not advanced, data consistent
FAIL-009: duplicated event → no duplicate records (idempotency)
FAIL-010: malformed metadata → indexer logs failure, continues
FAIL-011: slow 3G → page loads with skeletons
FAIL-012: stale cache → freshness metadata shows lag
```

---

## 5. CI Integration

```
Before merge:
  lint → typecheck → contract compile → contract tests → unit tests
  → integration tests → E2E critical path → production build
  → dependency/security checks
```

Critical failure = failed pipeline. Do not suppress errors to obtain a green build.