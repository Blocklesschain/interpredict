# InterPredict V2 — Contract State Machine

> Version: 2.0.0
> Date: 2026-08-16
> Status: DRAFT (Phase Zero)

---

## 1. States

| # | State | Meaning |
|---|-------|---------|
| 0 | Proposed | Community proposal created, awaiting DEC review entry |
| 1 | DECReview | DEC members voting on proposal |
| 2 | Rejected | Proposal rejected by DEC |
| 3 | Cancelled | Market cancelled (no votes, admin, or creator) |
| 4 | Approved | Proposal approved, awaiting activation |
| 5 | Active | Market open for participation |
| 6 | Closed | Participation window ended |
| 7 | Unresolved | Ended but resolution not yet requested |
| 8 | ResolutionRequested | Resolution requested, awaiting DEC voting entry |
| 9 | DECResolutionVoting | DEC members voting on outcome |
| 10 | AdminVerification | Awaiting admin outcome confirmation |
| 11 | Confirmed | Outcome confirmed, awaiting finalization |
| 12 | Finalized | Market finalized, claims enabled |
| 13 | Resolved | Terminal state (all claims settled) |

---

## 2. Transition Table

| From | To | Trigger | Who | Event |
|------|----|---------|-----|-------|
| Proposed | DECReview | `enterProposalReview` | Anyone | `ProposalVotingStarted` |
| DECReview | Approved | `finalizeProposalVoting` (approve > reject) | Anyone | `MarketApproved` |
| DECReview | Rejected | `finalizeProposalVoting` (reject >= approve) | Anyone | `MarketRejected` |
| DECReview | Cancelled | `finalizeProposalVoting` (zero votes) | Anyone | `MarketCancelled` |
| Approved | Active | `activateMarket` (auto on finalize) | Anyone | `MarketActivated` |
| Active | Closed | (time-based, derived from endTime) | — | (derived) |
| Active/Closed/Unresolved | ResolutionRequested | `requestResolution` | creator/trader/DEC | `ResolutionRequested` |
| ResolutionRequested | DECResolutionVoting | (auto on request) | — | (derived) |
| DECResolutionVoting | AdminVerification | `finalizeResolutionVoting` | Anyone | `ResolutionFinalized` |
| AdminVerification | Confirmed | `confirmOutcome` | ADMIN | `OutcomeConfirmed` |
| Confirmed | Finalized | `finalizeMarket` | Anyone | `MarketFinalized` |
| Finalized | Resolved | (all claims settled — derived) | — | (derived) |
| Any (non-terminal) | Cancelled | `cancelMarket` | ADMIN | `MarketCancelled` |

---

## 3. Per-State Rules

### Proposed
- **Entered by:** `proposeMarket` (community).
- **Valid previous:** (none — creation).
- **Permitted:** `enterProposalReview`.
- **Prohibited:** participation, resolution, claims.
- **UI:** "Pending" / "Under Review".

### DECReview
- **Entered by:** `enterProposalReview`.
- **Valid previous:** Proposed.
- **Permitted:** `voteOnProposal` (DEC), `finalizeProposalVoting` (after window).
- **Prohibited:** participation, resolution, claims.
- **UI:** "Under Review" with vote buttons for DEC.

### Rejected
- **Entered by:** `finalizeProposalVoting`.
- **Valid previous:** DECReview.
- **Permitted:** (none — terminal).
- **UI:** "Rejected".

### Cancelled
- **Entered by:** `finalizeProposalVoting` (zero votes) or `cancelMarket` (admin).
- **Valid previous:** DECReview or any non-terminal.
- **Permitted:** refunds (creator seed).
- **UI:** "Cancelled".

### Approved
- **Entered by:** `finalizeProposalVoting`.
- **Valid previous:** DECReview.
- **Permitted:** `activateMarket`.
- **UI:** "Approved".

### Active
- **Entered by:** `activateMarket` (or team deploy).
- **Valid previous:** Approved (or creation for team).
- **Permitted:** `participate`.
- **Prohibited:** resolution (until endTime), claims.
- **UI:** "Active" with participation controls.

### Closed
- **Entered by:** (derived — endTime passed).
- **Valid previous:** Active.
- **Permitted:** `requestResolution`.
- **UI:** "Closed".

### Unresolved
- **Entered by:** (derived — endTime passed, no resolution).
- **Valid previous:** Active/Closed.
- **Permitted:** `requestResolution`.
- **UI:** "Closed" / "Under Resolution".

### ResolutionRequested
- **Entered by:** `requestResolution`.
- **Valid previous:** Active/Closed/Unresolved.
- **Permitted:** (auto-advance to DECResolutionVoting).
- **UI:** "Under Resolution".

### DECResolutionVoting
- **Entered by:** (auto on request).
- **Valid previous:** ResolutionRequested.
- **Permitted:** `voteOnResolution` (DEC), `finalizeResolutionVoting`.
- **UI:** "Under Resolution" with vote buttons for DEC.

### AdminVerification
- **Entered by:** `finalizeResolutionVoting`.
- **Valid previous:** DECResolutionVoting.
- **Permitted:** `confirmOutcome` (ADMIN).
- **UI:** "Under Resolution" (admin action).

### Confirmed
- **Entered by:** `confirmOutcome`.
- **Valid previous:** AdminVerification.
- **Permitted:** `finalizeMarket`.
- **UI:** "Resolved" (pending finalization).

### Finalized
- **Entered by:** `finalizeMarket`.
- **Valid previous:** Confirmed.
- **Permitted:** `claimWinnings`, `claimCreatorFee`, `claimCreatorSeed`, `claimDECRewards`.
- **UI:** "Resolved" with claim buttons.

### Resolved
- **Entered by:** (derived — all claims settled).
- **Valid previous:** Finalized.
- **Permitted:** (none — terminal).
- **UI:** "Resolved".

---

## 4. Invariants

1. No state transition skips a defined edge.
2. `Closed`/`Unresolved` are derived (not stored) — the stored state remains `Active` until resolution is requested; the UI derives "Closed" from `endTime < now`.
3. Resolution can only be requested after `endTime`.
4. Participation only in `Active` and before `endTime`.
5. Claims only in `Finalized`.
6. Duplicate actions rejected (see custom errors).

---

## 5. Notes on Legacy vs V2

The legacy contract declared `Closed` and `Unresolved` but never set them, and `Resolved` was never reached. V2 makes these **derived states** (computed from `endTime` and claim settlement) rather than stored states, eliminating the dead-state problem while preserving the 14-value enum for UI compatibility.