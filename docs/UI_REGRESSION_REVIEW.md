# InterPredict V2 UI, API, and ABI Regression Review

> **Final-hardening note (July 23, 2026):** This document began as a review of
> the incomplete baseline and retains that evidence for traceability. The
> restoration work subsequently changed the frontend substantially. The
> "Final hardening integration delta" at the end supersedes baseline statements
> about removed wallet/lifecycle workflows and V1 public copy. Real browser and
> stateful staging verification is still required; static restoration is not a
> screenshot-based pass.

## Review scope and evidence

This is a static source review of the V2 working tree against:

- `docs/INTERPREDICT_COMPLETE_PROTOCOL_SPECIFICATION.md`, especially sections 45–51.
- The post-implementation audit checklist.
- The established interface at Git `main` (`50f2500`).
- The generated V2 ABI and the current Hardhat artifact.

This document does **not** claim a browser inspection or screenshot review. Desktop and mobile browser validation remains pending and is listed at the end.

The scale of the replacement is material:

| File | `main` lines | V2 working-tree lines at review time |
| --- | ---: | ---: |
| `app/app/page.tsx` | 1,138 | 200 |
| `app/page.tsx` | 243 | 37 |
| `app/context/Web3Context.tsx` | 1,503 | 50 |

Line count alone is not a defect, but inspection confirms that many user-facing flows previously present in those removed sections were not reimplemented for V2.

## Local runtime evidence

The root audit started the Next development server successfully and performed HTTP checks:

| Request | Result |
| --- | --- |
| `/` | HTTP 200; 25,902-byte response |
| `/app` | HTTP 200; 26,518-byte response |
| `/whitepaper` | HTTP 200 |
| `/documentation` | HTTP 200 |
| `/governance-forum` | HTTP 200 |
| `/terms-of-service` | HTTP 200 |
| `/privacy-policy` | HTTP 200 |
| `/risk-disclosure` | HTTP 200 |
| `/api/markets` | HTTP 502; server log reported `Forbidden` |

The page responses prove that these routes compiled and rendered server responses in the local environment. They do not prove visual correctness or successful protocol-data integration. The markets API failure was an environment/authenticated-RPC failure, not a page compilation failure, but it means real-market UI states could not be exercised locally.

Browser runtime discovery found no available browser backend. No desktop/mobile viewport inspection or screenshots were possible. The dev server was stopped after the HTTP checks.

## Overall conclusion

The V2 frontend is **not ready for product review or testnet deployment**. It is currently a simplified protocol console rather than a complete upgrade of the established InterPredict interface.

The V2 code correctly introduces dynamic two-to-four-outcome cards, contract-provided metadata, category filtering, ERC-20 approval, trade-time fee/slippage information, DEC proposal voting, and basic creator history. However, it removes or omits essential established and specified flows: wallet session handling, manual refresh, positions, payout claims, trader resolution requests, cancellation refunds, team-market creation, admin verification, lifecycle finalization, complete creator history, complete DEC resolution data, multilingual page content, and the established landing-page architecture/footer.

## Established-interface preservation checklist

