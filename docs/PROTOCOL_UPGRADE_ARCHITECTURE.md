# Protocol Upgrade Architecture and Migration Notice

## Pre-implementation conflict assessment

The deployed V1 contract is not storage-compatible with this upgrade. V1 uses
native ITL, binary YES/NO mappings, a three-state lifecycle, self-enrolled DEC
membership, owner/oracle settlement, and a 5% fee charged at payout. V2 uses an
ERC-20 settlement token, two-to-four immutable outcomes, role-managed DEC
membership, proposal and resolution votes, a 0.5% fee charged at trade time,
creator seed/refund liabilities, and different payout accounting.

Deploy V2 as a new contract. Do not point the V2 UI at the V1 address until the
V2 address and token address are configured. Existing V1 markets, positions,
native currency, and DEC records remain in V1 and require an explicit
snapshot/migration or continued read-only V1 interface. No automatic migration
is safe because V1 does not store the metadata, outcome arrays, resolution vote
snapshots, or fee liabilities required by V2.

The configured admin receives the admin, team-market, and DEC-manager roles.
Those roles and active DEC membership must be reviewed deliberately. The
settlement token and its decimals are immutable constructor-derived values; the
nonzero treasury starts from the constructor and can later be updated only by
the admin role. Proposal amounts are derived from token decimals rather than
assuming 18.

## Pricing

Let `b[i]` be outcome `i`'s virtual balance and:

`B = sum(b[j])` for every outcome `j`.

The exact pre-trade probability for outcome `i` is:

`p[i] = b[i] / B`.

The contract returns a `1e18`-scaled integer:

`price[i] = floor(b[i] * 1e18 / B)`.

For gross trade amount `g`, the trade fee and net collateral are:

`fee = floor(g * 50 / 10_000)`

`a = g - fee`.

The trade mints:

`shares = floor(a * B / b[i])`.

After issuance, only the selected outcome changes:

`b'[i] = b[i] + a`

`p'[i] = (b[i] + a) / (B + a)`.

For `0 < b[i] < B` and `a > 0`, `p'[i] > p[i]`. Every unselected
outcome has `p'[j] = b[j] / (B + a) < p[j]`. Exact rational prices sum
to one. Individually floored `1e18` values can sum to slightly less than
`1e18`; the maximum deficit is less than one scaled unit per outcome.

The selected outcome's absolute price impact is:

`impact = p'[i] - p[i]`.

The UI currently displays the current price and estimated shares, but does not
display the contract-returned post-trade price or computed price impact. That is
a frontend compliance gap.

This implementation prices the entire order at the pre-trade pool weight. It
does not integrate along a constant-product or LMSR curve. A large order can
therefore receive materially more shares than a curved AMM would issue even
though its post-trade displayed price moves sharply. `minSharesOut` protects
against a changed pre-trade quote, but it does not impose a maximum price impact.
This is a pool-weight pari-mutuel pricing engine, not a constant-product or LMSR
AMM.

### Maximum share issuance

There is no explicit per-trade, per-user, or per-market share cap. For one
quote, Solidity first requires:

`a <= floor((2^256 - 1) / B)`.

If that multiplication succeeds and `b[i] >= 1`, the formula itself yields at
most `2^256 - 1` shares. Execution additionally requires every checked addition
to fit, including:

- `b[i] + a`
- `totalShares[i] + shares`
- `userShares[user][i] + shares`
- market/global collateral, volume, and fee-liability counters

The state-dependent maximum successful issuance is therefore the smallest
remaining headroom across those counters and the multiplication bound, not a
protocol-defined economic cap. Overflow reverts rather than creating unbacked
shares.

Team markets enforce `seedAmount >= proposalSeed`, where `proposalSeed` is ten
whole settlement tokens derived from the token's on-chain decimals. With at
most four outcomes this supplies a nonzero, meaningful initial balance to every
outcome. Community markets use the same ten-token seed. The first outcome
receives any deterministic division remainder, so allocated virtual balances
sum exactly to the original seed.

## Pari-mutuel payout and claim rounding

At finalization:

`P = market.tradingCollateral`

`W = totalShares[winningOutcome]`.

For a non-final winning claimant with `s` winning shares:

`payout = floor(s * payoutRemaining / winningSharesRemaining)`.

After each claim, both remaining values are reduced. When a claimant owns all
remaining winning shares, that claimant receives exactly `payoutRemaining`.
This assigns only accumulated integer-division remainder to the final claimant;
the sum of winner claims cannot exceed `P`. If `W == 0`, each trader may recover
only their recorded net contribution.

