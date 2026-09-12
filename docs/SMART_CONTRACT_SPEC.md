# InterPredict V2 — Smart Contract Specification

> Version: 2.0.0
> Date: 2026-08-16
> Status: DRAFT (Phase Zero)

---

## 1. Overview

`InterPredictV2` is a single Solidity contract governing the full forecasting market lifecycle on the InterLink testnet. It uses native ITL (`msg.value`) for stakes, payouts, creator fees, and DEC rewards — **testnet only, no Mainnet deployment**.

**Inheritance:** `AccessControl`, `ReentrancyGuard`, `Pausable` (OpenZeppelin v5).

---

## 2. Roles

| Role | Hash | Purpose |
|------|------|---------|
| `TEAM_ROLE` | `keccak256("TEAM_MARKET_ROLE")` | Deploy team markets directly to Active |
| `DEC_ROLE` | `keccak256("DEC_ROLE")` | DEC members (proposal + resolution voting) |
| `ADMIN_ROLE` | `keccak256("ADMIN_VERIFIER_ROLE")` | Confirm outcomes, cancel markets, manage DEC |
| `PAUSE_ROLE` | `keccak256("PAUSER_ROLE")` | Pause/unpause |
| `DEFAULT_ADMIN_ROLE` | OZ | Grant/revoke all roles |

---

## 3. Enums

### Origin
```
Community = 0
Team = 1
```

### Category (18 values)
```
Sports, Politics, Crypto, Blockchain, Technology, AI, Economics, Finance,
Business, Science, Climate, Entertainment, Culture, Health, RealEstate,
Gaming, Web3, Other
```

### State (14 values)
```
Proposed = 0
DECReview = 1
Rejected = 2
Cancelled = 3
Approved = 4
Active = 5
Closed = 6
Unresolved = 7
ResolutionRequested = 8
DECResolutionVoting = 9
AdminVerification = 10
Confirmed = 11
Finalized = 12
Resolved = 13
```

### ProposalVote
```
None = 0
Approve = 1
Reject = 2
```

---

## 4. State Machine

See `CONTRACT_STATE_MACHINE.md` for the full transition table. Summary:

```
Proposed → DECReview → {Rejected | Cancelled | Approved} → Active → Closed
  → Unresolved → ResolutionRequested → DECResolutionVoting → AdminVerification
  → Confirmed → Finalized → Resolved
```

---

## 5. Events (indexable, self-describing)

| Event | Emitted when | Indexed params |
|-------|-------------|----------------|
| `MarketProposed(uint256 id, string question, Category category, Origin origin, address creator)` | Community proposal created | id, creator |
| `MarketDeployed(uint256 id, string question, address creator)` | Team market deployed | id, creator |
| `MarketActivated(uint256 id)` | Market becomes Active | id |
| `MarketApproved(uint256 id)` | Proposal approved | id |
| `MarketRejected(uint256 id, string reason)` | Proposal rejected | id |
| `MarketCancelled(uint256 id, string reason)` | Market cancelled | id |
| `ProposalVoteCast(uint256 id, address voter, ProposalVote vote)` | DEC proposal vote | id, voter |
| `ProposalFinalized(uint256 id, ProposalVote decision, uint256 timestamp)` | Proposal voting finalized | id |
| `ParticipationRecorded(uint256 id, address participant, uint8 outcomeIndex, uint256 gross, uint256 net, uint256 shares, uint256 fee)` | Stake placed | id, participant |
| `ResolutionRequested(uint256 id, address requester, uint256 deadline)` | Resolution requested | id, requester |
| `ResolutionVoteCast(uint256 id, address voter, uint8 outcomeIndex)` | DEC resolution vote | id, voter |
| `ResolutionFinalized(uint256 id, bool quorumReached, bool tied, bool outcomeAvailable, uint8 suggestedOutcome)` | Resolution voting finalized with explicit tie/quorum semantics | id |
| `OutcomeConfirmed(uint256 id, uint8 outcomeIndex)` | Admin confirms outcome | id |
| `MarketFinalized(uint256 id)` | Market finalized | id |
| `WinningsClaimed(uint256 id, address claimant, uint256 amount)` | Winnings claimed | id, claimant |
| `CreatorFeeClaimed(uint256 id, address creator, uint256 amount)` | Creator fee claimed | id, creator |
| `CreatorSeedClaimed(uint256 id, address creator, uint256 amount)` | Creator seed claimed | id, creator |
| `DECMemberJoined(address member)` | DEC member added | member |
| `DECMemberRemoved(address member)` | DEC member removed | member |
| `DECMemberActivated(address member)` | DEC member activated | member |
| `DECMemberSuspended(address member)` | DEC member suspended | member |
| `DECRewardClaimed(address member, uint256 amount)` | DEC reward claimed | member |
| `ReputationUpdated(address member, uint256 reputation)` | DEC reputation changed | member |