| Area | Result | Static evidence and finding |
| --- | --- | --- |
| Branding | Partial regression | The shared `Navbar` and `Logo` remain, and the InterPredict name remains. The established localized hero, architecture narrative, footer, legal links, social links, and Interlink presentation were removed from `app/page.tsx`. The dApp’s established dark terminal shell was replaced by a generic page headed “InterPredict V2.” |
| Layout | Regression | The responsive four-column dApp shell, desktop sidebar, mobile tab selector, persistent status panel, and transaction/history areas from `main:app/app/page.tsx` are gone. The replacement is a small row of pill tabs and a single content panel in `app/app/page.tsx:84-113`. |
| Navigation | Regression | `components/navbar.tsx:19-21` links to `#markets`, `#architecture`, and `#ecosystem`. The V2 homepage defines only `#markets` (`app/page.tsx:30`), so “How it works” and “Ecosystem” have no targets. On `/app`, none of those anchors exists, so all three section links target missing anchors on the dApp route. Dedicated dApp tabs for My Votes, Unresolved Markets, Resolved Markets, History, Join DEC, and DEC Members were removed. |
| Responsive behavior | Pending browser verification; static regression risk | The replacement uses responsive Tailwind grids and wrapping controls, but the established mobile tab menu and labeled mobile dApp navigation were removed. The dense trade card uses a fixed two-column input/metric presentation. It must be inspected at mobile widths before approval. |
| Wallet connection | Major regression | A basic `eth_requestAccounts` flow remains (`app/app/page.tsx:42-57`). The prior disconnect action, session restoration, `accountsChanged` handling, Interlink chain switching/addition, persistent connection state, and transaction history were removed with the Web3 context. The V2 page never listens for account or chain changes, so the displayed account/DEC status can become stale. |
| Market creation | Partial | The form captures V2 question, description, category, custom category, thumbnail URI, two-to-four outcomes, end time, criteria, and evidence (`app/app/page.tsx:144-178`). It correctly keeps object-URL preview separate from the permanent URI. Missing: configured storage upload, team-market creation, visible validation feedback, a safe error state, and preservation of the established guided creation experience. Submission errors are swallowed by `.catch(() => {})` at line 162. |
| Trading experience | Partial regression | Cards render every outcome dynamically, display price, fee, net, estimated/minimum shares, volume, and end time. The active filter now excludes elapsed markets. Missing: user positions, transaction history, exact on-chain quote retrieval, minimum-trade feedback, balance/allowance presentation, trade confirmation details, and claim flows. Invalid free-form slippage text can make `BigInt(NaN)` execute during render (`app/app/page.tsx:128`), crashing the card. Trade errors are swallowed at line 138. |
| Resolved and unresolved views | Missing in dApp | There is no public inactive/resolution tab in `/app`, no resolved-market detail, no winning-position view, and no payout button. Resolution-stage records are shown only inside the DEC-only governance tab. The homepage now classifies closed/resolution/resolved records as inactive, but its cards only link back to the active-only dApp. |
| Refresh controls | Missing | The established manual refresh controls were removed. `refresh()` exists but runs only on initial mount and after a successful write (`app/app/page.tsx:34-40,66`). The homepage fetches only once. |
| Multilingual behavior | Major regression | `Web3Context` still translates the shared navbar, but essentially all new homepage and dApp content is hard-coded English. Changing language therefore updates only navigation labels. The local-storage key also changed from the established `interpredict_lang` to `interpredict-locale`, so existing preferences are not migrated. |
| Existing accessibility behavior | Partial regression | The new trade amount and slippage fields have `aria-label`s. Most creation fields rely only on placeholders, outcome inputs have no programmatic label, the status popup is not an `aria-live` region, and the mobile navbar icon button lacks an accessible name/expanded state. Market thumbnails use empty alt text; that is acceptable only if treated as decorative and the adjacent question remains the accessible name. Keyboard, focus, contrast, and screen-reader behavior require browser testing. |

Some existing metadata/translation content also contains mojibake encoding sequences (for example `â€”`, `Â©`, and corrupted non-English strings in `app/layout.tsx` and `app/context/translations.ts`). Validation output also surfaced ellipsis/separator mojibake forms such as `â€¦` and `Â·` in some render paths. All user-visible source files should be normalized and verified as UTF-8 in a real browser.

## Protocol UI requirements

### Homepage Explore Markets

The homepage loads real API data and contains separate “Active Trades” and “Inactive Trades” sections. Shared lifecycle helpers now implement the specification’s public split:

- Active: only state `Active` with `tradingEndTime > now`.
- Inactive: elapsed active-state markets, states `Trading Closed` through `Resolved`, and active-market cancellations.
- Excluded from public sections: pending proposals, rejected proposals, and no-vote proposal cancellations.

This resolves the earlier inconsistency where resolution states 7–12 disappeared and the dApp still offered elapsed state-5 records as trades.

Remaining homepage gaps from specification section 46:

- No Active/Inactive toggle; both lists are always rendered.
- No question search.
- No newest, ending-soon, liquidity, or volume sorting.
- API failures are converted into an empty list (`app/page.tsx:16-22`), so a network/authentication failure is indistinguishable from “no markets.”
- No manual retry/refresh control.
- Cards omit origin, liquidity, volume, participant count, and detailed resolution information.

### Marketplace and lifecycle placement

| On-chain state | Public placement after audit fix | DApp action coverage |
| --- | --- | --- |
| Proposed (0) | Not public | None; normally transient inside creation |
| DEC Proposal Voting (1) | Pending/DEC and creator history only | DEC approve/reject; creator can permissionlessly finalize after deadline |
| Rejected (2) | Creator history only | Reason shown, but refund completion/amount is not rendered |
| Cancelled (3), proposal cancellation | Creator history only | Reason shown; refund completion/amount is not rendered |
| Cancelled (3), active-market cancellation | Public inactive | No trader refund or creator-seed action |
| Approved (4) | Not public | None; normally transient |
| Active (5), before deadline | Public active | Dynamic outcome buy |
| Active (5), after deadline | Public inactive | No trader-facing resolution request |
| Trading Closed through Resolved (6–13) | Public inactive on homepage | Visible in DEC governance for DEC members, but missing from general dApp lifecycle/claims views |

Team markets are included automatically because all market IDs are loaded and an immediately activated team market satisfies the same active-state predicate. Pending proposals cannot enter active results. Rejected and no-vote-cancelled proposals remain absent from the normal public arrays and remain available in creator history.

### Marketplace cards

Implemented:

- Thumbnail with fallback.
- Category, question, origin in the dApp, all outcome labels, current prices/probabilities, volume, trading end time.
- Dynamic outcome buttons; no hard-coded YES/NO pair.
- Gross amount, fee, net amount, estimated shares, and slippage floor.

Missing or partial:

- DApp cards do not show current lifecycle status, liquidity, or participant count.
- Homepage cards do not show origin, liquidity, volume, or participant count.
- There is no market-detail route; every homepage card links generically to `/app`.
- No per-market deep link or selected-market state exists.
- The dApp’s estimate duplicates the current `quoteBuy` formula client-side instead of calling `quoteBuy`; concurrent trades can make the preview stale. `minSharesOut` provides transaction protection, but the UI does not explain a slippage revert.
- A configured `NEXT_PUBLIC_SETTLEMENT_TOKEN_ADDRESS` is trusted independently of the protocol’s immutable `settlementToken`; a mismatched environment can approve the wrong token.

### Creator dashboard

The “My Proposals” tab filters all returned markets by connected creator and shows state, question, decision reason, proposal vote totals, and original seed.

The API now exposes proposal start/deadline/finalization, activation/resolution/finalization timestamps, proposal/refund/finalization flags, creator fees earned/claimed/claimable, and seed-return state. The UI does not render those new fields.

Missing UI requirements:

- Proposal voting start, deadline, time remaining, and finalization timestamp.
- Explicit approved/rejected/tied/no-vote result presentation.
- Automatic refund amount and completion.
- Grouping or filtering for proposed, approved, active, closed, and resolved markets.
- Resolution status and evidence.
- Creator fees earned, claimed, and claimable.
- Creator seed locked/claimable/claimed status.
- Active-cancellation seed-return action.
- Team-market distinction in the history view.

The existing claim buttons are also too coarse: creator fee and seed buttons appear only for state `Resolved` (`app/app/page.tsx:185`), even though accrued creator fees can be claimed earlier and creator seed can also be returned after an active-market cancellation.

### DEC governance, reputation, and rewards

Proposal governance currently shows only question, resolution criteria, and approve/reject actions. It omits creator, category, thumbnail, outcomes, evidence URIs, market end, voting start/deadline/countdown, the member’s submitted vote, vote totals, and final decision.

Resolution governance currently shows question, state, snapshot, total voter count, outcome vote buttons during state 9, and a resolution-request button for state 6. It omits trading data, evidence, resolution start/deadline/countdown, the member’s vote, per-outcome counts, computed quorum, quorum progress, tie/no-quorum explanation, admin verification data, and permissionless finalize actions.