Claim-order fairness is bounded by integer rounding but is not formally proven
for arbitrary trader counts and token decimals. The expanded property tests
exercise multiple claim orders and liability coverage.

## Liability accounting

The contract has no general treasury-withdrawal function. Trade-time treasury
allocations are transferred immediately and are never recorded as contract
liabilities.

The intended accounting identity after every successful external call is:

`token balance >= proposal seeds + creator seeds + trading collateral + creator fees + DEC rewards`.

Those terms correspond to:

- `totalProposalSeedLiability`
- `totalCreatorSeedLiability`
- `totalTradingCollateralLiability`
- `totalCreatorFeeLiability`
- `totalDECRewardLiability`

### Creator seed reserve

Community seed starts in `totalProposalSeedLiability`. Approval moves the same
amount into `totalCreatorSeedLiability`; rejection or no-vote cancellation
decrements the proposal liability and transfers the exact seed back atomically.
Team creation transfers its supplied seed before adding it to the creator-seed
liability. Seed is never included in trading collateral or winner payouts.

### Automatic proposal refund liability

For a rejected, tied, expired, or no-vote community proposal, effects are
recorded before `safeTransfer`, but transfer failure reverts the whole
transaction, including state and liability changes. The market record stores
only `refundCompleted` and `proposalFinalizedAt`; it does not store the required
refund amount, recipient, or a dedicated refund timestamp.

### Creator-fee liability

Community creator fees remain in the contract and increase
`totalCreatorFeeLiability`. A successful creator claim decrements the liability
before transfer. Team trades create no creator-fee liability.

### DEC liability

The 20-bps DEC allocation remains in the contract and increases
`totalDECRewardLiability`. At finalization, division dust is removed from the
liability and transferred to treasury.

Reward eligibility is frozen when each resolution vote is cast: the voter must
meet the reputation threshold at that instant. Finalization divides the market
fund only by eligible voters who selected the confirmed outcome. A later
suspension, removal, or reputation decline does not erase that entitlement.
Division dust, or the full fund when no eligible correct voter exists, is
removed from the liability and sent to treasury.

### Active-market cancellation liabilities

Admin cancellation keeps the trade-time fee final. Net trader contributions
remain in `totalTradingCollateralLiability` until individually refunded.
Creator fees remain claimable. The unearned DEC allocation is removed from its
liability and transferred to treasury. Creator seed remains separately reserved
until `returnCreatorSeed` pays the creator. Duplicate refunds are prevented by
zeroing `userNetContribution` before transfer.

### Coverage-proof status

The transition-level identity follows from the checks-effects-interactions
ordering above. The expanded test suite checks the aggregate liability
inequality after proposal creation, activation, trading, creator claims,
resolution payouts, seed return, and active cancellation.

For an exact-transfer token, each external asset movement has a matching
liability movement:

| Transition | Contract asset delta | Recorded liability delta |
| --- | ---: | ---: |
| Community proposal | `+(fee + seed) - fee = +seed` | `+proposalSeed` |
| Proposal approval | `0` | `-proposalSeed + creatorSeed = 0` |
| Proposal rejection/cancellation refund | `-seed` | `-proposalSeed` |
| Team creation | `+seed` | `+creatorSeed` |
| Community trade | `+gross - treasuryPart` | `+net + DEC + creatorFee`, equal to the asset delta after fee dust is assigned to treasury |
| Team trade | `+gross - treasuryPart` | `+net + DEC`, equal to the asset delta |
| Creator-fee claim | `-amount` | `-creatorFee` |
| Winner/refund payout | `-amount` | `-tradingCollateral` |
| DEC reward claim or dust transfer | `-amount` | `-DECReward` |
| Creator-seed return | `-seed` | `-creatorSeed` |
| Active cancellation | DEC treasury transfer, then lazy trader/seed transfers | matching DEC, trading-collateral, and creator-seed liability reductions; creator-fee liability is unchanged until claimed |

Thus equality is preserved from a zero-balance/zero-liability deployment for
the enumerated standard-token paths, except that externally donated tokens can
make assets greater than liabilities. There is no transition that lets treasury
administration withdraw a liability bucket.

