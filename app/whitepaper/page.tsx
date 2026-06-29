import { BackHomeButton } from "@/components/back-home-button"

export default function WhitepaperPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <BackHomeButton />
          <h1 className="mt-8 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            InterPredict Whitepaper
          </h1>
          <p className="mt-4 text-xl text-muted-foreground">
            A Decentralized Prediction Marketplace with Community-Led Curation
          </p>
          <p className="mt-3 text-sm text-muted-foreground italic">
            Version 1.0 (First Release) — This whitepaper describes the initial architecture and vision of InterPredict. As our protocol evolves, this document will be updated to reflect new features, improvements, and community feedback.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="mb-12 rounded-xl border border-border bg-secondary/30 p-8 backdrop-blur">
          <h2 className="mb-6 text-2xl font-bold text-foreground">Table of Contents</h2>
          <ul className="space-y-3 text-foreground">
            <li>1. Executive Summary</li>
            <li>2. Introduction & Problem Statement</li>
            <li>3. Core Architecture & Design Philosophy</li>
            <li>4. Market Mechanism & Trading Model</li>
            <li>5. Decentralized Governance & Curation Committee</li>
            <li>6. Market Lifecycle & Settlement</li>
            <li>7. Interlink Network Integration</li>
            <li>8. Security & Risk Management</li>
            <li>9. Roadmap & Future Enhancements</li>
            <li>10. Conclusion</li>
          </ul>
        </div>

        {/* Executive Summary */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground">1. Executive Summary</h2>
          <p className="mb-4 text-foreground">
            InterPredict is a decentralized prediction marketplace that leverages blockchain technology and community governance to create transparent, permissionless prediction markets. Unlike centralized platforms, InterPredict places market curation and oversight in the hands of a diverse governance committee, ensuring that market creation and management reflect community values rather than corporate interests.
          </p>
          <p className="mb-4 text-foreground">
            The protocol enables users to create, fund, and trade on binary prediction markets for real-world events. Each market's lifecycle is managed by a decentralized committee of curators who evaluate market legitimacy, enforce resolution rules, and dispute outcomes. This model combines the efficiency of prediction markets with the transparency and resilience of decentralized systems.
          </p>
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            <p><strong>Key Metrics (Version 1.0):</strong> Support for binary outcome markets, committee-based dispute resolution, real-time price discovery through CLOB mechanics, and seamless Interlink network integration.</p>
          </div>
        </section>

        {/* Introduction */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground">2. Introduction & Problem Statement</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground">2.1 Current Limitations of Centralized Prediction Markets</h3>
          <p className="mb-4 text-foreground">
            Existing prediction markets rely on centralized operators to manage market creation, curation, and dispute resolution. This creates several challenges:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>Centralized Control:</strong> Market operators have discretionary power over which events are listed and how disputes are resolved.</li>
            <li><strong>Censorship Risk:</strong> Platforms can remove markets or restrict access based on regulatory or commercial pressures.</li>
            <li><strong>Limited Transparency:</strong> Users have limited visibility into how resolution decisions are made.</li>
            <li><strong>Jurisdictional Constraints:</strong> Markets may be unavailable in certain regions due to regulatory concerns.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">2.2 InterPredict's Solution</h3>
          <p className="mb-4 text-foreground">
            InterPredict addresses these challenges through a decentralized governance model where:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>Community Curation:</strong> A diverse committee of curators votes on market proposals and resolution outcomes.</li>
            <li><strong>Transparent Dispute Resolution:</strong> All voting and dispute records are recorded on-chain and publicly auditable.</li>
            <li><strong>Permissionless Market Creation:</strong> Any user can propose a market; the community decides its legitimacy.</li>
            <li><strong>Decentralized Infrastructure:</strong> The protocol operates without reliance on a single operator or intermediary.</li>
          </ul>
        </section>

        {/* Core Architecture */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground">3. Core Architecture & Design Philosophy</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground">3.1 Design Principles</h3>
          <p className="mb-4 text-foreground">
            InterPredict is built on four core principles:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>Decentralization:</strong> All critical functions are managed through on-chain governance, not centralized servers.</li>
            <li><strong>Transparency:</strong> Market data, voting records, and settlement logic are publicly verifiable on the blockchain.</li>
            <li><strong>Community Governance:</strong> Market curation and dispute resolution are driven by community voting, not corporate decisions.</li>
            <li><strong>Composability:</strong> Built on standard smart contracts and the Interlink network for seamless integration with other protocols.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">3.2 System Components</h3>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <h4 className="mb-2 font-semibold text-foreground">Smart Contracts Layer</h4>
              <p className="text-muted-foreground">
                Core contracts handle market creation, order settlement, fund management, and governance voting. All contracts are auditable and upgradeable through community governance.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <h4 className="mb-2 font-semibold text-foreground">Governance Layer</h4>
              <p className="text-muted-foreground">
                The Committee operates through a multi-signature model with on-chain voting. Committee members are selected based on reputation, domain expertise, and community trust.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <h4 className="mb-2 font-semibold text-foreground">Trading & Settlement Engine</h4>
              <p className="text-muted-foreground">
                Uses an order book model (similar to CLOB implementations) for price discovery and efficient trade matching. Automatic settlement through smart contracts.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <h4 className="mb-2 font-semibold text-foreground">Oracle & Data Layer</h4>
              <p className="text-muted-foreground">
                Integrates with trusted oracle providers and manual data feeds verified by the committee to ensure accurate market resolution.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <h4 className="mb-2 font-semibold text-foreground">Interlink Integration Layer</h4>
              <p className="text-muted-foreground">
                Bridges to the Interlink network to enable cross-chain liquidity, unified identity, and protocol composability.
              </p>
            </div>
          </div>
        </section>

        {/* Market Mechanism */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground">4. Market Mechanism & Trading Model</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground">4.1 Binary Outcome Markets</h3>
          <p className="mb-4 text-foreground">
            InterPredict Version 1.0 focuses on binary prediction markets where outcomes are resolved to either YES or NO. Each market consists of two conditional tokens:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>YES Token:</strong> Represents a bet that the predicted event will occur.</li>
            <li><strong>NO Token:</strong> Represents a bet that the predicted event will not occur.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">4.2 Trading Mechanics</h3>
          <p className="mb-4 text-foreground">
            InterPredict employs a Central Limit Order Book (CLOB) model for decentralized price discovery, similar to advanced platforms like Polymarket:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>Order Placement:</strong> Users submit buy or sell orders for YES/NO tokens at specified prices and quantities.</li>
            <li><strong>Price Discovery:</strong> Market prices are determined through open competition between buyers and sellers.</li>
            <li><strong>Order Matching:</strong> Orders are matched when buy and sell prices overlap, enabling instant settlement.</li>
            <li><strong>Liquidity:</strong> Market makers can provide liquidity by maintaining both buy and sell orders across multiple price levels.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">4.3 Market Lifecycle Stages</h3>
          <div className="space-y-3 mb-6">
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Stage 1: Proposal</p>
              <p className="text-muted-foreground text-sm">Any user can propose a new market by specifying the event, resolution criteria, and market parameters (deadline, initial funding).</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Stage 2: Committee Review</p>
              <p className="text-muted-foreground text-sm">The Governance Committee reviews the proposal, validates event legitimacy, checks for duplicates, and votes to approve or reject.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Stage 3: Trading</p>
              <p className="text-muted-foreground text-sm">Approved markets become live. Users can trade YES/NO tokens freely until the market's event deadline is reached.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Stage 4: Resolution</p>
              <p className="text-muted-foreground text-sm">After the deadline, the Committee reviews evidence and votes to resolve the market to YES or NO. Winning tokens are redeemed at full value ($1.00); losing tokens expire worthless.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Stage 5: Settlement</p>
              <p className="text-muted-foreground text-sm">Users redeem winning tokens. Funds are distributed and the market closes. All transaction data is permanently recorded on-chain.</p>
            </div>
          </div>

          <h3 className="mb-4 text-xl font-semibold text-foreground">4.4 Pricing Model</h3>
          <p className="mb-4 text-foreground">
            Market prices reflect the probability of outcomes as determined by supply and demand. A YES token price of $0.65 implies a 65% probability of that outcome occurring. The sum of YES and NO token prices equals $1.00 at settlement, creating a coherent pricing framework.
          </p>
        </section>

        {/* Governance */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground">5. Decentralized Governance & Curation Committee</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground">5.1 Committee Structure - InterPredict's Unique Advantage</h3>
          <p className="mb-4 text-foreground">
            Unlike centralized platforms with opaque decision-making, the InterPredict Governance Committee operates with full transparency and accountability. Committee members are selected based on:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>Domain Expertise:</strong> Deep knowledge in prediction markets, finance, or specific event domains.</li>
            <li><strong>Community Reputation:</strong> Recognition within the prediction market and broader blockchain communities.</li>
            <li><strong>Alignment with Protocol Values:</strong> Commitment to fairness, transparency, and decentralization.</li>
            <li><strong>Diversity:</strong> Geographic, professional, and ideological diversity to ensure balanced decision-making.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">5.2 Committee Responsibilities</h3>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>Market Proposal Review:</strong> Evaluate proposed markets for clarity, legitimacy, and potential manipulation.</li>
            <li><strong>Duplicate Detection:</strong> Identify and consolidate redundant market proposals.</li>
            <li><strong>Market Resolution:</strong> Review evidence at event deadlines and vote on correct outcomes.</li>
            <li><strong>Dispute Arbitration:</strong> Handle appeals and contested resolutions through transparent voting processes.</li>
            <li><strong>Protocol Governance:</strong> Vote on upgrades, parameter changes, and community proposals.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">5.3 Voting Mechanism</h3>
          <p className="mb-4 text-foreground">
            Committee decisions use multi-signature contracts with weighted voting:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>Vote Weight:</strong> Each committee member has equal vote weight; decisions require a supermajority (66%+) to pass.</li>
            <li><strong>Transparency:</strong> All votes are recorded on-chain and publicly visible for anyone to audit.</li>
            <li><strong>Appeal Process:</strong> Contested votes can be appealed to the full committee for reconsideration.</li>
            <li><strong>Timelock:</strong> Governance changes are subject to a timelock period, allowing the community time to review and challenge decisions.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">5.4 Committee Accountability</h3>
          <p className="mb-4 text-foreground">
            Unlike centralized platforms, the Committee is accountable to the protocol and community:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>Reputation Scoring:</strong> Committee member performance is tracked; consistent misconduct results in removal.</li>
            <li><strong>Community Oversight:</strong> Users can flag suspicious decisions for community review and appeal.</li>
            <li><strong>Rotating Membership:</strong> Committee seats rotate to prevent concentration of power.</li>
            <li><strong>Public Records:</strong> All committee decisions and reasoning are permanently recorded on-chain.</li>
          </ul>
        </section>

        {/* Settlement */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground">6. Market Lifecycle & Settlement</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground">6.1 Settlement Process</h3>
          <p className="mb-4 text-foreground">
            Settlement occurs automatically through smart contracts following Committee resolution votes:
          </p>
          <ol className="mb-6 space-y-2 text-foreground list-decimal list-inside">
            <li>Committee reviews event evidence and votes on outcome</li>
            <li>If votes meet quorum and supermajority threshold, outcome is finalized on-chain</li>
            <li>Winning tokens are marked redeemable; losing tokens are invalidated</li>
            <li>Users redeem winning tokens for $1.00 each directly from the contract</li>
            <li>Market enters closed state; historical data is archived</li>
          </ol>

          <h3 className="mb-4 text-xl font-semibold text-foreground">6.2 Dispute Resolution</h3>
          <p className="mb-4 text-foreground">
            If Committee members disagree or external parties dispute a resolution, a formal dispute process is initiated:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>Dispute Submission:</strong> Disputers provide evidence and reasoning to challenge the initial resolution.</li>
            <li><strong>Committee Reconsideration:</strong> The full Committee reviews the dispute with fresh evidence.</li>
            <li><strong>Supermajority Override:</strong> If 75%+ of Committee votes to overturn, the market is re-resolved.</li>
            <li><strong>Final Appeal:</strong> Unresolved disputes may be escalated to a protocol-wide vote (planned for Version 2.0).</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">6.3 Data Integrity & Auditability</h3>
          <p className="mb-4 text-foreground">
            All market events—creation, trading, voting, settlement—are recorded immutably on-chain, enabling:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li>Full historical audit trails for regulatory compliance</li>
            <li>Transparent market analytics and price history</li>
            <li>Community verification of Committee decisions</li>
            <li>Algorithmic manipulation detection</li>
          </ul>
        </section>

        {/* Interlink */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground">7. Interlink Network Integration - Our Differentiator</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground">7.1 Interlink as Core Infrastructure</h3>
          <p className="mb-4 text-foreground">
            InterPredict leverages the Interlink network to achieve unprecedented liquidity aggregation and protocol composability—capabilities that centralized platforms cannot offer:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>Cross-Chain Liquidity:</strong> Pool liquidity from multiple blockchains into unified InterPredict markets without centralized intermediaries.</li>
            <li><strong>Unified Identity:</strong> Users maintain a single identity across the Interlink network without separate account creation or KYC processes for each chain.</li>
            <li><strong>Atomic Settlement:</strong> Trades settle instantly across chains through Interlink's cross-chain messaging, eliminating counterparty risk.</li>
            <li><strong>Protocol Composability:</strong> Other protocols can build derivatives or hedge instruments on InterPredict markets, creating an entire ecosystem.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">7.2 Liquidity Aggregation Architecture</h3>
          <p className="mb-4 text-foreground">
            InterPredict maintains interconnected order books across Interlink-connected chains:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li>Each market has a primary order book on the settlement chain</li>
            <li>Secondary replicas on high-liquidity chains enable local trading with minimal latency</li>
            <li>Interlink relayers synchronize orders across chains in near real-time</li>
            <li>Price discovery occurs across all chains simultaneously, ensuring arbitrage-free pricing</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">7.3 Future Vision: Inter-Market Derivatives</h3>
          <p className="mb-4 text-foreground">
            Through Interlink, protocols can compose on InterPredict markets to create sophisticated financial instruments:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li>Spread betting contracts (outcome of one market vs. another)</li>
            <li>Volatility indices across prediction markets</li>
            <li>Portfolio hedging instruments tied to multiple predictions</li>
            <li>Structured products with conditional payoffs</li>
          </ul>
        </section>

        {/* Security */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground">8. Security & Risk Management</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground">8.1 Smart Contract Security</h3>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>Audits:</strong> All core contracts undergo independent security audits before mainnet deployment.</li>
            <li><strong>Formal Verification:</strong> Critical settlement logic is formally verified to ensure mathematical correctness.</li>
            <li><strong>Bug Bounty Program:</strong> Community security researchers are incentivized to identify vulnerabilities.</li>
            <li><strong>Upgradability:</strong> Critical contracts can be paused and upgraded through Committee governance in emergency situations.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">8.2 Market Manipulation Prevention</h3>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>Suspicious Price Movement Detection:</strong> Algorithmic systems flag extreme price movements for Committee review.</li>
            <li><strong>Wash Trading Prevention:</strong> Patterns of self-dealing are detected and prevented at the smart contract level.</li>
            <li><strong>Market Maker Requirements:</strong> Certain markets may require minimum liquidity provision and price spread constraints.</li>
            <li><strong>Withdrawal Limits:</strong> Large withdrawals during volatile periods may be subject to Committee approval.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">8.3 Oracle & Data Integrity</h3>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>Multiple Data Sources:</strong> Resolution events rely on multiple independent oracle feeds and manual verification.</li>
            <li><strong>Committee Verification:</strong> Committee members manually verify critical event outcomes using trusted news sources.</li>
            <li><strong>Dispute Mechanism:</strong> If oracles disagree, the Committee arbitrates using off-chain evidence and majority voting.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">8.4 User Fund Protection</h3>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>Custody via Smart Contracts:</strong> Funds are held in audited smart contracts, not custodial accounts or banks.</li>
            <li><strong>Self-Custodial Trading:</strong> Users maintain private keys and full control of assets at all times.</li>
            <li><strong>Insurance (Future):</strong> Protocol-level insurance fund to cover edge cases and protocol failures (planned for Version 2.0).</li>
          </ul>
        </section>

        {/* Roadmap */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground">9. Roadmap & Future Enhancements</h2>

          <h3 className="mb-4 text-xl font-semibold text-foreground">9.1 Version 1.0 Features (Current Release)</h3>
          <ul className="mb-6 space-y-2 text-foreground">
            <li>✓ Binary outcome markets</li>
            <li>✓ Committee-based curation and resolution</li>
            <li>✓ CLOB-based trading engine with real-time price discovery</li>
            <li>✓ Interlink network integration</li>
            <li>✓ On-chain governance voting with full transparency</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">9.2 Planned for Version 2.0</h3>
          <ul className="mb-6 space-y-2 text-foreground">
            <li>Multi-outcome categorical markets (e.g., "Who will win the election?": Option A, B, C, D)</li>
            <li>Scalar markets for continuous values (e.g., "What will the S&P 500 close at on Dec 31?")</li>
            <li>Protocol-level insurance fund for edge cases and market failures</li>
            <li>Community-based dispute voting (partial decentralization of Committee authority)</li>
            <li>Enhanced Interlink integration with atomic swap guarantees</li>
            <li>Mobile application with push notifications and portfolio tracking</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">9.3 Long-Term Vision (2026-2027)</h3>
          <ul className="mb-6 space-y-2 text-foreground">
            <li>Full protocol decentralization through token-based governance</li>
            <li>Integration with prediction market aggregators and sentiment analysis tools</li>
            <li>Enterprise partnerships for prediction market infrastructure and white-label solutions</li>
            <li>Expansion to adjacent use cases (crowdsourced verification, DAO governance, collective decision-making)</li>
            <li>Supporting other asset classes (sports betting, elections, climate predictions, corporate events)</li>
            <li>Cross-protocol prediction market network enabling inter-market arbitrage</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">9.4 Research & Development Initiatives</h3>
          <p className="mb-4 text-foreground">
            InterPredict is committed to advancing the prediction market field through:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li>Peer-reviewed research on market design, pricing efficiency, and community dynamics</li>
            <li>Open-source libraries and SDKs for prediction market builders</li>
            <li>Academic partnerships to study prediction market accuracy and information aggregation</li>
            <li>Documentation and educational resources for market participants</li>
          </ul>
        </section>

        {/* Conclusion */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground">10. Conclusion & Call to Action</h2>

          <p className="mb-4 text-foreground">
            InterPredict represents a fundamental paradigm shift in how prediction markets operate. By combining decentralized governance, transparent community curation, CLOB-based trading mechanics, and deep Interlink integration, we create a prediction marketplace that is fairer, more resilient, and more aligned with community values than traditional centralized platforms.
          </p>

          <p className="mb-4 text-foreground">
            Prediction markets have existed for decades, but they have been limited by centralized operators, regulatory constraints, and liquidity fragmentation. InterPredict solves these fundamental problems through decentralization and community governance. Version 1.0 establishes the core protocol and proves the viability of community-led market curation. As we gather feedback from users and observe market dynamics, we will evolve the protocol to support more market types, enhance governance mechanisms, and deepen integration with the Interlink network.
          </p>

          <p className="mb-4 text-foreground">
            We invite researchers, market makers, prediction market enthusiasts, and developers to participate in building the future of decentralized prediction markets. The prediction market space is nascent and full of opportunity; InterPredict provides the infrastructure for communities worldwide to create and trade predictions in a transparent, decentralized manner.
          </p>

          <div className="mt-8 rounded-lg border border-primary/20 bg-primary/5 p-6">
            <p className="text-foreground font-semibold mb-2">Join the InterPredict Community</p>
            <p className="text-muted-foreground">
              To participate in governance, propose markets, contribute to protocol development, or build on InterPredict, join our governance forum and community channels. This whitepaper will be updated as the protocol evolves, reflecting new features, community feedback, and market developments.
            </p>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">
            <strong>Document Information:</strong> InterPredict Whitepaper v1.0 | June 2026 | This is a living document subject to regular updates as the protocol develops and the community provides feedback.
          </p>
          <p className="text-xs text-muted-foreground">
            Disclaimer: This whitepaper is for informational purposes only and does not constitute financial, investment, or legal advice. Prediction markets involve substantial risk, including the potential loss of principal. Users should conduct thorough due diligence and understand the risks before participating. InterPredict is provided "as is" without guarantees or warranties.
          </p>
        </div>
      </div>
    </main>
  )
}
