# InterPredict Complete Protocol Upgrade Specification

Work directly on the current InterPredict repository: https://github.com/Blocklesschain/interpredict

Before modifying any file, inspect the complete repository architecture, including:

* Smart contracts
* Existing contract storage and state transitions
* Frontend application
* Homepage
* dApp Marketplace
* API routes
* Keeper or automation routes
* Contract ABIs
* Deployment scripts
* Tests
* Environment-variable usage
* Wallet connection
* Role-management logic
* Git status
* Current branch
* Existing uncommitted changes

Create a new feature branch for this implementation.

Do not delete, overwrite, expose, print, log, or commit:

* `.env`
* `.env.local`
* Private keys
* RPC credentials
* API keys
* Deployment credentials
* Wallet secrets
* Ignored local configuration
* Existing unrelated user changes

Before editing, document any architectural conflict that could affect:

* Smart-contract security
* Economic solvency
* Backward compatibility
* Existing deployed markets
* Governance logic
* Deployment
* User funds

Resolve ordinary implementation details independently, but do not silently make unsafe economic or security assumptions.

---

# 1. Protocol Objectives

Implement the following systems as one integrated protocol upgrade:

1. Community and team market creation
2. DEC market-proposal governance
3. Multi-outcome market pricing
4. Creator seed liquidity
5. Immediate trading-fee distribution
6. DEC reputation and reward eligibility
7. DEC-based market resolution
8. Winner payouts
9. Creator fee and seed accounting
10. Unique market thumbnails
11. Market categories
12. Contract-driven dApp Marketplace
13. Contract-driven homepage Explore Markets
14. Creator proposal history
15. DEC governance dashboards
16. Complete API, ABI, keeper, deployment, and test updates

---

# 2. Market Origins

Support two market origins:

```solidity
enum MarketOrigin {
    Community,
    Team
}
```

## 2.1 Community Market

A community market is submitted by a regular user.

A community market must:

* Enter DEC proposal review
* Remain untradable during review
* Be approved or rejected based on DEC votes
* Follow the fixed 24-hour proposal-voting window
* Become active only after approval

## 2.2 Team Market

A team market is created by an authorized InterPredict team account.

A team market must:

1. Validate all market parameters.
2. Bypass DEC proposal review.
3. Be approved automatically.
4. Allocate its seed liquidity immediately.
5. Become active immediately.
6. Appear automatically in the dApp Marketplace.
7. Appear automatically in homepage Active Trades.
8. Emit team-market creation and activation events.

A team market must not enter:

* Proposed
* DEC Proposal Review
* Proposal Rejected
* Proposal Cancelled because of no DEC votes

Only authorized team addresses may create team markets.

A regular creator must never be able to classify their market as a team market.

Use role-based access control, preferably:

```solidity
bytes32 public constant TEAM_MARKET_ROLE =
    keccak256("TEAM_MARKET_ROLE");
```

---

# 3. Market Categories

Each market must have exactly one category.

Supported categories should include:

* Sports
* Politics
* Crypto
* Blockchain
* Technology
* Artificial Intelligence
* Economics
* Finance
* Business
* Science
* Climate
* Entertainment
* Culture
* Health
* Real Estate
* Gaming
* Web3
* Other

Prefer a controlled enum or validated category identifier.

Example:

```solidity
enum MarketCategory {
    Sports,
    Politics,
    Crypto,
    Blockchain,
    Technology,
    ArtificialIntelligence,
    Economics,
    Finance,
    Business,
    Science,
    Climate,
    Entertainment,
    Culture,
    Health,
    RealEstate,
    Gaming,
    Web3,
    Other
}
```

If `Other` is selected:

* Allow an optional custom category label.
* Validate its maximum byte length.
* Prevent an empty custom label when `Other` requires one.

Category information must be available through:

* Contract market data
* Market events
* APIs
* Marketplace cards
* Homepage cards
* Market details
* Creator dashboard
* DEC proposal review

---

# 4. Market Thumbnails

Every market must have its own thumbnail or logo URI.

Store the permanent URI at the contract level.

Supported URI formats should include:

* HTTPS
* IPFS
* Arweave

Do not store raw image binary data on-chain.

Validate:

* URI is not empty.
* URI stays within a reasonable byte-length limit.
* Unsupported or malformed values are rejected where practical.
* The frontend shows a default InterPredict placeholder when the image fails.

The market creation workflow should be:

```text
Creator selects image
        ↓
Frontend previews image locally
        ↓
Frontend uploads image to configured storage
        ↓
Storage provider returns permanent URI
        ↓
Permanent URI is submitted to the contract
```

If no upload provider exists:

* Implement the URI input and contract storage correctly.
* Keep local image preview separate.
* Document that permanent upload integration is still required.
* Do not treat a browser object URL as permanent storage.

---

# 5. Market Outcomes

Support between two and four outcomes.

Validate:

* Minimum of two outcomes
* Maximum of four outcomes
* No empty outcome labels
* No duplicate outcome labels
* Reasonable maximum label length
* Valid UTF-8 or byte-length handling
* Outcome list cannot change after proposal submission
* Outcome list cannot change after trading starts
* Outcome indexes remain stable throughout the market lifecycle

Examples:

```text
Yes / No
```

```text
Candidate A / Candidate B / Candidate C
```

```text
Bitcoin / Ethereum / Solana / Other
```

Do not hard-code YES and NO in:

* Smart contracts
* APIs
* Marketplace
* Homepage
* Trading interface
* Resolution interface
* Tests
* Analytics
* User positions

---

# 6. Market Metadata

Every submitted market must include:

* Market question
* Market description, if supported
* Category
* Optional custom category label
* Thumbnail URI
* Two to four outcome labels
* Trading end date and exact time
* Resolution criteria
* Primary evidence-source URI
* Optional backup evidence-source URI
* Market origin
* Creator address

Validate:

* Question is not empty
* Trading end time is in the future
* Resolution criteria are not empty
* Metadata fields remain within safe byte limits
* Outcome labels are valid
* Thumbnail URI is valid
* Category is valid