The request-resolution action is located inside the DEC-only tab. The contract also authorizes a trader or creator, so those eligible users currently have no corresponding UI action.

The DEC membership API now exposes:

- Membership/existence/removal status.
- Proposal and resolution participation totals.
- Honest and incorrect resolution-vote totals.
- Reputation and reward threshold.
- Total earned, total claimed, stored, claimable, and locked rewards.
- Explicit reward-lock status, reason, and claim eligibility.

The current Rewards component consumes only `claimableRewards` and `lockedRewards`, displays both as unformatted base-unit strings, and offers only `claimDECRewards`. There are no UI actions for `settleMyResolutionParticipation` or `accrueMyMarketReward`, so the in-app reputation/reward lifecycle is incomplete.

### Trader positions, resolution, cancellations, and claims

These established flows are absent:

- My Positions/My Votes.
- Per-outcome user share balances.
- Trader/creator resolution request after close.
- Winning payout claim and claimed-state feedback.
- Losing-position explanation.
- Active-cancellation refund calculation and claim.
- Resolved/unresolved market detail.
- Claim-order/result information.

As a result, a user can create and buy through the current interface but cannot complete the market lifecycle through the same interface.

### Team and admin workflows

No frontend action calls `createTeamMarket`, even for an authorized team-role wallet. There is also no admin interface for:

- `confirmOutcome` with reason and evidence URI.
- `cancelActiveMarket` with reason and evidence URI.
- DEC member add/suspend/remove management.
- Reviewing escalated tied/no-quorum markets.

The keeper can perform deterministic transitions, but it cannot replace these role-restricted human workflows.

### Public documentation regression

The routes respond successfully, but several documents still describe V1 functions and economics and therefore conflict with V2:

- `app/governance-forum/page.tsx` references `initializeMarket()`, rejected-proposal 10%/90% splitting, a global `decPool`, and `claimDecRewards()`.
- `app/terms-of-service/page.tsx` describes native ITL, binary YES/NO shares, a 10%/90% rejection penalty, a 5% payout-time fee, and `claimCreatorYield()`.
- `app/risk-disclosure/page.tsx` describes binary settlement, the 10%/90% rejection penalty, `buyShares()`, and `claimDecRewards()`.
- `app/whitepaper/page.tsx` describes binary YES/NO markets, `initializeMarket`, a DRAW rejection state, native ITL, and the old penalty model.
- `app/documentation/page.tsx` describes binary-only markets, `initializeMarket`, and the old rejection penalty.

These are substantive product/legal regressions, not cosmetic copy drift. They must be updated before any public or testnet release so users are not told incorrect fee, refund, trading, and governance rules.

## API and ABI review

### Confirmed

- `lib/interpredictAbi.json` contained 120 ABI entries and normalized exactly equal to `interpredict-deploy/artifacts/contracts/InterPredict.sol/InterPredict.json` at review time.
- `app/app/page.tsx`, `app/api/markets/route.ts`, `app/api/dec-membership/route.ts`, and `app/api/keeper/route.ts` import the same generated protocol ABI.
- Every protocol method referenced by those runtime files exists in the generated ABI.
- No obsolete V1 protocol call was found in current runtime frontend/API code. In particular, calls such as `markets`, `isDecMember`, `initializeMarket`, `placeBet`, `resolveMarket`, and `claimDecRewards` are gone.
- Market struct decoding uses named tuple components. Remaining numeric access is limited to single unnamed Solidity outputs (`getMarket`, `getMarketOutcomes`, constants, and `totalMarkets`).
- Named `decMembers` and `decRewardsView` outputs are now consumed by name rather than fragile tuple positions.

### Narrow integration fixes made during this review

