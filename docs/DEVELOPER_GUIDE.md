# InterPredict V2 Developer Guide

## Repository map

| Area | Purpose |
| --- | --- |
| `interpredict-deploy/contracts/` | Solidity protocol and adversarial test tokens |
| `interpredict-deploy/test/` | Contract, invariant, fuzz/property, storage, and deployment-tool tests |
| `interpredict-deploy/scripts/` | ABI/size/storage gates, deploy, and verification |
| `lib/interpredictProtocol.ts` | Canonical ABI, Market tuple schema, decoders, enums, lifecycle helpers |
| `lib/interpredictFrontend.ts` | Frontend projections and event/history helpers |
| `app/api/markets` | Bounded public market discovery |
| `app/api/dec-membership` | Address-specific DEC/reward projection |
| `app/api/keeper` | Authenticated bounded lifecycle executor |
| `app/` and `components/` | Next.js public and connected application |
| `docs/` | Specification, architecture, compliance, audit, migration, and runbooks |

## Install and validate

Use npm and the checked-in lockfiles:

```bash
npm ci
cd interpredict-deploy
npm ci
```

Root validation:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Protocol validation:

```bash
cd interpredict-deploy
npm run compile
npm test
npm run test:fuzz
npm run test:tooling
npm run abi:check
npm run size:check
npm run storage:check
```

`npm run validate` at either level composes the corresponding release checks.
Use `git diff --check` before handoff.

## Contract model

Market state enum values are:

| Value | State |
| ---: | --- |
| 0 | Proposed |
| 1 | DECProposalVoting |
| 2 | Rejected |
| 3 | Cancelled |
| 4 | Approved |
| 5 | Active |
| 6 | TradingClosed |
| 7 | Unresolved |
| 8 | ResolutionRequested |
| 9 | DECResolutionVoting |
| 10 | AdminVerification |
| 11 | OutcomeConfirmed |
| 12 | Finalized |
| 13 | Resolved |

The current implementation moves directly from `OutcomeConfirmed` to
`Resolved`; state 12 remains an enum compatibility label and is not an
intermediate source for `finalizeMarket`.

Creation and trading are blocked by a global pause. Per-market pause applies to
active trading only. Expired-state synchronization, governance finalization,
resolution, cancellation, and asset-release paths retain their normal state and
deadline guards while paused.

## Linked reader and encoded getters

`InterPredictReader` is an externally linked library used to keep the main
runtime below EIP-170. Deploy and verify it as a separate contract. Do not edit
link placeholders manually.

These getters intentionally return bytes:

```solidity
getMarket(uint256) returns (bytes)
getMarketOutcomes(uint256) returns (bytes)
getMarketPricing(uint256) returns (bytes)
```

The payloads are respectively:

```text
abi.encode(Market)
abi.encode(string[] outcomes)
abi.encode(uint256[] balances, uint256[] shares, uint256[] prices)
```

All TypeScript consumers must use `decodeMarket`, `decodeMarketOutcomes`, and
`decodeMarketPricing` from `lib/interpredictProtocol.ts`. Never duplicate the
tuple string or depend on fragile numeric tuple indexes. The artifact tooling
compares the shared schema against the compiled `Market` storage layout.

After an intentional contract ABI change:

```bash
cd interpredict-deploy
npm run compile
npm run abi:export
npm run abi:check
npm run storage:check
```

Review the JSON diff. Do not export from a stale artifact.

## API contracts

### `GET /api/markets`

Query parameters:

- `cursor`: opaque nonnegative offset, default `0`;
- `limit`: 1–50;
- `order`: `desc` (default/newest first) or `asc`;
- `id`: exact market-ID lookup, mutually independent of page traversal;
- `creator`, `state`, and `category`: optional page-level filters.

Normal pages return `paginationMode: "offset"`, `cursor`, `nextCursor`,
`order`, `totalMarkets`, `scanned`, `failedMarkets`, `degraded`, market arrays,
chain block metadata, pause state, and settlement-token metadata. Follow the
opaque `nextCursor` until null. An exact-ID request returns
`paginationMode: "exact-id"` or HTTP 404.

Reads use fixed pages, bounded concurrency, RPC timeouts, partial-failure
telemetry, and a small in-memory cache. Filtering applies to records in the
scanned page; it is not a global database query.

### `GET /api/dec-membership?address=<wallet>`

Returns member status, participation/reputation, reward threshold, total
earned/claimed, stored/claimable rewards, and future-accrual eligibility.
Previously vested rewards are never reported as locked.

### `GET /api/keeper`

Requires `Authorization: Bearer <CRON_SECRET>`. Work is bounded by page size,
time, RPC timeout, and transaction-attempt limits. The response includes market
cursor and DEC settlement-window telemetry. Treat the route as a convenience:
every deadline and result is enforced on-chain.

## Economic implementation rules

- Community creation: one-token fee plus ten-token seed.
- Team creation: seed at least ten tokens.
- Outcomes: two to four.
- Minimum trade: one hundredth of a whole settlement token, or one base unit
  for very-low-decimal tokens.
- Trade fee: 50 basis points of gross amount.
- Community split: 20 bps treasury, 20 bps DEC, residual creator.
- Team split: 30 bps treasury (including residual), 20 bps DEC.
- Proposal vote: 24 hours.
- Resolution vote: three hours.
- Admin verification: 24 hours.
- Resolution quorum: upward-rounded 50% of snapshotted active members.
- Reward threshold: 400 reputation.

Transfers must change both protocol and recipient balances by the exact
requested amount. Do not configure fee-on-transfer or rebasing tokens.

## Contribution rules

1. Read the complete specification and compliance matrix.
2. Preserve storage ordering unless a deliberate redeployment/migration is
   approved.
3. Add tests before changing security, economic, lifecycle, or role behavior.
4. Keep the ABI, decoder schema, APIs, UI labels, legal copy, and diagrams in
   sync.
5. Re-run bytecode size and storage checks for every Solidity change.
6. Never commit secrets, deployment approval phrases with real credentials,
   local environment files, or wallet material.
7. Do not deploy merely because the automated suite passes; deployment requires
   independent review and explicit authorization.