Metadata that affects settlement must become immutable after submission.

---

# 7. Community Market Creation Economics

A community creator pays:

```text
11 tITL
```

Distribution:

```text
1 tITL  → Protocol treasury
10 tITL → Proposal seed deposit
```

The 1 tITL amount is:

* A market-proposal fee
* Sent to or accounted for the treasury
* Non-refundable after successful proposal submission

The 10 tITL amount is:

* Associated with the proposal
* Held by the protocol during DEC review
* Not tradable before approval
* Converted into locked seed liquidity after approval
* Automatically refunded if the proposal is rejected
* Automatically refunded if the proposal receives no DEC votes within 24 hours
* Automatically refunded if the proposal is cancelled before activation under an allowed proposal-cancellation condition

Use:

* SafeERC20
* Allowance checks
* Balance checks
* Token-decimal-safe constants
* Checks-effects-interactions
* Reentrancy protection where transfers occur

Do not assume 18 decimals without verifying the existing tITL token.

---

# 8. Team Market Creation Economics

Inspect the existing project requirements and determine how team-market seed liquidity is funded.

A team market must have adequate seed liquidity before activation.

Implement one clearly documented approach:

1. Team creator provides the required seed amount during creation, or
2. An authorized protocol liquidity wallet provides it, or
3. Protocol-owned liquidity accounting provides it.

Do not activate a team market without sufficient backing.

Team markets bypass DEC proposal voting but must still pass all technical validation.

---

# 9. Proposal State Model

Use an explicit proposal and market lifecycle.

Recommended unified state model:

```solidity
enum MarketState {
    Proposed,
    DECProposalVoting,
    Rejected,
    Cancelled,
    Approved,
    Active,
    TradingClosed,
    Unresolved,
    ResolutionRequested,
    DECResolutionVoting,
    AdminVerification,
    OutcomeConfirmed,
    Finalized,
    Resolved
}
```

Avoid contradictory states.

Every transition must:

* Validate the current state
* Validate caller permissions
* Validate deadlines
* Prevent duplicate transitions
* Record timestamps
* Emit an event
* Preserve accounting invariants

If separate proposal and trading states produce cleaner architecture, use them, but ensure APIs expose one coherent user-facing state.

---

# 10. Community Proposal Voting Window

Every community proposal has a fixed DEC voting window of:

```text
24 hours
```

The voting window begins immediately when the proposal enters DEC proposal voting.

Store:

* Voting start timestamp
* Voting deadline
* Approval vote count
* Rejection vote count
* Total votes
* Vote record per DEC member
* Whether proposal voting has been finalized
* Final proposal decision
* Finalization timestamp
* Decision reason

Calculate the deadline on-chain:

```solidity
proposalVotingDeadline =
    proposalVotingStartedAt + 24 hours;
```

DEC voting is valid only while:

```solidity
block.timestamp < proposalVotingDeadline
```

Voting at or after the deadline must revert.

---

# 11. DEC Proposal Votes

Active DEC members may vote:

```text
Approve
Reject
```

Prevent:

* Unauthorized voting
* Suspended DEC-member voting
* Duplicate voting
* Voting after the deadline
* Voting after proposal finalization
* Voting on team markets
* Voting on nonexistent proposals

Each DEC member gets one proposal vote.

Store market-specific vote records.

Example:

```solidity
enum ProposalVote {
    None,
    Approve,
    Reject
}
```

Emit an event for every valid vote.

---

# 12. Proposal Finalization After 24 Hours

When the 24-hour voting deadline passes, the proposal must be closed according to the recorded DEC votes.

Important smart-contract limitation:

A contract cannot execute a transaction by itself merely because time passed.

Therefore, implement:

* On-chain timestamp enforcement
* A permissionless proposal-finalization function
* Keeper compatibility
* Automatic frontend/API recognition that voting has ended
* No dependency on one privileged operator

Example:

```solidity
function finalizeProposalVoting(
    uint256 marketId
) external;
```

Requirements:

```solidity
block.timestamp >= proposalVotingDeadline;
```

The function may be called by:

* Any wallet
* The creator
* An active DEC member
* A keeper
* An admin

The result must be determined entirely by the stored votes and rules, not by the caller.

The frontend and APIs should treat an expired proposal as awaiting execution of its deterministic final result.

A keeper may call the function automatically, but failure of the keeper must not allow more voting after the deadline.

---

# 13. Proposal Voting Outcomes

## 13.1 More Approval Votes

If:

```text
Approval votes > Rejection votes
```

Then:

1. Mark the proposal approved.
2. Convert the 10 tITL proposal seed into locked market seed liquidity.
3. Split the seed across all outcomes.
4. Activate the market.
5. Record activation time.
6. Display it automatically in the Marketplace.
7. Display it in homepage Active Trades.
8. Emit proposal-approved and market-activated events.

The market must not activate if its configured trading end time has already passed.

## 13.2 More Rejection Votes

If:

```text
Rejection votes > Approval votes
```

Then:

1. Mark the proposal rejected.
2. Prevent trading permanently.
3. Automatically transfer 10 tITL back to the creator.
4. Keep the 1 tITL proposal fee in the treasury.
5. Record refund completion.
6. Prevent duplicate refunds.
7. Record rejection timestamp.
8. Record a rejection reason code.
9. Emit rejection and automatic-refund events.
10. Display it in the creator’s proposal history.
11. Exclude it from Active Trades.

## 13.3 Equal Votes With At Least One Vote

If:

```text
Approval votes == Rejection votes
Total votes > 0
```

Treat the proposal as rejected for V1.

Then:

1. Mark it rejected.
2. Use a `TiedDECProposalVote` reason code.
3. Automatically refund 10 tITL.
4. Keep the 1 tITL proposal fee.
5. Do not activate the market.
6. Emit tie, rejection, and refund events.

## 13.4 No Votes Recorded

If:

```text
Total votes == 0
```

Then:

1. Mark the proposal cancelled.
2. Use a `NoDECVotes` cancellation reason.
3. Automatically transfer 10 tITL back to the creator.
4. Keep the 1 tITL proposal fee in the treasury.
5. Do not penalize the creator.
6. Do not activate the market.
7. Record cancellation and refund timestamps.
8. Emit proposal-cancelled and automatic-refund events.
9. Display the cancellation reason in creator history.

Frontend wording:

```text
Proposal cancelled

No DEC votes were recorded during the 24-hour voting period.

10 tITL was automatically refunded.

The 1 tITL proposal fee was non-refundable.
```

---

# 14. Automatic Proposal Refunds

Rejected or no-vote-cancelled proposals must be refunded automatically through token transfer.

The creator must not call a separate claim function.

Recommended order:

```text
Validate finalization
        ↓
Determine result
        ↓
Update proposal state
        ↓
Mark refund completed
        ↓
Update liability accounting
        ↓
Transfer 10 tITL to creator
        ↓
Emit refund event
```

If the token transfer fails:

* Revert the complete finalization transaction.
* Do not leave the proposal in a rejected or cancelled state without refund.
* Allow finalization to be retried after the transfer issue is resolved.

Protect against:

* Reentrancy
* Duplicate finalization
* Duplicate refund
* Wrong recipient
* Wrong refund amount
* Refund of approved markets
* Refund of team markets through this path

Store:

* Refund amount
* Refund recipient
* Refund completion status
* Refund timestamp

---

# 15. Approved Seed Liquidity

After community proposal approval, the 10 tITL deposit becomes locked creator seed liquidity.

Split it equally across all outcomes.

Examples:

For two outcomes:

```text
5 tITL per outcome
```

For four outcomes:

```text
2.5 tITL per outcome
```

For three outcomes, handle integer division safely.

The total allocated seed must equal exactly 10 tITL at token precision.

Use deterministic remainder handling.

Recommended approach:

1. Calculate the base allocation.
2. Allocate the base amount to every outcome.
3. Assign the division remainder to outcome index zero.

Test:

```text
sum(outcome seed balances) == 10 tITL
```

Store the original creator seed separately from user trading funds and protocol fees.

Seed liquidity remains locked through:

* Active trading
* Trading closure
* Resolution request
* DEC resolution voting
* Admin verification
* Outcome confirmation
* Finalization

It cannot be withdrawn early.

---

# 16. Pricing Engine

Implement dynamic pricing for all two-to-four-outcome markets.

The pricing model must clearly define:

* How shares are minted or accounted for
* How an outcome price is calculated
* How a purchase changes all outcome prices
* How liquidity affects price impact
* How the fee is deducted
* How rounding is handled
* How slippage protection works
* How payout liabilities remain solvent

The pricing system must:

* Keep outcome prices within valid bounds
* Produce coherent implied probabilities
* Prevent zero-liquidity calculations
* Prevent overflow and underflow
* Prevent stale quote exploitation
* Support two, three, and four outcomes
* Preserve protocol solvency

Document the exact mathematical formula in the repository.

Do not label a simple pool-ratio display as a complete AMM unless it safely governs executable trades.

---

# 17. Trading Function

Recommended interface:

```solidity
function buyOutcome(
    uint256 marketId,
    uint8 outcomeIndex,
    uint256 grossAmount,
    uint256 minSharesOut
) external;
```

Validate:

* Market exists
* Market is Active
* Current time is before trading end time
* Market is not paused
* Outcome index is valid
* Gross amount is above minimum trade size
* Gross amount is nonzero
* User balance is sufficient
* Allowance is sufficient
* Shares received meet `minSharesOut`

Store:

* User shares per market and outcome
* User market participation
* Trade count
* Cumulative volume
* Market volume
* Participant count
* Pool balances
* Fees
* Creator earnings
* DEC fee allocation

After a user’s first successful trade:

```solidity
hasTradedInMarket[marketId][user] = true;
```

Emit a detailed trade event.

---

# 18. Trading Fee

Charge:

```text
0.5% per trade
```

Use:

```text
50 basis points
```

Preferred calculation:

```text
Gross trade amount
        ↓
Deduct 0.5% fee
        ↓
Use net amount for pricing and shares
```

Do not charge a settlement fee.

The frontend must display:

* Gross amount
* Trading fee
* Net trading amount
* Estimated shares
* Current price
* Estimated post-trade price
* Price impact
* Minimum shares received
* Slippage tolerance

---

# 19. Community Market Fee Distribution

For community markets:

```text
0.2% → Treasury
0.2% → DEC reward pool
0.1% → Creator
```

Basis points:

```text
20 bps → Treasury
20 bps → DEC
10 bps → Creator
```

The allocation must equal exactly 50 basis points before rounding.

Track creator earnings per market.

Track DEC reward funds separately.

Handle rounding deterministically.

Do not leave unexplained token dust.

---

# 20. Team Market Fee Distribution

For team markets:

```text
0.3% → Treasury
0.2% → DEC reward pool
```

Basis points:

```text
30 bps → Treasury
20 bps → DEC
```

No creator trading-fee share is paid for a team market.

A normal user must not access the team-market fee path.

---

# 21. Creator Fee Claims

Track:

* Creator fees earned per market
* Creator fees claimed
* Creator fees currently claimable

Support:

```solidity
function claimCreatorFees(
    uint256 marketId
) external;
```

Only the community market creator may claim.

Prevent:

* Claims from team markets
* Claims by another address
* Double claims
* Reentrancy
* Overpayment
* Cross-market accounting errors

---

# 22. DEC Committee Membership

Support:

* Add DEC member
* Remove DEC member
* Activate DEC member
* Suspend DEC member
* Check active membership
* Preserve historical vote records
* Prevent inactive members from new votes
* Emit membership events

Use role-based access control.

Avoid unbounded loops over every historical DEC member.

---

# 23. DEC Constitutional Responsibilities

The DEC Committee has two primary governance responsibilities.

## 23.1 Market Creation Governance

DEC members:

* Review community proposals
* Approve legitimate markets
* Reject invalid markets
* Protect market clarity
* Prevent spam
* Check outcome quality
* Check evidence sources
* Check resolution criteria
* Check category and thumbnail
* Identify duplicates or manipulation

## 23.2 Market Resolution Governance

DEC members:

* Review official evidence
* Vote on the winning outcome
* Participate within the three-hour deadline
* Build or lose reputation based on alignment with the confirmed outcome

---

# 24. DEC Reputation

Track for each DEC member:

* Active status
* Proposal votes
* Resolution votes
* Total participation
* Honest resolution votes
* Incorrect resolution votes
* Current reputation
* Minimum reputation
* Maximum reputation
* Reward threshold
* Total rewards earned
* Total rewards claimed
* Stored unclaimed rewards
* Currently claimable rewards
* Temporarily locked rewards
* Reward eligibility

Define and document:

* Initial reputation
* Reputation increase
* Reputation decrease
* Minimum score
* Maximum score
* Eligibility threshold

Prevent reputation underflow and overflow.

Proposal approval or rejection votes should not automatically be classified as honest or dishonest unless the protocol defines an objective later evaluation process.

Resolution votes are classified after outcome confirmation.

---

# 25. DEC Reward Eligibility

A DEC member may accrue and claim rewards only while their reputation is at or above the configured threshold.

When reputation falls below the threshold:

1. New rewards stop accruing to that member.
2. Previously earned but unclaimed rewards remain recorded.
3. Previously earned but unclaimed rewards become temporarily unclaimable.
4. Reward claims must revert.
5. The rewards are not deleted.
6. The rewards are not forfeited.
7. The rewards are not redistributed.
8. The frontend displays the locked amount and suspension reason.

When reputation returns to or exceeds the threshold:

1. Previously earned rewards become claimable again.
2. New rewards begin accruing again.
3. No duplicate rewards are created.
4. No retroactive rewards are added for the suspension period unless separately designed.

The claim function must enforce current eligibility:

```solidity
require(
    decMember.reputation >= decRewardThreshold,
    "DEC reputation below reward threshold"
);
```

Frontend values:

```text
Total rewards earned
Claimable rewards
Temporarily locked rewards
Current reputation
Required reward threshold
```

---

# 26. DEC Reward Accounting

The DEC reward pool receives 0.2% of every trade.

Do not loop through all DEC members on each trade.

Use a scalable approach such as:

* Global reward-per-eligible-participation accumulator
* Epoch-based distribution
* Market governance participation credits
* Claim-time accounting

Document exactly:

* Who earns each market’s DEC rewards
* Whether rewards are based on proposal participation, resolution participation, or both
* When rewards become earned
* How eligibility is checked
* How suspension affects accrual
* How recovered members resume accrual
* How rounding is handled

Avoid an unbounded iteration over every DEC member.

---

# 27. Trading Closure

Trading must become invalid when:

```solidity
block.timestamp >= marketEndTime
```

This must be enforced directly in the trading function.

The protocol must not rely on a keeper transaction to prevent late trades.

A permissionless or keeper-compatible state-sync function may change the stored state to `TradingClosed`.

Even before synchronization, late trades must revert based on timestamp.

---

# 28. Eligible Resolution Requesters

After trading closes, only these addresses may request market resolution:

1. A trader in that market
2. The market creator
3. An active DEC member

A trader must have verifiable participation.

Recommended mapping:

```solidity
mapping(uint256 => mapping(address => bool))
    public hasTradedInMarket;
```

Eligibility:

```solidity
bool isTrader =
    hasTradedInMarket[marketId][msg.sender];

bool isCreator =
    markets[marketId].creator == msg.sender;

bool isActiveDEC =
    hasRole(DEC_ROLE, msg.sender) &&
    decMembers[msg.sender].active;

require(
    isTrader || isCreator || isActiveDEC,
    "Not eligible to request resolution"
);
```

Reject requests from:

* Nonparticipants
* Inactive DEC members
* Unrelated wallets
* Rejected markets
* Cancelled markets
* Active markets
* Already resolving markets
* Finalized markets
* Resolved markets

---

# 29. Resolution Request

Implement:

```solidity
function requestResolution(
    uint256 marketId
) external;
```

Requirements:

* Market exists
* Market was activated
* Trading deadline has passed
* Caller is eligible
* Resolution has not already been requested
* Market is not cancelled
* Market is not rejected
* Market is not finalized

After a valid request:

1. Record requester.
2. Record request timestamp.
3. Open DEC resolution voting.
4. Record resolution-voting start time.
5. Set resolution-voting deadline to three hours later.
6. Snapshot active eligible DEC membership.
7. Snapshot quorum requirement.
8. Move state to `DECResolutionVoting`.
9. Emit a resolution-requested event.

---

# 30. Resolution Voting Deadline

The DEC market-resolution voting window is:

```text
3 hours
```

Calculate on-chain:

```solidity
resolutionVotingDeadline =
    resolutionVotingStartedAt + 3 hours;
```

Resolution voting is valid only while:

```solidity
block.timestamp < resolutionVotingDeadline
```

Voting at or after the deadline must revert.

Store:

* Resolution voting start
* Resolution voting deadline
* Active eligible DEC snapshot count
* Quorum snapshot
* Outcome vote counts
* Total valid votes
* Voter records
* Voting-round status
* Finalization status

---

# 31. DEC Snapshot for Resolution Quorum

Quorum must be based on active eligible DEC members at the moment resolution voting begins.

When `requestResolution()` succeeds:

1. Determine the number of active eligible DEC members.
2. Store that number as the snapshot.
3. Calculate and store the quorum requirement.
4. Prevent later membership changes from changing that market’s quorum.

Example:

```solidity
market.activeDECSnapshot =
    currentActiveDECCount;

market.resolutionQuorum =
    calculateQuorum(currentActiveDECCount);
```

Adding, removing, activating, or suspending DEC members after the snapshot must not alter that market’s quorum requirement.

Document the quorum formula.

Use configurable basis points or percentage with safe bounds.

Example:

```text
Quorum percentage × active eligible DEC snapshot
```

Use safe upward rounding if partial members would otherwise lower quorum incorrectly.

---

# 32. DEC Resolution Voting

Only active DEC members eligible under the resolution-voting rules may vote.

Each DEC member may vote once.

The vote must select a valid outcome index.

Prevent:

* Unauthorized voting
* Duplicate voting
* Invalid outcome voting
* Voting after deadline
* Voting before resolution starts
* Voting after round finalization
* Voting on cancelled or rejected markets

Track:

* Vote count per outcome
* Total valid votes
* Individual member vote
* Participation
* Timestamp if needed

Emit an event for every vote.

---

# 33. Resolution Voting Finalization

After the three-hour deadline, provide a permissionless function:

```solidity
function finalizeResolutionVoting(
    uint256 marketId
) external;
```

Requirements:

```solidity
block.timestamp >= resolutionVotingDeadline;
```

The protocol must determine:

1. Whether quorum was reached
2. Which outcome received the highest valid vote count
3. Whether the leading result is tied
4. Whether escalation is required

A keeper may call this function, but the result must not depend on the keeper’s discretion.

The frontend and APIs should automatically show that voting has ended when the timestamp passes.

---

# 34. Resolution Quorum

Quorum is reached when:

```text
Total valid resolution votes
        ≥
Stored resolution quorum
```

Quorum must use the active eligible DEC snapshot taken when resolution voting began.

If quorum is not reached:

1. Do not select an outcome automatically.
2. Move the market to `AdminVerification`.
3. Mark the DEC result as `NoQuorum`.
4. Emit a no-quorum event.
5. Require documented escalation.
6. Do not finalize winner payouts yet.

The admin may:

* Open a controlled second DEC vote
* Confirm an outcome using documented evidence under emergency governance
* Cancel the market if it cannot be resolved

Every action must emit an event and include a reason or evidence reference.

---

# 35. Winning Resolution Outcome

After quorum is reached, the winning outcome is:

```text
The valid outcome with the highest DEC vote count
```

Requirements:

* Quorum must first be reached.
* The outcome index must be valid.
* There must be one uniquely highest result.
* A tied highest result must not be automatically selected.

Example:

```text
Outcome A: 7 votes
Outcome B: 4 votes
Outcome C: 2 votes

Outcome A is the DEC-selected result.
```

After a unique winning outcome is found:

1. Store the DEC-selected outcome.
2. Store the DEC vote totals.
3. Move the market to `AdminVerification`.
4. Emit a DEC-resolution-result event.

---

# 36. Tied Resolution Result

If two or more outcomes share the highest vote count after quorum:

1. Do not select an outcome arbitrarily.
2. Move the market to `AdminVerification`.
3. Mark the result as `Tie`.
4. Emit a resolution-tie event.
5. Require documented escalation.

The admin may:

* Open a controlled second DEC voting round
* Confirm the objectively verifiable result with evidence
* Cancel the market if no valid result can be determined

Do not silently choose the lowest or first outcome index.

---

# 37. Admin Verification

The admin or verifier reviews the DEC result and evidence.

The verifier may:

* Confirm the uniquely winning DEC outcome
* Reject a manipulated or invalid DEC result
* Handle no-quorum escalation
* Handle tied-result escalation
* Open an authorized second voting round
* Cancel an unresolvable market

The admin must not:

* Change a finalized outcome
* Silently override DEC
* Confirm an invalid outcome index
* Withdraw user funds
* Resolve an active market
* Bypass evidence requirements without an event

Every verification action must include:

* Reason code
* Evidence URI or evidence hash
* Timestamp
* Authorized caller
* Event

---

# 38. Outcome Confirmation

After verification:

1. Store the confirmed outcome index.
2. Validate that it exists.
3. Make it immutable after confirmation, except through an explicitly documented emergency process before finalization.
4. Record confirmation timestamp.
5. Record evidence URI or hash.
6. Move the state to `OutcomeConfirmed`.
7. Begin DEC vote-correctness processing.
8. Emit outcome-confirmed event.

---

# 39. Honest and Incorrect DEC Votes

After the outcome is confirmed:

If a DEC member selected the confirmed outcome:

```text
Honest resolution vote
```

Otherwise:

```text
Incorrect resolution vote
```

Update:

* Honest vote count
* Incorrect vote count
* Reputation
* Reward eligibility

Do not process the same vote twice.

Avoid unbounded loops that can make finalization impossible.

Use a scalable design such as:

* Batched vote processing
* Market-specific bounded voter list
* Claim-time processing
* Per-voter processing function

Document the selected approach.

---

# 40. Finalization

Finalization must:

1. Require a confirmed valid outcome.
2. Prevent duplicate finalization.
3. Lock the result permanently.
4. Activate winner claims.
5. Disable losing claims.
6. Finalize creator-seed accounting.
7. Preserve creator-fee accounting.
8. Finalize or enable DEC vote processing.
9. Record finalization timestamp.
10. Emit finalization event.
11. Move the market to `Finalized` or `Resolved`.

If `Finalized` and `Resolved` are functionally identical, simplify the internal state architecture while preserving the user-facing lifecycle.

---

# 41. Winner Claims

Implement:

```solidity
function claimWinnings(
    uint256 marketId
) external;
```

Requirements:

* Market is finalized
* Caller owns winning shares
* Caller has not already claimed those shares
* Payout calculation is correct
* Contract remains solvent
* Losing shares cannot claim
* Reentrancy is prevented
* State updates happen before token transfer
* Event is emitted

Track:

* Winning shares
* Payout entitlement
* Payout claimed
* Payout timestamp

Frontend:

* Winning position
* Claimable payout
* Claimed payout
* Claim button
* Transaction status

---

# 42. Losing Outcomes

Users holding losing outcome shares receive no payout.

The frontend must show:

```text
Outcome lost
No payout available
```

Do not:

* Delete historical positions
* Allow losing-share claims
* Hide past trades
* Alter outcome labels after resolution

---