This is test evidence, not a formal proof. Slither was run directly against the
contract and reported 25 detector results, including timestamp/equality findings,
inline assembly, and a false-positive weak-PRNG warning for deterministic seed
remainder allocation. Slither's Hardhat adapter could not parse this Hardhat 3
project, so the successful direct run used local solc 0.8.36 rather than the
configured optimized 0.8.20 build. No Echidna, Medusa, Certora, or independent
audit result is present. V2 must not be described as formally proven solvent.

The proof premise is intentionally limited to exact-transfer, non-rebasing
tokens. `_pullExact` checks the protocol's observed incoming balance delta.
`_pushExact` checks both the protocol's outgoing delta and the recipient's
incoming delta. Fee-on-transfer and other non-exact behavior reverts atomically
instead of recording an unbacked requested amount. Rebasing, callback-dependent,
blacklist-sensitive, or otherwise non-standard tokens remain unsupported and
must be rejected during deployment review.

## DEC rewards and reputation

Each trade's 20-bps DEC allocation is credited to that market. At vote time the
contract records whether the voter meets the reward threshold. At market
finalization the allocation is divided only among threshold-eligible voters for
the confirmed outcome. Participation is settled lazily without looping in the
trade or finalization path.

Both `settleMyResolutionParticipation(id)` and permissionless
`settleResolutionParticipation(id, voter)` call the same once-only accounting
path. Correct voters gain 10 reputation points, incorrect voters lose 20, and
the settled flag prevents duplicate rewards or reputation changes. A keeper may
settle discoverable voters in bounded rotating windows, but any account can
settle any individual voter, so incorrect participation cannot be hidden
permanently by refusing to transact.

Previously earned rewards are vested property. `claimDECRewards()` depends only
on a nonzero stored balance; removal, suspension, or reputation below 400 does
not lock it. Those conditions affect eligibility for future votes or reward
accrual. When an admin-confirmed outcome differs from a non-binding failed DEC
result, rewards follow the confirmed winning outcome. Cancelled markets create
no voter reward; their unassigned DEC fund is routed to treasury.

Resolution membership uses monotonically increasing membership checkpoints.
`requestResolution` stores the current epoch, active-member count,
upward-rounded quorum, and deadline. `_wasActiveAt(member, epoch)` provides the
frozen electorate: later additions are excluded and a member active at the
snapshot remains eligible for that round after later suspension or removal.
`getResolutionSnapshotMembers` reconstructs the eligible addresses from the
checkpoint history for bounded off-chain settlement.

## Time transitions

Trading and voting deadlines are enforced directly by timestamps. Permissionless
functions finalize proposal voting, synchronize trading closure, finalize
resolution voting, execute the 24-hour admin-verification timeout, and finalize
confirmed outcomes. A no-vote, no-quorum, or tied resolution that receives no
admin action is cancelled by the timeout; a valid DEC plurality is confirmed
automatically. After a one-hour abandonment grace period, any address may
request resolution for an otherwise abandoned closed market. The keeper is an
availability aid only.

## Thumbnail uploads and URI validation

The contract and UI accept permanent URI input and the UI translates IPFS and
Arweave identifiers to public gateways for display. No upload provider is
configured; the creation form therefore uses a permanent URI input and a
separate local preview. Browser object URLs are never submitted on-chain.

URI validation accepts only nonempty values with a payload beyond an exact
`https://`, `ipfs://`, or `ar://` prefix, subject to the 512-byte bound. Plain
HTTP, prefix-only strings, malformed lookalikes, and unsupported schemes revert.
The optional backup-evidence URI may be empty; every other required URI uses
the same validator.

## Emergency pause matrix

| Operation | Protocol paused | Market paused |
| --- | --- | --- |
| Community/team creation | Blocked | Not applicable |
| Outcome purchase | Blocked | Blocked for that market |
| Proposal/resolution vote | Allowed under normal deadline/state guards | Allowed |
| Expired-state synchronization/finalization | Allowed | Allowed |
| Admin evidence confirmation/timeout/cancellation | Allowed | Allowed |
| Payout, refund, creator fee/seed, DEC reward claim | Allowed | Allowed |
| Permissionless reputation settlement | Allowed | Allowed |

Pauses are emergency trading controls, not a way to extend deadlines or freeze
asset release. Closing or cancelling a paused market clears its market-pause
flag and emits the normal pause-change event.

## Linked reader and runtime-bytecode budget

The pre-hardening optimized runtime of the monolithic main contract was 24,552
bytes, leaving only 24 bytes below the 24,576-byte EIP-170 ceiling. Read-heavy
encoding and pricing helpers were moved to the externally linked
`InterPredictReader` library.