- Added one shared active/inactive lifecycle classification and used it in the API, homepage, and dApp.
- Excluded elapsed active-state records from clickable dApp trade cards.
- Included resolution states 7–12 and active-market cancellations in public inactive results.
- Kept rejected and no-vote proposal cancellations out of public trading arrays.
- Generated public category filters only from public active/inactive records, including custom `Other` labels.
- Added tolerant state/category query normalization.
- Added all lifecycle timestamps and relevant claim/refund flags already present in the market struct to the API projection.
- Added creator fee claimed/claimable, DEC reward-per-voter, remaining payout, and winning-share data.
- Added resolution quorum computed with the contract’s own `BPS` and `RESOLUTION_QUORUM_BPS` constants.
- Expanded DEC membership/reward output with reputation, threshold, participation, earnings, lock reason, and claim eligibility.
- Corrected the keeper's final transition from numeric state 12 to
  `OutcomeConfirmed` state 11; the contract moves directly from 11 to
  `Resolved` state 13, so state 12 is never a callable finalization source.

### Remaining API/indexing gaps

| Required data/path | Status |
| --- | --- |
| Market list, active, inactive, proposals, creator filter | Available through `/api/markets` |
| Team markets | Included automatically and identified by `origin`; no dedicated origin query |
| Market detail | No dedicated route; the list response carries broad detail for every market |
| Participant count and trade count | Not projected even though public contract getters exist |
| Resolution requester | Not stored in the `Market` struct; available only by indexing `ResolutionRequested` events |
| Per-outcome resolution vote counts | Not projected |
| Member’s proposal/resolution vote | Not projected |
| User positions/shares/contributions | No API path |
| Winner claim status/amount | No address-aware API path |
| Cancellation-refund entitlement/status | No address-aware API path |
| DEC reward accrual-per-market status | No API path |
| Creator claim data | Core market-level values now projected; no dedicated claim endpoint |
| Admin/DEC member directory | No API path for the member list or management dashboard |
| Pagination/indexing scalability | Missing; the route sends three RPC requests per market concurrently and fails the whole response if any one market read fails |
| ABI generation guard | No checked-in generation/check script was found; the current JSON matches, but future contract changes can drift silently |

The API retains a ten-second in-memory cache only for the unfiltered list. This is acceptable for display freshness, but the UI should reread address-specific claim/position state after writes.

## Static functional and safety findings

1. **Lifecycle completion is inaccessible.** There is no payout, cancellation-refund, creator active-cancellation seed, admin confirmation, or general-user resolution flow.
2. **Wallet state can become incorrect.** Account/chain changes are not observed, no chain is verified, and there is no disconnect/session restoration.
3. **Critical errors are hidden.** Trade and creation handlers swallow rejected transactions; the homepage converts API failure into an empty market set.
4. **Navigation has dead anchors.** `#architecture` and `#ecosystem` do not exist on the V2 homepage, and homepage anchors are reused on `/app`.
5. **Reward display is misleading.** Raw token base units are labeled as rewards without token-decimal formatting, and newly exposed reputation/lock details are unused.
6. **Slippage input can crash rendering.** It is a free-form text input and an invalid value reaches `BigInt(Math.max(...NaN))`.
7. **Configuration can approve the wrong asset.** The token address is not verified against `settlementToken()` on the configured protocol.
8. **No frontend/API tests exist for state placement.** The corrected helper logic type-checks, but active/inactive/creator-only placement should receive unit tests.

## Browser regression checklist still required

Run this matrix after a local V2 fixture provides markets in every relevant lifecycle state. Capture screenshots or record explicit pass/fail notes; do not use empty data as proof.

### Desktop

- Widths: 1440×900 and 1024×768.
- Routes: `/`, `/app`, `/whitepaper`, `/documentation`, `/governance-forum`, terms, privacy, and risk.
- Verify navbar targets, sticky header overlap, hero/market spacing, theme toggle, language switch, footer/legal navigation, category overflow, empty/loading/error states, image fallback, and long 2/3/4-outcome labels.
- Verify connected community creator, trader, active DEC member, suspended/low-reputation DEC member, team-role wallet, and admin wallet.

### Mobile

- Widths: 390×844 and 360×800.
- Verify mobile menu accessible name/focus/close behavior, no horizontal overflow, tab discovery, form keyboard/input behavior, outcome controls, status/error visibility, card metrics, and transaction buttons.