# 43. Creator Seed Return After Finalization

The agreed protocol rule is that the creator’s locked seed becomes returnable after valid market finalization.

Implement only if the pricing model remains mathematically solvent.

Support:

```solidity
function claimCreatorSeed(
    uint256 marketId
) external;
```

Requirements:

* Caller is market creator
* Market is finalized
* Seed has not already been claimed
* Seed liability is covered
* Reentrancy protection
* Checks-effects-interactions
* Event emitted

Before implementing guaranteed return of the original seed, prove:

```text
Contract assets
    ≥
Winner payout liabilities
+ Creator seed liabilities
+ Creator fee liabilities
+ DEC reward liabilities
+ Treasury liabilities
+ Refund liabilities
```

If the selected pricing model cannot guarantee the full seed return while also covering winner payouts, stop and report the economic conflict.

Add invariant tests.

---

# 44. Market Cancellation

Support cancellation only for defined conditions:

* Event becomes impossible to resolve
* Evidence sources permanently fail
* Event is permanently abandoned
* Market wording is fundamentally invalid
* Governance deadlock cannot be resolved
* Security emergency

Cancellation must define:

* Trader refund calculation
* Creator seed treatment
* Fee treatment
* DEC reward treatment
* Creator trading-fee treatment
* Double-refund prevention

The 1 tITL proposal fee remains non-refundable for community proposals unless a future governance rule explicitly changes it.

Cancellation must emit:

* Reason code
* Evidence or explanation URI
* Timestamp
* Initiating role
* Refund information

---

# 45. Homepage Explore Markets

The homepage must automatically load real market data from the deployed contract through the project API or indexing system.

Remove production dependence on hard-coded demo markets.

The section must separate:

```text
Active Trades
Inactive Trades
```

## Active Trades

Include only markets that:

* Are active
* Were approved or created by team
* Have not reached trading end time
* Are not paused
* Are not rejected
* Are not cancelled
* Are not under resolution
* Are not resolved

## Inactive Trades

Include:

* Trading Closed
* Unresolved
* Resolution Requested
* DEC Resolution Voting
* Admin Verification
* Outcome Confirmed
* Finalized
* Resolved
* Cancelled active markets

Rejected proposals and no-vote-cancelled proposals should appear in creator history, not the normal public trading marketplace, unless an explicit archive section is added.

Pending proposals belong in the DEC proposal-governance section.

---

# 46. Dynamic Category Filters

Generate category filters from returned market data.

Supported category options include:

```text
All
Sports
Politics
Crypto
Blockchain
Technology
Artificial Intelligence
Economics
Finance
Business
Science
Climate
Entertainment
Culture
Health
Real Estate
Gaming
Web3
Other
```

Support:

* Active/Inactive toggle
* Category filtering
* Search by question
* Sort by newest
* Sort by ending soon
* Sort by liquidity
* Sort by trading volume where available
* Loading states
* Empty states
* API errors
* Image fallback

---

# 47. Marketplace Cards

Each market card should display:

* Thumbnail
* Image fallback
* Category
* Market question
* Market origin
* Current status
* Trading end date and exact time
* All two-to-four outcome labels
* Current outcome prices
* Implied probabilities
* Liquidity
* Volume
* Participant count where available
* Resolution state for inactive markets

Do not hard-code two trading buttons.

---

# 48. Creator Dashboard

The creator dashboard must show:

* Proposed markets
* Proposal voting start
* Proposal voting deadline
* Time remaining
* Approval votes
* Rejection votes
* Proposal result
* Approved markets
* Rejected markets
* Tied-vote rejections
* No-vote cancellations
* Rejection or cancellation reason
* Automatic refund amount
* Automatic refund completion
* Active markets
* Closed markets
* Resolution status
* Creator fees earned
* Creator fees claimed
* Creator seed status
* Creator seed claimed

The creator should understand exactly what happened to every proposal.

---

# 49. DEC Governance Interface

## Proposal Governance

Display:

* Proposal question
* Creator
* Category
* Thumbnail
* Outcomes
* Resolution criteria
* Evidence sources
* Market end time
* Voting start
* 24-hour deadline
* Time remaining
* Approve action
* Reject action
* Member’s submitted vote
* Current vote totals where allowed
* Final decision

## Resolution Governance

Display:

* Closed market
* All outcomes
* Market trading data
* Resolution criteria
* Evidence sources
* Three-hour voting start and deadline
* Time remaining
* Member’s vote
* Outcome vote counts where permitted
* Snapshot DEC count
* Quorum requirement
* Quorum progress
* Tie status
* No-quorum status
* Admin verification status

## Reputation and Rewards

Display:

* Current reputation
* Required threshold
* Reward eligibility
* Proposal participation
* Resolution participation
* Honest votes
* Incorrect votes
* Total rewards earned
* Claimable rewards
* Temporarily locked rewards
* Suspension explanation

---

# 50. API and Indexing

Update all affected API and indexing paths:

* Market list
* Market detail
* Active markets
* Inactive markets
* Community proposals
* Team markets
* DEC proposal review
* Proposal voting results
* Creator proposal history
* Resolution requests
* Resolution voting
* Quorum data
* Admin verification
* User positions
* Winner claims
* Creator fee claims
* Creator seed claims
* DEC rewards
* Reputation
* Keeper routes

API data should include:

* Market ID
* Creator
* Origin
* Category
* Custom category
* Thumbnail URI
* Outcome labels
* Outcome prices
* Market state
* Proposal voting start
* Proposal voting deadline
* Proposal votes
* Proposal decision
* Refund status
* Seed amount
* Trading end time
* Liquidity
* Volume
* Participant count
* Resolution requester
* Resolution voting start
* Three-hour resolution deadline
* Active DEC snapshot
* Resolution quorum
* Resolution votes
* DEC-selected outcome
* Confirmed outcome
* Claim data

Avoid fragile unexplained tuple indexes where generated typed ABIs or named return values can be used.

---

# 51. Keeper and Time-Based Processing

The protocol may use a keeper to call:

* Expired proposal finalization
* Trading-state synchronization
* Resolution-vote finalization
* Other eligible deterministic transitions

However:

* Deadlines must be enforced in the contract.
* Voting must stop based on timestamp.
* Trading must stop based on timestamp.
* Permissionless finalization functions must exist where safe.
* A failed keeper must not allow unauthorized late actions.
* Funds must not become permanently trapped because a keeper is offline.

---

# 52. Deployment and Migration

Treat this as a breaking contract upgrade unless the project already has a securely implemented upgradeable proxy.

Update:

* Contract constructor or initializer
* Deployment scripts
* Network configuration
* Treasury address
* Token address
* Admin roles
* DEC roles
* Team-market roles
* DEC initial reputation
* Reputation threshold
* Proposal voting duration: 24 hours
* Resolution voting duration: 3 hours
* Resolution quorum percentage
* ABI files
* Frontend contract address
* API contract address
* Keeper contract address
* Verification scripts
* `.env.example`
* Documentation

Do not overwrite private environment files.

Document:

* Redeployment requirements
* Existing-market incompatibility
* Required environment variables
* Role initialization
* Contract verification
* Frontend migration
* API migration
* Keeper migration

---

# 53. Security Requirements

Use appropriate OpenZeppelin components:

* SafeERC20
* AccessControl
* ReentrancyGuard
* Pausable

Apply:

* Checks-effects-interactions
* Strict state validation
* Strict caller authorization
* Timestamp validation
* Snapshot-based quorum
* Duplicate-vote prevention
* Duplicate-refund prevention
* Duplicate-claim prevention
* Outcome-index validation
* Safe fee accounting
* Safe liability accounting
* No arbitrary admin withdrawals
* No silent result changes
* No unbounded critical loops
* No secrets in logs
* No frontend-only security controls

Review for:

* Reentrancy
* Insolvency
* Governance manipulation
* Snapshot manipulation
* Integer rounding
* Token decimal errors
* Stuck funds
* Duplicate refunds
* Duplicate rewards
* Reward-threshold bypass
* Late voting
* Late trading
* Array bounds errors
* Denial of service
* Malicious ERC-20 behavior
* Storage growth

---

# 54. Required Smart-Contract Tests

## Community Proposal Creation

Test:

* Correct 11 tITL charge
* 1 tITL treasury allocation
* 10 tITL proposal seed accounting
* Insufficient allowance
* Insufficient balance
* Two outcomes
* Three outcomes
* Four outcomes
* Too few outcomes
* Too many outcomes
* Empty labels
* Duplicate labels
* Invalid category
* Empty thumbnail
* Oversized metadata
* Invalid trading end time

## Team Market Creation

Test:

* Authorized team market activates immediately
* Team market appears active
* Team market bypasses proposal voting
* Unauthorized team-market creation fails
* Team market seed funding is valid

## Proposal Voting

Test:

* Active DEC approval vote
* Active DEC rejection vote
* Unauthorized vote fails
* Suspended DEC vote fails
* Duplicate vote fails
* Vote at or after 24 hours fails
* Team market proposal vote fails
* Early finalization fails
* Permissionless finalization after 24 hours succeeds

## Proposal Results

Test:

* More approvals activates market
* More rejections rejects market
* Tied nonzero vote rejects market
* Zero votes cancels market
* Rejected proposal automatically refunds 10 tITL
* Tied proposal automatically refunds 10 tITL
* No-vote proposal automatically refunds 10 tITL
* 1 tITL remains non-refundable
* Duplicate finalization fails
* Duplicate refund is impossible
* Failed token transfer reverts finalization

## Seed Allocation

Test:

* Two-outcome allocation
* Three-outcome allocation
* Four-outcome allocation
* Deterministic remainder
* Total seed remains exactly 10 tITL
* Seed cannot be withdrawn early

## Trading

Test:

* Trade before activation fails
* Trade after activation succeeds
* Trade after end time fails
* Invalid outcome fails
* Zero trade fails
* Fee equals 0.5%
* Community fee split
* Team fee split
* Creator fee accounting
* DEC reward accounting
* Slippage protection
* Multi-outcome pricing
* Price updates
* Participant mapping updates
* Rounding behavior

## Resolution Eligibility

Test:

* Trader may request resolution
* Creator may request resolution
* Active DEC member may request resolution
* Nonparticipant request fails
* Suspended DEC member request fails
* Resolution before trading end fails
* Duplicate request fails

## Resolution Voting Window

Test:

* Deadline equals start plus three hours
* Active DEC vote succeeds
* Duplicate vote fails
* Invalid outcome fails
* Unauthorized vote fails
* Suspended DEC vote fails
* Vote at or after three hours fails
* Early finalization fails
* Permissionless finalization after three hours succeeds

## Resolution Snapshot and Quorum

Test:

* Active DEC count is snapshotted
* Quorum is calculated correctly
* New DEC member does not change existing snapshot
* Removed DEC member does not change existing snapshot
* Quorum reached
* Quorum not reached
* Unique highest vote selected after quorum
* Tied highest result escalates
* No-quorum result escalates
* Leading outcome cannot win without quorum

## Admin Verification

Test:

* Authorized verification succeeds
* Unauthorized verification fails
* Invalid outcome confirmation fails
* Finalized outcome cannot change
* Tie escalation emits correct event
* No-quorum escalation emits correct event

## DEC Reputation and Rewards

Test:

* Honest vote increases reputation
* Incorrect vote decreases reputation
* Vote processing cannot happen twice
* New reward accrual stops below threshold
* Previously earned rewards remain recorded
* Previously earned rewards cannot be claimed below threshold
* Claim reverts below threshold
* Claim becomes available after recovery
* New accrual resumes after recovery
* No duplicate retroactive rewards

## Claims

Test:

* Winner claim succeeds
* Losing claim fails
* Duplicate winner claim fails
* Creator fee claim succeeds
* Unauthorized creator-fee claim fails
* Creator seed claim succeeds after finalization
* Early creator-seed claim fails
* Duplicate seed claim fails