The final measured optimized runtimes are:

| Runtime | Bytes | Release gate | EIP-170 margin |
| --- | ---: | ---: | ---: |
| `InterPredict` | 23,619 | 23,750 | 957 |
| `InterPredictReader` | 3,046 | 4,096 | 21,530 |

The main runtime decreased by 933 bytes. The size gate deliberately preserves
at least 826 bytes of main-contract margin for reviewed compiler drift.

This refactor does not eliminate code risk; it creates a second deployed
runtime and a fixed link dependency. Deployment must verify the reader code
hash, main code hash, and every link-reference byte. The application decodes
`abi.encode(Market)`, outcomes, and pricing through one centralized schema, and
the artifact check compares that schema to the compiler's storage layout.

## Storage layout and migration consequence

V2 is not a proxy upgrade of V1. It must be deployed fresh, so V1 storage is
never interpreted through the V2 layout. The final hardening appended
`resolutionMembershipEpoch`, `adminVerificationDeadline`, and
`resolutionQuorum` to `Market`, then added membership checkpoint,
reward-eligibility, and market-pause mappings after the established V2 storage
fields.

`interpredict-deploy/storage-layout/InterPredict.storage.json` is the reviewed
baseline. `npm run storage:check` rejects unintended compiler-layout drift.
This check protects the reviewed source and decoder schema; it does not turn
the non-proxy contract into an upgradeable deployment.

## API and keeper operating model

Market discovery uses bounded newest-first offset pages, optional ascending
order, exact-ID lookup, bounded RPC concurrency/timeouts, partial-failure
telemetry, and a small cache. It exposes chain block time, pause state,
resolution epoch/deadline/quorum, participant/trade counts, and deployed
settlement-token metadata.

The keeper bounds market scans, wall-clock work, RPC requests, transaction
attempts, and permissionless reputation settlements. Settlement inspection
uses a rotating member cursor so a settled or reverting prefix cannot
permanently starve later voters. Its in-memory overlap flag is instance-local;
a production serverless deployment still requires one logical scheduler and a
distributed lease/nonce-coordination strategy.

## 2026-07-23 remediation decisions

This addendum supersedes the earlier baseline findings where they conflict with
the current source and tests.

- Resolution membership uses a monotonic membership epoch and per-member
  checkpoints. The request stores the epoch, member count, and upward-rounded
  quorum; `voteOnResolution` checks eligibility at that epoch, so later adds,
  suspensions, removals, and replacements cannot alter the electorate.
- Resolution correctness is settled per voter through the permissionless
  `settleResolutionParticipation(marketId, voter)` path. The rotating keeper
  calls that path for bounded voter windows, so incorrect voters cannot evade a
  penalty merely by refusing to self-call. Vote-time eligibility is frozen;
  vested rewards remain claimable after later reputation loss or removal.
- A team creator supplies at least the ten-token seed during creation. Because
  the protocol bounds markets to four outcomes, every activated outcome receives
  nonzero virtual backing; the zero/under-minimum path is rejected before state
  or liability changes.
- `_pullExact` and `_pushExact` compare settlement-token balance deltas around
  every transfer. Fee-on-transfer behavior reverts atomically. Deployment still
  requires the reviewed standard settlement token because post-receipt rebasing
  cannot be controlled by this contract.
- `Pausable` protects creation and trading, while market-level pause state
  protects individual active markets. Lifecycle closure, claims, refunds,
  resolution, and settlement remain live during a trading pause.
- URI validation accepts only `https://`, `ipfs://`, or `ar://` with a bounded
  nonempty payload. The local object URL used for previews is never submitted
  as permanent metadata.
- Ties, no votes, and no quorum enter evidence-backed admin verification. A
  valid DEC plurality is binding; a failed round may be confirmed with reason
  and evidence or cancelled after the verification deadline.
- `ProposalRefunded` is the immutable refund audit record (indexed recipient,
  exact amount, and event block timestamp), while the `Market` tuple now stores
  the resolution requester for API and UI audit display. Payout and cancellation
  paths update outstanding collateral telemetry before transfer.

The linked reader keeps the main runtime below the enforced review budget. The
final artifact is 23,743 bytes for `InterPredict` and 3,058 bytes for
`InterPredictReader`; the configured main-contract limit is 23,750 bytes and
EIP-170 remains 24,576 bytes. This is a review gate, not a claim of unlimited
future bytecode capacity.
