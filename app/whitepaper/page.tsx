'use client'

import { BackHomeButton } from "@/components/back-home-button"

export default function WhitepaperPage() {
  // Safe string declarations to protect the Next.js JSX compiler from parsing errors
  const rejectRatio = "10% / 90%";
  const totalFeePct = "5.0%";
  const baseSplit = "2.0% (DEC) / 2.0% (Team) / 1.0% (Creator)";
  const teamSplit = "2.0% (DEC) / 3.0% (Team)";
  const voteCondition = "votesForActive >= votesAgainstActive && votesForActive > 0";
  const timeCondition = "block.timestamp >= market.marketEndTime";

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
            Version 2.0 (Technical Release) — This whitepaper details the immutable protocol parameters,
            mathematical payout distributions, and game-theoretic staking mechanisms implemented in the InterPredict contract.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="mb-12 rounded-xl border border-border bg-secondary/30 p-8 backdrop-blur">
          <h2 className="mb-6 text-2xl font-bold text-foreground font-mono">Table of Contents</h2>
          <ul className="space-y-3 text-sm text-muted-foreground font-mono">
            <li><span className="text-primary">1.</span> Executive Summary</li>
            <li><span className="text-primary">2.</span> Introduction & Problem Statement</li>
            <li><span className="text-primary">3.</span> Core Architecture & EVM Storage Map</li>
            <li><span className="text-primary">4.</span> Pari-Mutuel Market Mechanism & Trading Model</li>
            <li><span className="text-primary">5.</span> Decentralized Governance & Curation Committee (DEC)</li>
            <li><span className="text-primary">6.</span> Market Lifecycle & Oracle Settlement</li>
            <li><span className="text-primary">7.</span> Interlink Network Integration & tITL Economics</li>
            <li><span className="text-primary">8.</span> Security, Access Guards & Risk Management</li>
            <li><span className="text-primary">9.</span> Roadmap & Future Enhancements</li>
            <li><span className="text-primary">10.</span> Conclusion & Call to Action</li>
          </ul>
        </div>

        {/* 1. Executive Summary */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">1. Executive Summary</h2>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            InterPredict is an autonomous, peer-to-peer binary oracle and prediction protocol operating natively on the Interlink Layer 1 blockchain.
            By building directly on Interlink, the protocol leverages a sovereign gas-efficient EVM execution environment and native identity registers to create a censorship-resistant forecasting venue.
          </p>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            The platform eliminates the need for external wrapped stablecoins, functioning entirely with native <strong>ITL</strong> as its single asset for collateral, trading, and security stakes.
            Furthermore, the protocol leverages Interlink's Proof of Humanity (PoH) framework to power its Decentralized Ecosystem Curation (DEC) Committee on a Sybil-resistant, "one-human-one-vote" basis, matching market integrity with true decentralization.
          </p>
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground font-mono">
            <p className="font-bold text-foreground mb-1">CORE PROTOCOL PARAMETERS:</p>
            <ul className="space-y-1">
              <li>• Native Currency: ITL (Native Interlink Token)</li>
              <li>• Proposal Security Stake: 1.00 ITL (MARKET_STAKE)</li>
              <li>• Curation Windows: 24 Hours (VOTING_DURATION = 1 day)</li>
              <li>• Rejected Proposal Penalty: {rejectRatio} Split (10% to Team, 90% Refunded)</li>
              <li>• Platform Fee Rate: {totalFeePct} Flat (Deducted from winning payouts only)</li>
            </ul>
          </div>
        </section>

        {/* 2. Introduction */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">2. Introduction & Problem Statement</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">2.1 Current Bottlenecks in Decentralized Prediction Markets</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            First-generation decentralized prediction platforms face severe architectural bottlenecks that hinder retail adoption and compromise decentralization:
          </p>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li>
              <strong>Collateral Frictional Drag:</strong> Reliance on wrapped stablecoins (e.g., USDC/USDT) forces users to interact with complex cross-chain bridges, resulting in friction, wrapping fees, and exposure to third-party smart contract risks.
            </li>
            <li>
              <strong>Sybil Vulnerability:</strong> Standard governance frameworks weight votes by financial holdings. This allows wealthy actors ("whales") to manipulate market listings, bias resolution outcomes, and centralize curation control.
            </li>
            <li>
              <strong>Opaque Resolution Pathways:</strong> Resolving controversial events often relies on complex, expensive off-chain oracle queries, which can lead to delayed payouts and security issues.
            </li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">2.2 The InterPredict Paradigm Shift</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            InterPredict addresses these vulnerabilities directly at the smart contract level:
          </p>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li>
              <strong>Native L1 Asset Integration:</strong> Trading, staking, and payout operations are handled entirely using native ITL, keeping transactions low-cost and secure.
            </li>
            <li>
              <strong>Identity-Bound Curation:</strong> By checking active registry memberships, the protocol ensures that curation remains democratic, transparent, and highly resistant to Sybil manipulation.
            </li>
            <li>
              <strong>Algorithmic Curation Safeguards:</strong> A strict 24-hour curation model penalizes spam proposals with a 10% penalty, protecting the platform from low-quality listings.
            </li>
          </ul>
        </section>

        {/* 3. Core Architecture & EVM Storage Map */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">3. Core Architecture & EVM Storage Map</h2>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            The core protocol logic is deployed within a single, optimized smart contract (<code>InterPredict.sol</code>). To minimize gas fees on the Interlink network, the central struct layout is tightly packed to reduce state-write overhead:
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

        {/* 4. Market Mechanism */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">4. Pari-Mutuel Market Mechanism & Trading Model</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">4.1 Binary Share Mechanics</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            Each proposed prediction market is structured around a clear, binary question with two outcomes: YES and NO.
            Trading does not require external market makers; instead, a non-custodial pari-mutuel matching model dynamically adjusts share prices based on the ratio of committed capital.
          </p>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">4.2 Proportional Payout Math Engine</h3>
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

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">4.3 The Flat 5.0% Fee-Splitting Matrix</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            To ensure the protocol remains self-sustaining, a flat 5.0% fee is applied to winning payouts.
            The contract dynamically splits this fee based on who created the market:
          </p>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li>
              <strong>For Community-Created Markets:</strong> The 5.0% fee is split as <strong>{baseSplit}</strong>.
              The 1.0% creator yield is held in escrow and can be claimed by the creator via <code>claimCreatorYield()</code> once the market is resolved.
            </li>
            <li>
              <strong>For Team-Created Markets:</strong> The 5.0% fee is split as <strong>{teamSplit}</strong>.
              Since the team deployed the market, the creator yield is absorbed.
            </li>
          </ul>
        </section>

        {/* 5. Governance */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">5. Decentralized Governance & Curation Committee (DEC)</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">5.1 Committee Onboarding & Sybil Defenses</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            To participate in the curation committee, users join by calling <code>joinCommittee()</code> and staking exactly <strong>0.10 ITL</strong>.
            This registration fee is routed to the Team Treasury Wallet to prevent automated script spam.
            By design, the protocol limits curation power to one vote per verified user, ensuring a fair and democratic curation process.
          </p>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">5.2 The 10% / 90% Proposal Rejection Penalty</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            When proposing a market, users must deposit a stake of exactly 1.00 ITL. This proposal stake triggers a 24-hour curation window:
          </p>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li>
              <strong>If Approved:</strong> The market is opened for public trading, and the 1.00 ITL stake remains locked in escrow.
            </li>
            <li>
              <strong>If Rejected:</strong> To deter spam, the contract enforces a strict <strong>{rejectRatio}</strong> split.
              A 10% penalty (0.10 ITL) is sent to the Team Treasury to support governance operations, and the remaining 90% (0.90 ITL) is returned to the creator.
            </li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">5.3 Programmatic Curator Payouts</h3>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            Active committee members receive a pro-rata share of the 2.0% curation fee accumulated in the global <code>decPool</code>.
            Members can claim their rewards by calling <code>claimDecRewards()</code>, which tracks claims individually to prevent double-spending.
          </p>
        </section>

        {/* 6. Settlement */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">6. Market Lifecycle & Oracle Settlement</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground font-mono">6.1 The 5-Stage Lifecycle Flow</h3>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong>1. Proposal Stage:</strong> A user submits a market description and locks 1.00 ITL, placing the market into the <code>Proposed</code> state.
            </p>
            <p>
              <strong>2. Curation Stage:</strong> Committee members vote to approve or reject the market during a 24-hour window.
              Once the window passes, any user can call <code>initializeMarket()</code> to calculate the votes and transition the market to either <code>Active</code> or <code>Resolved (Outcome.DRAW)</code>.
            </p>
            <p>
              <strong>3. Trading Stage:</strong> Approved markets are opened for public trading.
              Users can buy YES or NO shares using native ITL until the market reaches its registered <code>marketEndTime</code>.
            </p>
            <p>
              <strong>4. Resolution Trigger:</strong> Once the trading window has officially closed, any user can invoke <code>requestOracleResolution()</code> to lock the market and request resolution.
            </p>
            <p>
              <strong>5. Settlement Stage:</strong> The authorized Team Oracle Wallet validates the real-world outcome and submits the resolution callback on-chain, enabling users to claim their payouts.
            </p>
          </div>
        </section>

        {/* 7. Interlink Network Integration */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">7. Interlink Network Integration & tITL Economics</h2>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            InterPredict is engineered natively for the Interlink Network. By operating entirely within Interlink's sovereign L1 environment, the protocol achieves significant performance advantages over cross-chain solutions:
          </p>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li>
              <strong>Low-Latency Trading:</strong> Transactions are confirmed quickly with microscopic gas fees, enabling seamless trading for retail users.
            </li>
            <li>
              <strong>Native Asset Settlement:</strong> Using native ITL directly eliminates the need for cross-chain bridges and wrapped stablecoins, ensuring secure asset custody.
            </li>
            <li>
              <strong>Integrated Identity:</strong> Verification loops integrate directly with native identity profiles, establishing a secure framework for decentralized curation.
            </li>
          </ul>
        </section>

        {/* 8. Security */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">8. Security, Access Guards & Risk Management</h2>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            The platform places user security and fund protection at the core of its design:
          </p>
          <ul className="mb-6 space-y-3 text-sm text-muted-foreground pl-4 list-disc">
            <li>
              <strong>Cryptographic Access Guards:</strong> The <code>onlyOracle</code> modifier restricts resolution capabilities exclusively to the designated oracle key, protecting the protocol from unauthorized calls.
            </li>
            <li>
              <strong>Administrative Security:</strong> Via <code>updateOracle()</code>, the contract owner can update the authorized oracle key to transition to decentralized multi-signature contracts or decentralized oracle networks as they deploy on the Interlink L1.
            </li>
            <li>
              <strong>Time-Locked Guardrails:</strong> The contract strictly enforces that markets can only be resolved after their registered <code>marketEndTime</code> has passed, protecting market integrity from premature resolution.
            </li>
          </ul>
        </section>

        {/* 9. Roadmap */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">9. Roadmap & Future Enhancements</h2>

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
          <h2 className="mb-6 text-3xl font-bold text-foreground font-mono border-b border-border pb-2">10. Conclusion & Call to Action</h2>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            InterPredict represents a major advancement in the design of decentralized prediction markets. By integrating native ITL settlement, decentralized curation, and secure on-chain resolution on the Interlink L1 network, we create a forecasting venue that is transparent, fair, and resilient.
          </p>
          <p className="mb-4 text-muted-foreground leading-relaxed text-sm">
            We invite developers, researchers, and prediction market enthusiasts to join us in building the future of decentralized prediction markets. Explore our resources, join our community, and participate in active discussions on our governance forum.
          </p>
          <div className="mt-8 rounded-lg border border-primary/20 bg-primary/5 p-6 text-center font-mono text-xs">
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
            Disclaimer: This whitepaper is for informational purposes only and does not constitute financial, investment, or legal advice. Prediction markets involve substantial risk, including the potential loss of principal. Users should conduct thorough due diligence and understand the risks before participating. InterPredict is provided "as is" without guarantees or warranties of any kind.
          </p>
        </div>
      </div>
    </main>
  )
}