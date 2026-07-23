# InterPredict V2 Protocol Diagrams

These Mermaid diagrams describe the reviewed V2 architecture. The deployed
contract and verified source remain authoritative.

## Component topology

```mermaid
flowchart LR
    User[Wallet user] --> UI[Next.js interface]
    UI --> Wallet[Injected wallet provider]
    UI --> APIs[Markets and DEC APIs]
    APIs --> Auth[Interlink RPC auth]
    APIs --> RPC[Interlink JSON-RPC]
    Keeper[Single logical keeper] --> Auth
    Keeper --> RPC
    Wallet --> RPC
    RPC --> Main[InterPredict]
    Main -. delegatecall via fixed link .-> Reader[InterPredictReader library]
    Main --> Token[Exact-transfer ERC-20]
    Main --> Treasury[Treasury]
    Admin[Admin multisig] --> Main
    DECManager[DEC manager] --> Main
    DEC[Snapshotted DEC voters] --> Main
```

## Market lifecycle

```mermaid
stateDiagram-v2
    [*] --> DECProposalVoting: createCommunityMarket
    [*] --> Active: createTeamMarket + minimum seed
    DECProposalVoting --> Active: strict approval after 24h
    DECProposalVoting --> Rejected: reject, tie, or expired trading deadline
    DECProposalVoting --> Cancelled: no DEC votes
    Active --> TradingClosed: deadline sync
    Active --> Cancelled: admin emergency cancellation
    TradingClosed --> DECResolutionVoting: requestResolution
    DECResolutionVoting --> AdminVerification: permissionless finalization after 3h
    AdminVerification --> OutcomeConfirmed: evidence confirmation
    AdminVerification --> OutcomeConfirmed: timeout + binding DEC plurality
    AdminVerification --> Cancelled: timeout + failed/tied vote
    OutcomeConfirmed --> Resolved: permissionless finalizeMarket
    Resolved --> [*]: payout, seed, reward claims
    Rejected --> [*]: automatic seed refund
    Cancelled --> [*]: applicable trader and seed claims
```

## Resolution snapshot and timeout

```mermaid
sequenceDiagram
    participant R as Eligible requester
    participant P as InterPredict
    participant D as DEC voters
    participant A as Admin multisig
    participant X as Any caller

    R->>P: requestResolution(marketId)
    P->>P: freeze membership epoch, count, ceil(50%) quorum, +3h deadline
    D->>P: voteOnResolution(outcome) before deadline
    X->>P: finalizeResolutionVoting() after deadline
    P->>P: compute unique leader / no votes / no quorum / tie
    alt Admin acts inside 24h
        A->>P: confirmOutcome(outcome, reason, evidenceURI)
        P->>P: enforce binding valid DEC leader
    else Admin deadline expires
        X->>P: executeAdminVerificationTimeout()
        alt Valid binding DEC result
            P->>P: confirm leader automatically
        else Failed or tied vote
            P->>P: cancel and preserve refund paths
        end
    end
    X->>P: finalizeMarket()
    X->>P: settleResolutionParticipation(voter)
```

## Asset and liability flow

```mermaid
flowchart TD
    Community[Community creator: 11 tokens] --> Fee[1-token proposal fee]
    Fee --> Treasury
    Community --> ProposalSeed[10-token proposal-seed liability]
    ProposalSeed -->|approved| CreatorSeed[creator-seed liability]
    ProposalSeed -->|rejected/tie/no votes| CreatorRefund[automatic creator refund]
    Team[Team creator: seed >= 10] --> CreatorSeed

    Trader[Gross outcome purchase] --> TradeFee[50 bps fee]
    Trader --> Collateral[net trading-collateral liability]
    TradeFee --> TreasuryPart[treasury: 20 bps community / 30 bps team]
    TradeFee --> DECFund[per-market DEC liability: 20 bps]
    TradeFee -->|community residual| CreatorFee[creator-fee liability]

    Collateral -->|resolved| Winners[winner payouts]
    Collateral -->|cancelled| TraderRefunds[net-contribution refunds]
    CreatorSeed --> SeedReturn[creator seed return]
    CreatorFee --> FeeClaim[creator fee claim]
    DECFund -->|eligible correct voters| Vested[Vested DEC rewards]
    DECFund -->|division dust or cancellation| Treasury
    Vested --> DECClaim[claimDECRewards]
```

## Breaking migration

```mermaid
flowchart LR
    V1[V1 native, binary contract] --> History[Read-only V1 history and claims]
    Review[Source, ABI, storage, token, multisig review] --> Reader[Deploy and verify Reader]
    Reader --> V2[Deploy linked V2]
    V2 --> Roles[Verify roles and bootstrap DEC]
    Roles --> Staging[Configure staging address, token, deployment block]
    Staging --> QA[Lifecycle and desktop/mobile QA]
    QA --> Approval{Human go/no-go}
    Approval -->|approved| Cutover[V2 frontend cutover]
    Approval -->|rejected| NoDeploy[Remain on reviewed prior state]
    History -. no automatic storage import .-> Cutover
```

