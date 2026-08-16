# InterPredict V2 — Test Plan

> Version: 2.0.0
> Date: 2026-08-16
> Status: DRAFT (Phase Zero)

---

## 1. Testing Stack

| Layer | Tool |
|-------|------|
| Solidity | Hardhat (unit, fuzz, invariants, permissions, state machine) |
| TypeScript | Vitest |
| React | Vitest + React Testing Library |
| APIs | Vitest (supertest-style) |
| Integration | Vitest |
| E2E | Playwright |

---

## 2. Contract Tests

- Unit tests per function.
- State-transition tests (every edge in CONTRACT_STATE_MACHINE).
- Permission tests (role gating).
- Invalid-state tests.
- Boundary tests (min/max outcomes, lengths, amounts).
- Fuzz tests (amounts, outcome indices).
- Invariant tests (value accounting, state machine).
- Event-emission tests.

Explicitly test:
```
duplicate proposal action
duplicate participation
duplicate resolution request
unauthorized DEC action
invalid outcome
expired market
incorrect state
cancelled wallet transaction
reverted transaction
```

---

## 3. Database Tests

- Constraint tests (unique keys).
- Idempotent upsert tests.
- Migration tests (up/down).

---

## 4. Indexer Tests

- Duplicate events.
- Restart / checkpoint recovery.
- RPC failure.
- DB failure.
- Reprocessing (idempotency).

---

## 5. API Tests

- Validation (schemas).
- Pagination.
- Errors (envelope + codes).
- Authorization (admin routes).

---

## 6. Frontend Tests

- Component tests.
- Navigation tests.
- Responsive behavior.
- Loading/error states.

---

## 7. E2E Tests (required journeys)

```
connect wallet
disconnect wallet
switch account
create proposal
proposal becomes visible
DEC workflow
market state transitions
participation recorded
My Activity/My Votes updates
request resolution
resolution workflow
final state
balance/state refresh
wallet cancellation
RPC outage
RPC rate limit
database outage
indexer delay
duplicate event
browser refresh
browser history
phone suspension/resume
mobile navigation
language switch
theme switch
thumbnail rendering
timezone conversion
```

---

## 8. Beta Regression Suite

Tests named after historical beta failures:

```
regression_my_votes_missing
regression_created_market_missing
regression_partial_market_loading
regression_stale_browser_cache
regression_balance_delay
regression_resolution_button_invalid
regression_raw_rpc_error
regression_global_error_persistence
regression_mixed_localization
regression_back_navigation
regression_mobile_session_reset
regression_thumbnail_distortion
```

---

## 9. Failure Testing

Simulate:
```
RPC offline, RPC slow, RPC 429, RPC 500
Supabase offline
transaction rejected, transaction reverted
indexer crash mid-batch
duplicated event
malformed metadata
slow 3G
stale cache
```

Application must degrade gracefully.

---

## 10. CI Gates

Before merge:
```
lint
typecheck
contract compile
contract tests
unit tests
integration tests
E2E critical path
production build
dependency/security checks
```

Critical failure = failed pipeline. Do not suppress errors to obtain a green build.