## Invariants

Test:

```text
Contract assets
    ≥
All outstanding liabilities
```

Also test:

* Fee buckets equal collected fees
* Seed liabilities are covered
* Winner liabilities are covered
* Refund liabilities are covered
* DEC reward liabilities are covered
* Creator fee liabilities are covered
* No user can claim more than owed
* Finalized outcome is immutable
* State transitions cannot move backward
* Total allocated seed equals original seed
* Total fee distribution does not exceed collected fee

---

# 55. Frontend and Contract Validation

Use the actual available repository scripts.

At minimum, run the equivalent of:

```bash
npm install
npm run lint
npm run typecheck
npm run build
```

For smart contracts:

```bash
cd interpredict-deploy
npm install
npx hardhat compile
npx hardhat test
```

Also run any available:

* Formatting
* Coverage
* Static analysis
* Contract-size checks
* Slither analysis
* Integration tests

Fix all errors introduced by this implementation.

Do not claim completion if:

* Contract compilation fails
* Contract tests fail
* TypeScript fails
* Production build fails
* ABI is outdated
* Frontend calls obsolete functions
* APIs decode obsolete contract structures
* Tests are skipped without explanation

Clearly separate:

* Pre-existing failures
* New failures
* Environment-related failures

---

# 56. Implementation Order

Follow this order:

1. Inspect repository and Git status.
2. Create feature branch.
3. Document current architecture.
4. Design state machine.
5. Design solvency and accounting model.
6. Implement roles and DEC membership.
7. Implement community proposal creation.
8. Implement team-market immediate activation.
9. Implement 24-hour DEC proposal voting.
10. Implement deterministic proposal finalization.
11. Implement automatic rejection and no-vote refunds.
12. Implement seed allocation.
13. Implement multi-outcome pricing.
14. Implement trading fees.
15. Implement creator fees.
16. Implement DEC reward accounting.
17. Implement DEC reputation and reward suspension.
18. Implement trading closure.
19. Implement restricted resolution requests.
20. Implement three-hour resolution voting.
21. Implement active-DEC snapshot quorum.
22. Implement highest-valid-vote result selection.
23. Implement tie and no-quorum escalation.
24. Implement admin verification.
25. Implement outcome confirmation.
26. Implement winner claims.
27. Implement creator seed and fee claims.
28. Add comprehensive contract tests.
29. Compile and test contracts.
30. Update deployment scripts and ABI.
31. Update Web3 context.
32. Update APIs and keeper routes.
33. Update market creation UI.
34. Update creator dashboard.
35. Update DEC proposal dashboard.
36. Update DEC resolution dashboard.
37. Update dApp Marketplace.
38. Update homepage Explore Markets.
39. Run TypeScript, lint, and production build.
40. Fix integration errors.
41. Review complete Git diff.
42. Produce final implementation report.

Do not push, merge, deploy, or update production contract addresses until the completed diff has been reviewed.

---

# 57. Required Final Report

At completion, provide:

## Files Changed

List every modified file and explain its changes.

## Files Created

List every new file and its purpose.

## Files Deleted

List every deleted file and explain why deletion was necessary.

## Protocol Architecture

Explain:

* Market origins
* Community proposal flow
* Team-market immediate activation
* 24-hour proposal voting
* Automatic refunds
* Multi-outcome pricing
* Seed accounting
* Fee accounting
* DEC membership
* DEC reputation
* Reward suspension
* Resolution request eligibility
* Three-hour resolution voting
* DEC snapshot quorum
* Highest-vote outcome selection
* Tie handling
* No-quorum handling
* Admin verification
* Winner claims
* Creator claims
* Cancellation
* Solvency

## Explicit Proposal Confirmation

Confirm:

* Team markets enter the Marketplace automatically.
* Community proposals remain untradable for 24 hours.
* Proposal voting closes after exactly 24 hours.
* Approval votes greater than rejection votes activate the market.
* Rejection votes greater than approval votes reject the proposal.
* Equal nonzero votes reject the proposal.
* Zero votes cancel the proposal.
* Rejected proposals receive an automatic 10 tITL refund.
* Tied proposals receive an automatic 10 tITL refund.
* No-vote proposals receive an automatic 10 tITL refund.
* No separate refund claim is required.
* The 1 tITL proposal fee remains non-refundable.
* Duplicate refunds are impossible.

## Explicit DEC Reward Confirmation

Confirm:

* Rewards stop accruing below the reputation threshold.
* Previously earned unclaimed rewards remain recorded.
* Previously earned unclaimed rewards cannot be claimed below the threshold.
* Previously earned rewards become claimable after reputation recovery.
* New reward accrual resumes after reputation recovery.

## Explicit Resolution Confirmation

Confirm:

* Only a trader, creator, or active DEC member may request resolution.
* Resolution voting lasts exactly three hours.
* Active eligible DEC membership is snapshotted when voting begins.
* Quorum is based on that snapshot.
* Membership changes do not alter an active market’s quorum.
* An outcome wins only after quorum.
* The outcome with the highest valid vote count wins after quorum.
* Tied highest outcomes do not resolve automatically.
* No-quorum results do not resolve automatically.

## Validation Results

Report actual results for:

* Hardhat compilation
* Hardhat tests
* TypeScript
* Lint
* Next.js production build
* Static analysis
* Invariant tests

Do not state that anything passed unless the command was actually executed successfully.

## Migration Requirements

Explain:

* Whether contract redeployment is required
* Required environment variables
* New constructor or initializer arguments
* New roles
* ABI changes
* Keeper changes
* Frontend address changes
* API address changes
* Existing market compatibility
* Old-contract limitations

## Remaining Risks

List:

* Security risks
* Economic risks
* Solvency risks
* Governance risks
* Centralization risks
* Scalability risks
* Storage risks
* Missing external services
* Test gaps

## Recommended Commit Message

Provide a concise commit message.

## Recommended Pull Request Description

Provide a complete Markdown pull-request description.

Do not push or merge until the complete diff is reviewed and approved.