---

## 6. Custom Errors

```solidity
error InvalidMarketState();
error AlreadyParticipated();
error AlreadyVoted();
error ResolutionAlreadyRequested();
error Unauthorized();
error InvalidOutcome();
error MarketClosed();
error MarketNotEnded();
error InsufficientFee();
error InvalidQuestion();
error InvalidOutcomes();
error DuplicateOutcome();
error NothingToClaim();
error NotFinalized();
error NotCreator();
error NotActiveDEC();
```

---

## 7. Core Functions

### Market creation
- `proposeMarket(MarketParams p) payable` — community proposal (requires fee + seed).
- `deployTeamMarket(MarketParams p) payable` — team market (requires seed, `TEAM_ROLE`).

### Proposal voting
- `enterProposalReview(uint256 id)` — Proposed → DECReview.
- `voteOnProposal(uint256 id, ProposalVote vote)` — DEC vote.
- `finalizeProposalVoting(uint256 id)` — DECReview → Approved/Rejected/Cancelled.

### Participation
- `participate(uint256 id, uint8 outcomeIndex, uint256 minShares) payable` — stake on outcome (Active only).

### Resolution
- `requestResolution(uint256 id)` — Active/Closed/Unresolved → ResolutionRequested.
- `voteOnResolution(uint256 id, uint8 outcomeIndex)` — DEC vote.
- `finalizeResolutionVoting(uint256 id)` — → AdminVerification.
- `confirmOutcome(uint256 id, uint8 outcomeIndex)` — ADMIN → Confirmed.
- `finalizeMarket(uint256 id)` — Confirmed → Finalized.

### Claims
- `claimWinnings(uint256 id)` — payout to winning participants.
- `claimCreatorFee(uint256 id)` — creator fee.
- `claimCreatorSeed(uint256 id)` — creator seed refund.
- `claimDECRewards()` — DEC reward distribution.

### DEC management
- `addDECMember(address)`, `removeDECMember(address)`, `activateDECMember(address)`, `suspendDECMember(address)`.

### Admin
- `cancelMarket(uint256 id, string reason)`, `pause()`, `unpause()`, `updateTreasury(address)`.

---

## 8. Invariants

1. A market's state only transitions along the defined state machine.
2. A participant can stake on a market at most once per outcome (or once total, per final spec).
3. A DEC member can vote at most once per proposal and once per resolution.
4. Resolution can be requested at most once per market.
5. Winnings can be claimed at most once per participant per market.
6. Value accounting balances: total in = total out + fees + treasury + DEC pool.
7. No unbounded loops (DEC member list operations are bounded or use pull-based patterns).

---

## 9. Security Considerations

- ReentrancyGuard on all value-transfer functions.
- Checks-Effects-Interactions ordering.
- AccessControl for all privileged actions.
- Pausable for emergency stop.
- Custom errors for precise failure signaling.
- No delegatecall, no selfdestruct, no upgradeability (no storage collisions).
- Pull-based payments (claim pattern) rather than push.

---

## 10. Constants (initial values)

| Constant | Value | Meaning |
|----------|-------|---------|
| `PROPOSAL_FEE` | 1 ITL | Community proposal fee |
| `SEED_AMOUNT` | 10 ITL | Seed liquidity |
| `MIN_STAKE` | 0.001 ITL | Minimum participation |
| `PROPOSAL_VOTING_WINDOW` | 24 hours | DEC proposal voting duration |
| `RESOLUTION_VOTING_WINDOW` | 3 hours | DEC resolution voting duration |
| `MAX_OUTCOMES` | 4 | Maximum outcomes per market |
| `MIN_OUTCOMES` | 2 | Minimum outcomes per market |
| `MAX_QUESTION_LEN` | 256 | Question length limit |
| `MAX_OUTCOME_LEN` | 64 | Outcome label length limit |
| `FEE_BPS` | 50 | Participation fee (basis points) |
| `SETTLE_BPS` | 500 | Settlement fee (basis points) |
| `RESOLUTION_QUORUM_BPS` | 500 | Resolution quorum (basis points) |

*(Final values to be confirmed during implementation; fee splits to treasury/DEC/creator per spec.)*