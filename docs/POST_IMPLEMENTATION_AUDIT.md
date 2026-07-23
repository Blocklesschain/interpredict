# InterPredict V2 Post-Implementation Audit

## Scope and constraints

This audit reviews the local `feature/protocol-upgrade` working tree against
`INTERPREDICT_COMPLETE_PROTOCOL_SPECIFICATION.md`. No commit was pushed, no
branch was merged, no contract was deployed, and no production address was
changed.

The complete specification was restored byte-for-byte from VS Code local
history. The restored copy and recovered source both have SHA-256:

`2A2EBDD9D3C680FF6BB3DC42D49615B99D05FC7018290C6B7CFD018CF9647413`.

Detailed requirement status is in `PROTOCOL_COMPLIANCE_MATRIX.md`. Detailed
frontend evidence is in `UI_REGRESSION_REVIEW.md`. Pricing and liability
analysis is in `PROTOCOL_UPGRADE_ARCHITECTURE.md`.

## Executive decision

The implementation is suitable for continued code review, but it is not ready
for testnet deployment. Compilation and a broad passing test suite are necessary
but do not close the governance, token-accounting, product-regression, and
deployment-size findings below.

## Compliance matrix summary

The matrix contains 73 major-requirement rows spanning all 57 specification
sections:

- 20 `Implemented and tested`
- 3 `Implemented but insufficiently tested`
- 50 `Partially implemented`
- 0 `Not implemented`
- 0 `Intentionally changed`

The zero `Not implemented` count does not mean no functionality is absent.
Several rows group an integrated requirement whose contract portion exists but
whose required pause control, UI, API, audit fields, or escalation path is
absent; those rows are conservatively `Partially implemented`. A test that
reproduces a defect is recorded as limitation evidence and does not upgrade that
requirement's status.

## Security and protocol findings

### High: the resolution electorate is not snapshotted

`requestResolution` stores only `activeDECMemberCount`. It does not store the
eligible member set or the calculated quorum. `voteOnResolution` checks current
membership. A member added after the snapshot can vote, while a member suspended
after the snapshot cannot, even though the original count still controls quorum.
This permits governance manipulation around an active resolution round.

### High: nominal ERC-20 accounting assumes exact transfers

Creation and trading credit the requested transfer amount after
`safeTransferFrom`, but do not compare the contract's balance before and after.
SafeERC20 verifies call success; it does not reject fee-on-transfer, rebasing, or
otherwise nonstandard accounting behavior. Such a token can make recorded
liabilities exceed received assets. Deployment must be restricted to a verified
standard tITL token or the contract must account from actual balance deltas.

### High: team seed adequacy is undefined

`createTeamMarket` requires only `seedAmount > 0`. A seed smaller than the
outcome count gives some outcomes a zero virtual balance while the market still
activates. Those outcomes cannot be quoted or bought. A minimum backed seed,
expressed in token units and sufficient for every outcome, is required.

### High: DEC reward shares can become permanently locked

Finalization divides DEC funds by every vote for the confirmed outcome.
Accrual later requires the voter to be active, not removed, and above the
reputation threshold. A removed or persistently ineligible correct voter's
nominal share remains in `totalDECRewardLiability` without a claim,
redistribution, or treasury-release path. Coverage remains, but reward funds can
be stuck indefinitely. Removal is irreversible and `claimDECRewards` requires
active status, so removing a member can also make rewards that were already
stored for that member permanently unclaimable.

### High: incorrect DEC voters can avoid reputation penalties

`settleMyResolutionParticipation` is voluntary and self-only. Honest voters have
an incentive to call it and receive a reputation increase, but an incorrect
voter can simply never call. Nothing in confirmation, finalization, reward
accrual, or later voting forces settlement. That voter therefore avoids the
20-point penalty and can preserve future reward eligibility. The expanded suite
proves that settlement applies the expected changes when called; it cannot make
the optional call mandatory.

### High: deployment bytecode has effectively no headroom

The final configured optimized Hardhat artifact is 24,552 runtime bytes and
25,867 creation bytes. EIP-170 permits 24,576 runtime bytes, leaving only 24
bytes of headroom. Any small logic, metadata, or compiler change can make
deployment fail. The runtime must be reduced materially and guarded in CI.

### Medium: required pause control is absent

The specification requires OpenZeppelin `Pausable` and paused-market trading
checks. The contract has no protocol or market pause operation. Emergency active
market cancellation is not an equivalent reversible pause.

### Medium: URI validation does not enforce the documented formats

The assembly prefix check accepts any string beginning with `http`, including
malformed schemes, rather than requiring HTTPS. The padded `bytes10("ar://")`
comparison can reject normal Arweave URIs. URI parsing should use explicit
length-and-prefix comparisons.

