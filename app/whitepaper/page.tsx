'use client'

import { BackHomeButton } from "@/components/back-home-button"

export default function WhitepaperPage() {
  // 🧮 Declared local variables to avoid JSX/TSX token parsing and compilation errors
  const rejectRatio = "10% / 90%";
  const totalFeePct = "5.0%";
  const baseSplit = "2.0% (DEC) / 2.0% (Team) / 1.0% (Creator)";
  const teamSplit = "2.0% (DEC) / 3.0% (Team)";
  const voteConditionStr = "votesForActive >= votesAgainstActive && votesForActive > 0";
  const timeConditionStr = "block.timestamp >= market.marketEndTime";
  const superMajorityStr = "66% or higher";
  const disputeMajorityStr = "75% or higher";

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* Header Section */}
        <div className="mb-12">
          <BackHomeButton />
          <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl font-mono">
            InterPredict Whitepaper
          </h1>
          <p className="mt-4 text-xl text-muted-foreground font-mono">
            A Native-L1 Prediction Marketplace with Decentralized Sybil-Resistant Curation
          </p>
          <p className="mt-3 text-xs text-muted-foreground italic border-l-2 border-primary pl-4">
            Version 1.0 (Comprehensive Technical Specification) — This whitepaper describes the architectural design, mathematical models, and game-theoretic staking mechanisms implemented within the InterPredict protocol.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="mb-12 rounded-xl border border-border bg-secondary/30 p-8 backdrop-blur">
          <h2 className="mb-6 text-2xl font-bold text-foreground font-mono font-bold">Table of Contents</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground font-mono">
            <li><span className="text-primary">1.</span> Executive Summary</li>
            <li><span className="text-primary">2.</span> Introduction &amp; Problem Statement</li>
            <li><span className="text-primary">3.</span> Core Architecture &amp; EVM Storage Map</li>
            <li><span className="text-primary">4.</span> Pari-Mutuel Market Mechanism &amp; Trading Model</li>
            <li><span className="text-primary">5.</span> Decentralized Governance &amp; Curation Committee</li>
            <li><span className="text-primary">6.</span> Market Lifecycle &amp; Settlement</li>
            <li><span className="text-primary">7.</span> Interlink Network Integration &amp; tITL Economics</li>
            <li><span className="text-primary">8.</span> Security, Access Guards &amp; Risk Management</li>
            <li><span className="text-primary">9.</span> Roadmap &amp; Future Enhancements</li>
            <li><span className="text-primary">10.</span> Conclusion &amp; Call to Action</li>
          </ul>
        </div>

        {/* 1. Executive Summary */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">1. Executive Summary</h2>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            InterPredict is an autonomous, peer-to-peer binary oracle and prediction marketplace protocol designed natively for the Interlink Layer 1 blockchain. By building directly on Interlink, the protocol leverages a sovereign gas-efficient EVM execution environment and native identity registers to create a censorship-resistant forecasting venue.
          </p>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            Unlike legacy prediction engines that rely on bridged stablecoin wrappers—which introduces multi-hop wrapping friction, security vulnerabilities, and fee leakage—InterPredict establishes a circular economic engine operating entirely via native <strong>ITL</strong>.
          </p>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            The platform enables users to propose, curate, trade, and settle binary event predictions. Sybil attacks are mitigated through identity-linked onboarding loops mapped directly to Interlink&apos;s Proof of Humanity (PoH) registers, creating a Decentralized Ecosystem Curation (DEC) Committee operating on a stable &quot;one-human-one-vote&quot; paradigm.
          </p>
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground font-mono">
            <p className="font-bold text-foreground mb-1">KEY PROTOCOL METRICS &amp; HYPER-PARAMETERS:</p>
            <ul className="space-y-1">
              <li>• Native Currency: ITL (Native Interlink Token)</li>
              <li>• Proposal Security Stake: 1.00 ITL (MARKET_STAKE)</li>
              <li>• Curation Windows: 24 Hours (VOTING_DURATION = 1 day)</li>
              <li>• Rejected Proposal Penalty: {rejectRatio} Split (10% to Team, 90% Refunded)</li>
              <li>• Platform Fee Rate: {totalFeePct} Flat (Deducted from winning payouts only)</li>
            </ul>
          </div>
        </section>

        {/* 2. Introduction & Problem Statement */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">2. Introduction &amp; Problem Statement</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">2.1 Current Limitations of Centralized Prediction Markets</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm font-sans">
            Existing prediction markets rely on centralized operators to manage market creation, curation, and dispute resolution. This creates several challenges:
          </p>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li>
              <strong>Centralized Control:</strong> Market operators have discretionary power over which events are listed and how disputes are resolved, introducing counterparty risk.
            </li>
            <li>
              <strong>Censorship Risk:</strong> Platforms can arbitrarily remove markets, halt trading, or restrict access based on regulatory, political, or commercial pressures.
            </li>
            <li>
              <strong>Limited Transparency:</strong> Users have zero visibility into how resolution decisions are made, how fee spreads are processed, or what mechanisms drive internal settlement.
            </li>
            <li>
              <strong>Jurisdictional Constraints:</strong> Capital allocation is siloed, making pools highly illiquid and unavailable in certain regions due to regulatory concerns.
            </li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">2.2 InterPredict&apos;s Solution</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            InterPredict addresses these challenges through an open, decentralized governance model where:
          </p>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li>
              <strong>Community Curation:</strong> A diverse, decentralized committee of curators votes on market proposals and resolution outcomes.
            </li>
            <li>
              <strong>Transparent Dispute Resolution:</strong> All voting, resolution queries, and dispute records are recorded on-chain and are publicly auditable.
            </li>
            <li>
              <strong>Permissionless Market Creation:</strong> Any user can propose a market by locking a staking bond; the community decides its legitimacy.
            </li>
            <li>
              <strong>Decentralized Infrastructure:</strong> The protocol operates fully autonomously without reliance on any single central operator or intermediary.
            </li>
          </ul>
        </section>

        {/* 3. Core Architecture & EVM Storage Map */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">3. Core Architecture &amp; EVM Storage Map</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">3.1 System Components</h3>
          <div className="space-y-4 mb-8">
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <h4 className="mb-2 font-bold text-foreground font-mono text-sm">Smart Contracts Layer</h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                The core contracts handle market proposals, order matching, fee routing, and governance voting. All contracts are auditable, open-source, and upgradeable via the <code>updateOracle</code> method or DAO consensus.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <h4 className="mb-2 font-bold text-foreground font-mono text-sm">Governance Layer</h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                The DEC Committee operates through weighted, on-chain voting. Committee members are verified based on reputation, local PoH status, and a 0.1 ITL staking bond.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <h4 className="mb-2 font-bold text-foreground font-mono text-sm">Trading &amp; Settlement Engine</h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Uses an optimized non-custodial pari-mutuel matching model for price discovery. Automated settlement and fee-distribution calculations are executed natively on-chain.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <h4 className="mb-2 font-bold text-foreground font-mono text-sm">Oracle &amp; Data Layer</h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Integrates with a secure First-Party Oracle callback system verified by committee and consensus protocols, ensuring accurate settlement matching.
              </p>
            </div>
          </div>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">3.2 EVM Storage Optimization</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            To minimize state storage gas fees within the Interlink EVM runtime, storage structures are strictly packed. The central <code>Market</code> struct fits within contiguous 32-byte slots:
          </p>
          <pre className="p-4 bg-secondary/40 rounded-xl border border-border text-xs text-purple-300 font-mono overflow-x-auto mb-6">
            {`struct Market {
    uint256 id;                          // Slot 0 (32 bytes)
    string question;                     // Slot 1-2 (Dynamic size string pointer)
    uint256 marketEndTime;               // Slot 3 (32 bytes - Unix timestamp)
    uint256 votingEndTime;               // Slot 4 (32 bytes - Unix timestamp)
    uint256 totalYesPool;                // Slot 5 (32 bytes - Wager sum in wei)
    uint256 totalNoPool;                 // Slot 6 (32 bytes - Wager sum in wei)
    MarketState state;                   // Slot 7 (1 byte - Enum value 0-2)
    Outcome winningOutcome;              // Slot 7 (1 byte - Enum value 0-2)
    address creator;                     // Slot 7 (20 bytes - Creator's EVM address)
    bool creatorFeeClaimed;              // Slot 7 (1 byte - Flag tracker)
    bool oracleResolutionRequested;      // Slot 7 (1 byte - Prevent spam vector)
    uint256 votesForActive;              // Slot 8 (32 bytes - Curation support count)
    uint256 votesAgainstActive;          // Slot 9 (32 bytes - Curation reject count)
}`}
          </pre>
          <p className="text-muted-foreground leading-relaxed text-xs italic">
            Note: In Slot 7, the values of state, winningOutcome, creator, creatorFeeClaimed, and oracleResolutionRequested
            are packed together into a single 32-byte slot by the compiler, reducing gas consumption for state operations.
          </p>
        </section>

        {/* 4. Market Mechanism & Trading Model */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">4. Pari-Mutuel Market Mechanism &amp; Trading Model</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">4.1 Binary Share Mechanics</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            Each proposed prediction market is structured around a clear, binary question with two outcomes: YES and NO.
            Trading does not require external market makers; instead, a non-custodial pari-mutuel matching model dynamically adjusts share prices based on the ratio of committed capital.
          </p>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">4.2 Trading Mechanics (Central Limit Order Book Approach)</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            InterPredict utilizes a Central Limit Order Book (CLOB) model for decentralized price discovery, mimicking advanced order books:
          </p>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li><strong>Order Placement:</strong> Users submit buy or sell orders for YES/NO tokens at specified prices and quantities directly on-chain.</li>
            <li><strong>Price Discovery:</strong> Market prices are determined in real-time through open competition between buyers and sellers.</li>
            <li><strong>Order Matching:</strong> Orders are matched when buy and sell prices overlap, enabling instant settlement.</li>
            <li><strong>Liquidity Provision:</strong> Market makers can provide liquidity by maintaining both buy and sell orders across multiple price levels.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">4.3 Proportional Payout Math Engine</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            Payout claims are processed entirely on-chain through the <code>claimPayout()</code> function. To prevent rounding and division errors in Solidity, all multiplication actions are executed prior to division:
          </p>
          <div className="p-6 bg-secondary/30 rounded-xl border border-border mb-6 font-mono text-xs space-y-4">
            <div className="border-l-2 border-primary pl-4 py-1">
              <span className="text-purple-400 font-bold">Winning YES Payout:</span>
              <p className="text-slate-300 mt-1">{"Payout = (UserYesShares * TotalPool) / TotalYesPool"}</p>
            </div>
            <div className="border-l-2 border-primary pl-4 py-1">
              <span className="text-purple-400 font-bold">Winning NO Payout:</span>
              <p className="text-slate-300 mt-1">{"Payout = (UserNoShares * TotalPool) / TotalNoPool"}</p>
            </div>
            <div className="border-l-2 border-primary pl-4 py-1">
              <span className="text-purple-400 font-bold">DRAW/Refund Settlement (100% Capital Recovery):</span>
              <p className="text-slate-300 mt-1">{"Payout = UserYesShares + UserNoShares"}</p>
            </div>
          </div>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">4.4 Dynamic Fee-Splitting</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            To ensure the protocol remains self-sustaining, a flat 5.0% fee is applied to winning payouts. The contract dynamically splits this fee based on who created the market:
          </p>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li>
              <strong>For Community-Created Markets:</strong> The 5.0% fee is split as <strong>{baseSplit}</strong>. The 1.0% creator yield remains held in escrow and can be claimed by the creator via <code>claimCreatorYield()</code> once the market is resolved.
            </li>
            <li>
              <strong>For Team-Created Markets:</strong> The 5.0% fee is split as <strong>{teamSplit}</strong>. Since the team deployed the market, the creator yield is absorbed.
            </li>
          </ul>
        </section>

        {/* 5. Decentralized Governance & Curation Committee */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">5. Decentralized Governance &amp; Curation Committee</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">5.1 Committee Structure - InterPredict&apos;s Unique Advantage</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm font-sans">
            Unlike centralized platforms with opaque decision-making, the InterPredict Governance Committee operates with full transparency and accountability. Committee members are selected based on:
          </p>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li><strong>Domain Expertise:</strong> Deep knowledge in prediction markets, finance, or specific event domains.</li>
            <li><strong>Community Reputation:</strong> Recognition within the prediction market and broader blockchain communities.</li>
            <li><strong>Alignment with Protocol Values:</strong> Commitment to fairness, transparency, and decentralization.</li>
            <li><strong>Diversity:</strong> Geographic, professional, and ideological diversity to ensure balanced decision-making.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">5.2 Committee Responsibilities</h3>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li><strong>Market Proposal Review:</strong> Evaluate proposed markets for clarity, legitimacy, and potential manipulation.</li>
            <li><strong>Duplicate Detection:</strong> Identify and consolidate redundant market proposals.</li>
            <li><strong>Market Resolution:</strong> Review evidence at event deadlines and vote on correct outcomes.</li>
            <li><strong>Dispute Arbitration:</strong> Handle appeals and contested resolutions through transparent voting processes.</li>
            <li><strong>Protocol Governance:</strong> Vote on upgrades, parameter changes, and community proposals.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">5.3 Voting Mechanism</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            Committee decisions use contracts with weighted voting:
          </p>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li><strong>Vote Weight:</strong> Each committee member has equal vote weight; decisions require a supermajority ({superMajorityStr}) to pass.</li>
            <li><strong>Transparency:</strong> All votes are recorded on-chain and publicly visible for anyone to audit.</li>
            <li><strong>Appeal Process:</strong> Contested votes can be appealed to the full committee for reconsideration.</li>
            <li><strong>Timelock:</strong> Governance changes are subject to a timelock period, allowing the community time to review and challenge decisions.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">5.4 The 10% / 90% Proposal Rejection Penalty</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            When proposing a market, users must deposit a stake of exactly 1.00 ITL. This proposal stake triggers a 24-hour curation window:
          </p>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li>
              <strong>If Approved:</strong> The market is opened for public trading, and the 1.00 ITL stake remains locked in escrow.
            </li>
            <li>
              <strong>If Rejected:</strong> To deter spam, the contract enforces a strict <strong>{rejectRatio}</strong> split. A 10% penalty (0.10 ITL) is sent to the Team Treasury to support governance operations, and the remaining 90% (0.90 ITL) is returned to the creator.
            </li>
          </ul>
        </section>

        {/* 6. Market Lifecycle & Settlement */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">6. Market Lifecycle &amp; Settlement</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">6.1 The 5-Stage Lifecycle Flow</h3>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong>Stage 1: Proposal:</strong> A user submits a market description and locks 1.00 ITL, placing the market into the <code>Proposed</code> state.
            </p>
            <p>
              <strong>Stage 2: Committee Review:</strong> Committee members vote to approve or reject the market during a 24-hour window. Once the window passes, any user can call <code>initializeMarket</code> to calculate the votes and transition the market to either <code>Active</code> or <code>Resolved (Outcome.DRAW)</code>.
            </p>
            <p>
              <strong>Stage 3: Trading:</strong> Approved markets are opened for public trading. Users can buy YES or NO shares using native ITL until the market reaches its registered <code>marketEndTime</code>.
            </p>
            <p>
              <strong>Stage 4: Resolution Trigger:</strong> Once the trading window has officially closed, any user can invoke <code>requestOracleResolution()</code> to lock the market and request resolution.
            </p>
            <p>
              <strong>Stage 5: Settlement:</strong> The authorized Team Oracle Wallet validates the real-world outcome and submits the resolution callback on-chain, enabling users to claim their payouts.
            </p>
          </div>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">6.2 Dispute Resolution</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            If Committee members disagree or external parties dispute a resolution, a formal dispute process is initiated:
          </p>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li><strong>Dispute Submission:</strong> Disputers provide evidence and reasoning to challenge the initial resolution.</li>
            <li><strong>Committee Reconsideration:</strong> The full Committee reviews the dispute with fresh evidence.</li>
            <li><strong>Supermajority Override:</strong> If {disputeMajorityStr} of Committee votes to overturn, the market is re-resolved.</li>
            <li><strong>Final Appeal:</strong> Unresolved disputes may be escalated to a protocol-wide vote.</li>
          </ul>
        </section>

        {/* 7. Interlink Network Integration */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">7. Interlink Network Integration - Our Differentiator</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">7.1 Interlink as Core Infrastructure</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            InterPredict leverages the Interlink network to achieve unprecedented liquidity aggregation and protocol composability—capabilities that centralized platforms cannot offer:
          </p>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li><strong>Cross-Chain Liquidity:</strong> Pool liquidity from multiple blockchains into unified InterPredict markets without centralized intermediaries.</li>
            <li><strong>Unified Identity:</strong> Users maintain a single identity across the Interlink network without separate account creation or KYC processes for each chain.</li>
            <li><strong>Atomic Settlement:</strong> Trades settle instantly across chains through Interlink&apos;s cross-chain messaging, eliminating counterparty risk.</li>
            <li><strong>Protocol Composability:</strong> Other protocols can build derivatives or hedge instruments on InterPredict markets, creating an entire ecosystem.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">7.2 Liquidity Aggregation Architecture</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm font-sans">
            InterPredict maintains interconnected order books across Interlink-connected chains:
          </p>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li>Each market has a primary order book on the settlement chain.</li>
            <li>Secondary replicas on high-liquidity chains enable local trading with minimal latency.</li>
            <li>Interlink relayers synchronize orders across chains in near real-time.</li>
            <li>Price discovery occurs across all chains simultaneously, ensuring arbitrage-free pricing.</li>
          </ul>
        </section>

        {/* 8. Security & Risk Management */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">8. Security &amp; Risk Management</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">8.1 Smart Contract Security</h3>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li><strong>Audits:</strong> All core contracts undergo independent security audits before mainnet deployment.</li>
            <li><strong>Formal Verification:</strong> Critical settlement logic is formally verified to ensure mathematical correctness.</li>
            <li><strong>Bug Bounty Program:</strong> Community security researchers are incentivized to identify vulnerabilities.</li>
            <li><strong>Upgradability:</strong> Critical contracts can be paused and upgraded through Committee governance in emergency situations.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">8.2 Market Manipulation Prevention</h3>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li><strong>Suspicious Price Movement Detection:</strong> Algorithmic systems flag extreme price movements for Committee review.</li>
            <li><strong>Wash Trading Prevention:</strong> Patterns of self-dealing are detected and prevented at the smart contract level.</li>
            <li><strong>Market Maker Requirements:</strong> Certain markets may require minimum liquidity provision and price spread constraints.</li>
            <li><strong>Withdrawal Limits:</strong> Large withdrawals during volatile periods may be subject to Committee approval.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">8.3 Oracle &amp; Data Integrity</h3>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li><strong>Multiple Data Sources:</strong> Resolution events rely on multiple independent oracle feeds and manual verification.</li>
            <li><strong>Committee Verification:</strong> Committee members manually verify critical event outcomes using trusted news sources.</li>
            <li><strong>Dispute Mechanism:</strong> If oracles disagree, the Committee arbitrates using off-chain evidence and majority voting.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">8.4 User Fund Protection</h3>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li><strong>Custody via Smart Contracts:</strong> Funds are held in audited smart contracts, not custodial accounts or banks.</li>
            <li><strong>Self-Custodial Trading:</strong> Users maintain private keys and full control of assets at all times.</li>
            <li><strong>Insurance (Future):</strong> Protocol-level insurance fund to cover edge cases and protocol failures (planned for Version 2.0).</li>
          </ul>
        </section>

        {/* 9. Roadmap */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">9. Roadmap &amp; Future Enhancements</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">9.1 Version 1.0 Features (Initial Release)</h3>
          <ul className="mb-6 space-y-2 text-sm text-muted-foreground pl-4 list-disc">
            <li>✓ Support for binary outcome YES/NO prediction pools</li>
            <li>✓ Decentralized curation and resolution driven by the DEC Committee</li>
            <li>✓ Low-gas on-chain trading settled natively in ITL</li>
            <li>✓ Secure first-party oracle validation and settlement</li>
            <li>✓ Full on-chain transaction history mapping and transparency</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">9.2 Planned for Version 2.0</h3>
          <ul className="mb-6 space-y-2 text-sm text-muted-foreground pl-4 list-disc">
            <li>• Categorical prediction pools with multiple discrete options</li>
            <li>• Scalar markets for continuous numeric values (e.g., asset prices, index levels)</li>
            <li>• Federated multi-signature oracle consensus models</li>
            <li>• Native integration with decentralized oracle networks (e.g., UMA, Chainlink)</li>
            <li>• Mobile application with push notifications and portfolio tracking</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">9.3 Long-Term Vision (2026-2027)</h3>
          <ul className="mb-6 space-y-2 text-sm text-muted-foreground pl-4 list-disc">
            <li>• Full protocol decentralization through token-based governance</li>
            <li>• Integration with prediction market aggregators and sentiment analysis tools</li>
            <li>• Enterprise partnerships for prediction market infrastructure and white-label solutions</li>
            <li>• Cross-protocol prediction market network enabling inter-market arbitrage</li>
          </ul>
        </section>

        {/* 10. Conclusion */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">10. Conclusion &amp; Call to Action</h2>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            InterPredict represents a fundamental paradigm shift in how prediction markets operate. By combining decentralized governance, transparent community curation, CLOB-based trading mechanics, and deep Interlink integration, we create a prediction marketplace that is fairer, more resilient, and more aligned with community values than traditional centralized platforms.
          </p>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            We invite researchers, market makers, prediction market enthusiasts, and developers to participate in building the future of decentralized prediction markets. The prediction market space is nascent and full of opportunity; InterPredict provides the infrastructure for communities worldwide to create and trade predictions in a transparent, decentralized manner.
          </p>
          <div className="mt-8 rounded-lg border border-primary/20 bg-primary/5 p-6 text-center font-mono text-xs font-bold">
            <p className="text-muted-foreground mb-4">
              Do you want to review the platform rules or participate in active discussions?
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <span className="font-semibold text-primary">
                → Visit the DEC Curation Forum
              </span>
            </div>
          </div>
        </section>

        {/* Footer Block */}
        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4 font-mono text-xs">
            Document Information: InterPredict Whitepaper v1.0 | July 2026 | This is a living document subject to regular updates as the protocol develops and the community provides feedback.
          </p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Disclaimer: This whitepaper is for informational purposes only and does not constitute financial, investment, or legal advice. Prediction markets involve substantial risk, including the potential loss of principal. Users should conduct thorough due diligence and understand the risks before participating. InterPredict is provided &quot;as is&quot; without guarantees or warranties of any kind.
          </p>
        </div>
      </div>
    </main>
  )
}