### Lifecycle fixtures

- Community proposal: pending, approved, rejected, tied rejection, and no-vote cancellation.
- Team market: active immediately.
- Active market before and after its end time without keeper synchronization.
- Trading closed, DEC resolution voting, tie/no-quorum admin verification, outcome confirmed, and resolved.
- Active-market cancellation with trader refund and creator seed outstanding/claimed.
- Winning, losing, and already-claimed trader positions.
- DEC rewards: eligible for future accrual, below threshold with previously
  vested rewards still claimable, suspended/removed with vested rewards still
  claimable, permissionlessly settled, and already claimed.

## Approval recommendation

Do not approve the V2 frontend as complete. The API/ABI integration is now more consistent and exposes substantially more protocol state, but the established interface and required lifecycle workflows must be restored on top of the V2 calls, followed by real desktop/mobile browser inspection and stateful integration tests.

## Final hardening integration delta

The restoration after the baseline audit now provides, in the shared
`Web3Context` and protocol panels:

- persistent connection intent, connect/disconnect controls, expected-chain
  enforcement, account/chain event listeners, wallet refresh, transaction
  status/error feedback, and wallet-scoped activity;
- dynamic two-to-four-outcome creation and trading, community/team creation,
  token approval, contract quotes, slippage controls, and permanent URI input;
- public active/inactive discovery, creator history, wallet positions, payout,
  cancellation refund, creator-fee and creator-seed actions;
- trader/creator/DEC resolution requests, permissionless proposal/resolution
  and market finalization, DEC vote settlement/rewards, admin evidence
  confirmation, cancellation, and pause controls;
- responsive application shell, established branding/navigation/footer,
  refresh controls, and expanded translation keys.

The shared decoder now handles the linked-reader ABI:
`getMarket`, `getMarketOutcomes`, and `getMarketPricing` return canonical
encoded bytes. The tuple schema is centralized in
`lib/interpredictProtocol.ts`, and artifact tooling compares it against the
compiled storage layout.

The market API now:

- uses newest-first bounded pages by default, an opaque offset cursor,
  `order=asc|desc`, and exact `id=<marketId>` lookup;
- bounds concurrency, cache size, RPC duration, and page size;
- returns partial-read failure telemetry instead of dropping an otherwise valid
  page;
- uses latest chain-block time for deadline classification;
- exposes protocol/market pause state, resolution epoch/quorum/admin deadline,
  participant/trade counts, and on-chain settlement-token metadata.

The keeper now has bounded time/RPC/transaction work and a rotating DEC-member
settlement cursor. Later voters cannot be permanently starved by a fixed prefix
of non-voters, settled voters, or repeatedly reverting transactions. Its
module-local overlap flag remains process-local; production requires a single
logical scheduler with a distributed lease or nonce-coordination policy.

Reward presentation must use the final V2 rule: reputation or membership can
make an address ineligible for **future** accrual, but never locks an already
vested `storedRewards` balance. The obsolete `accrueMyMarketReward` workflow is
not part of the final ABI; permissionless
`settleResolutionParticipation(marketId, voter)` performs once-only reward and
reputation settlement.

The whitepaper, user documentation, governance page, terms, privacy notice, and
risk disclosure were rewritten for ERC-20 V2, multi-outcome markets, a
trade-time 50-basis-point fee, full ten-token proposal-seed refunds, epoch
snapshot/quorum, evidence-backed admin escalation/timeout, per-market DEC funds,
and `claimDECRewards`.

### Verification still required

Static restoration does not close the browser portion of this review. Before
release, execute the desktop/mobile and lifecycle-fixture matrix above against a
local or staging V2 deployment. Confirm focus order, responsive overflow,
wallet/account/chain changes, translated long strings, transaction failures,
real RPC pagination, event-history chunking from
`NEXT_PUBLIC_CONTRACT_DEPLOYMENT_BLOCK`, and every role-specific action. Record
screenshots or explicit pass/fail evidence.