### Medium: admin escalation is incomplete

Admin confirmation requires a reason and evidence, and a valid DEC plurality is
binding. However, there is no controlled second resolution round, and
`cancelActiveMarket` does not accept `AdminVerification`; tied/no-quorum markets
cannot use the specification's cancellation escalation path.

An eligible trader can also request resolution as soon as trading closes. That
moves the market beyond the states accepted by `cancelActiveMarket`, so a trader
can win a race against an administrator attempting to cancel an abandoned or
unresolvable event. There is no administrator confirmation deadline; loss of the
administrator key or prolonged inactivity can lock collateral indefinitely.

### Medium: proposal refund records are incomplete

Automatic proposal refunds are atomic, but the market stores only a completion
flag and proposal finalization timestamp. It does not store the required refund
amount, recipient, or dedicated refund timestamp.

### Medium: current-status reward eligibility enables retroactive accrual

An ineligible voter cannot accrue a market reward, but after reputation recovery
they can accrue that old market later. The specification says no retroactive
rewards should be added for the suspension period unless explicitly designed.
The implemented behavior is not documented as an intentional protocol choice.

### Medium: public API work grows without a bound

`/api/markets` loads every market and performs three concurrent RPC reads per
market before filtering. Arbitrary creator/state/category query variants bypass
the unfiltered cache. There is no pagination, result cap, rate limit, or
partial-failure path, so one failed read fails the response and market growth
amplifies RPC work. The keeper similarly scans all markets sequentially. This is
a service-availability and authenticated-RPC cost risk.

### Low: creator seed return is permissionless

`returnCreatorSeed` can be called by any address, although it always transfers
to the stored creator. This cannot redirect funds, but it differs from the
specified creator-only claim and lets third parties force claim timing.

### Low: per-market accounting telemetry becomes stale

Winner payouts reduce `payoutRemaining` and the global trading liability but do
not reduce `market.tradingCollateral`. Finalization transfers DEC rounding dust
to treasury without reducing `market.decRewardFunds`. These fields can therefore
read as historical funded totals rather than current outstanding balances.
Global liability counters and guarded claim paths prevent a second spend, but
the API and documentation must label the fields correctly or update them.

### Informational: static-analysis triage

Slither's Hardhat adapter failed to parse the Hardhat 3 output. A direct Slither
run with local solc 0.8.36 completed and returned 25 detector results. Most are
expected or false positives for this design: timestamp use for deadlines,
strict equality for zero/tie detection, default-initialized locals, and a
weak-PRNG warning on deterministic division remainder. It also flagged inline
assembly in URI validation. The direct unoptimized build exceeded EIP-170;
deployment size must be judged using the final configured optimized artifact.

No arbitrary asset-withdrawal function, reentrancy path, or
payout-over-liability claim path was found under a standard exact-transfer
settlement token. External token transfers use SafeERC20, mutating claim paths
use checks-effects-interactions with `nonReentrant`, and remaining-share payout
accounting caps aggregate withdrawals. This positive finding is conditional on
the token-accounting and reward-liveness limitations above.

## Economic findings

The contract separates proposal seeds, activated creator seeds, net trading
collateral, creator fees, and DEC rewards. Treasury allocations leave the
contract immediately, and there is no arbitrary treasury withdrawal over user
assets. Winner payouts draw only from net trading collateral; seed is not
double-counted.

The intended coverage inequality is:

`token balance >= proposal seed + creator seed + trading collateral + creator fee + DEC reward liabilities`.

Expanded lifecycle/property tests exercise this inequality. They are test
evidence rather than a formal proof. The inequality is conditional on exact
ERC-20 transfers; fee-on-transfer behavior breaks the premise.

The pool-weight pricing model remains payout-solvent under standard token
behavior, but it prices an entire order at its pre-trade price rather than
integrating price movement across the order. Large orders can receive much more
favorable execution than a curved AMM even though the post-trade displayed
probability moves sharply.

## Frontend, API, and ABI findings

The checked-in generated ABI matched the compiled artifact at audit time and
runtime protocol consumers share that ABI. Market tuple decoding uses named
outputs. Shared active/inactive helpers now keep pending, rejected, and
proposal-cancelled records out of public trading lists while including active
team markets and resolution lifecycle states.

The frontend is nevertheless a major product regression. The dApp was reduced
from the established full dashboard to a small protocol console. Positions,
winner claims, losing-position status, trader resolution requests, cancellation
refunds, team creation, admin verification/cancellation, DEC member management,
complete reward processing, resolved/unresolved public views, refresh controls,
wallet session/chain handling, and most localization are absent. Several public
documentation and translation pages still describe V1 binary pools, the old
oracle, old fee percentages, and obsolete V1 functions.

The markets API performs three concurrent RPC calls per market with no
pagination or partial-failure handling. User positions, claims, cancellation
refunds, per-outcome resolution vote counts, and the member's own votes have no
API path. A resolution requester cannot be exposed because the contract does
not store it.

The keeper's confirmed-market transition was initially mapped to enum value 12.
`OutcomeConfirmed` is value 11 and `finalizeMarket` moves directly from 11 to
`Resolved` (13), so value 12 is never reached. The route was corrected during
this audit to call `finalizeMarket` for state 11. The keeper route still has no
integration test and retains the unbounded scan noted above.

## UI execution evidence

The local Next.js development server started successfully. Direct HTTP checks
returned status 200 for `/`, `/app`, `/whitepaper`, `/documentation`,
`/governance-forum`, `/terms-of-service`, `/privacy-policy`, and
`/risk-disclosure`.

`/api/markets` returned 502 with `Forbidden` in the server log. This is an
environment/authenticated-RPC failure in the current local configuration, so
live market states could not be exercised.

The requested browser inspection could not be completed because the browser
runtime reported no available browser backend. No desktop/mobile screenshot or
visual-behavior claim is made. Responsive, keyboard, focus, wallet-extension,
and stateful lifecycle checks remain required.

## Validation results

The contract suite contains **114 passing tests**, with **0 failing**, **0
pending/skipped**, and no `.only`/`.skip` markers. Every exact hierarchical test
title is recorded in `CONTRACT_TEST_INVENTORY.md`.

| Command or check | Working directory | Result |
| --- | --- | --- |
| `npm test` | `interpredict-deploy` | Passed: 114 passing, 0 failing. |
| `npx hardhat compile` | `interpredict-deploy` | Passed: `No contracts to compile` after the final compiled artifact. |
| `npx hardhat test` | `interpredict-deploy` | Passed: 114 passing, 0 failing. |
| `npx tsc --noEmit` | repository root | Passed with no diagnostics. |
| `npm run lint` | repository root | Failed before linting: `'eslint' is not recognized`. This is a pre-existing tooling gap: `main` has the same lint script and no ESLint dependency. |
| `npm run build` | repository root | Passed: Next.js production compilation and all 16 static/dynamic route entries completed. |
| `git diff --check` | repository root | Passed; Git emitted only expected LF-to-CRLF working-copy warnings. |
| ABI canonical JSON comparison | repository root | Passed: checked-in ABI and final Hardhat artifact both have 120 entries and compare equal. |
| Optimized artifact size | `interpredict-deploy` | Runtime 24,552 bytes; creation 25,867 bytes; EIP-170 margin 24 bytes. |
| `slither . --filter-paths "node_modules\|contracts/test"` | `interpredict-deploy` | Tool integration failed with `KeyError: output` because the Slither adapter could not parse this Hardhat 3 build output. |
| `slither contracts/InterPredict.sol --solc-remaps "@openzeppelin/=node_modules/@openzeppelin/" --filter-paths "node_modules\|contracts/test"` | `interpredict-deploy` | Direct analysis completed with local solc 0.8.36 and returned exit 1 for 25 detector results; triage is described above. |
| Local HTTP route checks | local Next.js dev server | `/`, `/app`, `/whitepaper`, `/documentation`, `/governance-forum`, `/terms-of-service`, `/privacy-policy`, and `/risk-disclosure` returned 200. `/api/markets` returned 502 with an authenticated-RPC `Forbidden` error. |
| Browser desktop/mobile inspection | browser control runtime | Blocked: runtime reported no available browser backend. No screenshots or visual-behavior claim is made. |

The property/invariant portion is part of the 114-test suite. Its exact cases
cover aggregate asset/liability equality through the standard-token lifecycle,
proposal-refund coverage, treasury administration, deterministic fee allocation,
claim-order rounding, active cancellation, entitlement caps, and immutable
forward-only final state. These are deterministic property cases, not fuzzing or
a formal proof. The fee-on-transfer counterexample deliberately demonstrates
that the coverage invariant is not universally true across the ERC-20 behaviors
accepted by the current constructor.

No compile, contract-test, TypeScript, production-build, ABI, or diff-check
failure was introduced by the audited working tree. The lint dependency gap
exists on `main`; the browser-backend and authenticated-RPC failures are local
environment/integration blockers. The direct Slither findings, EIP-170 margin,
and protocol defects are implementation risks rather than validation-tool
availability issues.

## Files in the audited working tree

Modified tracked files:

- `README.md`
- `app/api/dec-membership/route.ts`
- `app/api/keeper/route.ts`
- `app/api/markets/route.ts`
- `app/app/page.tsx`
- `app/context/Web3Context.tsx`
- `app/page.tsx`
- `interpredict-deploy/contracts/InterPredict.sol`
- `interpredict-deploy/hardhat.config.js`
- `interpredict-deploy/package-lock.json`
- `interpredict-deploy/package.json`
- `interpredict-deploy/scripts/deploy.js`
- `vercel.json`

New files:

- `docs/CONTRACT_TEST_INVENTORY.md`
- `docs/INTERPREDICT_COMPLETE_PROTOCOL_SPECIFICATION.md`
- `docs/POST_IMPLEMENTATION_AUDIT.md`
- `docs/PROTOCOL_COMPLIANCE_MATRIX.md`
- `docs/PROTOCOL_UPGRADE_ARCHITECTURE.md`
- `docs/UI_REGRESSION_REVIEW.md`
- `interpredict-deploy/contracts/test/MockToken.sol`
- `interpredict-deploy/test/InterPredict.test.js`
- `lib/interpredictAbi.json`
- `lib/interpredictProtocol.ts`

There are no audited deletions. Generated `tsconfig.tsbuildinfo` validation
changes were restored and are not part of the implementation.

## Review handoff text

Suggested local commit title, if approved later:

`feat: audit and harden InterPredict V2 protocol upgrade`

Suggested pull-request summary, if approved later:

> Implements the local InterPredict V2 contract/API/frontend migration,
> restores the complete 57-section specification, adds a requirement-level
> compliance matrix and economic/UI audit, and expands contract coverage to 114
> passing cases. This remains a review draft: testnet deployment is blocked by
> governance snapshot/penalty defects, token-accounting assumptions, stranded
> DEC rewards, bytecode headroom, missing pause/escalation controls, and major
> frontend regression work.

No commit, push, merge, pull request, deployment, or production-address change
was performed.

## Readiness

- Ready for implementation review: **Yes, with the findings above treated as
  blockers rather than approval.**
- Ready for testnet deployment: **No.**
- Ready for production deployment: **No.**

## Current remediation audit — 2026-07-23

The earlier findings above are the Sol Ultra baseline. On the current
`feature/protocol-upgrade` working tree, the prioritized recommendations were
rechecked against source and tests. The contract suite now reports **117
passing** tests with no failures, skips, or focused tests.

Confirmed by code and tests:

- DEC snapshots are epoch/checkpoint based, including the electorate, not only
  a denominator count.
- Reputation settlement is permissionless per voter and keeper-compatible;
  vote-time reward eligibility and once-only settlement prevent both reward
  stranding from eligibility changes and self-settlement evasion.
- Team creation rejects a seed below the ten-token protocol minimum before
  recording activation or liability.
- Every token transfer uses balance-delta exactness checks.
- Linked-reader artifacts pass the runtime budget: `InterPredict` is **23,743
  bytes** and `InterPredictReader` is **3,058 bytes**. The prior audited
  artifact was 24,552 runtime bytes; the current branch is 809 bytes smaller
  overall. The artifact-tool limit is 23,750 bytes; EIP-170 is 24,576 bytes.
- Protocol and market pauses, exact URI prefixes, tie/no-quorum escalation,
  evidence-backed admin confirmation, and admin timeout paths are present and
  tested.
- The restored frontend contains wallet session/chain handling, marketplace,
  positions, claims, refunds, governance, rewards, team/admin actions, refresh,
  surfaced transaction errors, and bounded slippage input.
- Market API pages and keeper scans are bounded; partial reads are reported;
  keeper settlement uses a rotating cursor. Pure keeper-policy tests pass.
- Proposal refunds retain exact event audit data, resolution requester is stored
  in the market tuple, and outstanding trading/reward telemetry is updated as
  claims/settlements occur.

Validation executed for this remediation:

| Command | Result |
|---|---|
| `npx hardhat compile` (`interpredict-deploy`) | Passed; solc 0.8.20, only reader mutability warnings. |
| `npm test` (`interpredict-deploy`) | Passed; 117 passing. |
| `npx tsc --noEmit` (repository root) | Passed. |
| `npm run abi:check` (`interpredict-deploy`) | Passed; 140 ABI entries. |
| `npm run storage:check` (`interpredict-deploy`) | Passed. |
| `npm run size:check` (`interpredict-deploy`) | Passed; 23,743 / 3,058 runtime bytes. |
| `git diff --check` | Required final run; result recorded in handoff. |

The branch is ready for code review, but not for testnet or production
deployment. Testnet remains blocked by the 7-byte review-budget margin, absent
live RPC/browser integration evidence, and the need to verify the canonical
settlement token and deployment manifest. Production additionally requires a
distributed keeper lease/nonce strategy and independent security/economic
review. No push, merge, deploy, or production-address change was performed.
