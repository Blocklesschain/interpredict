import Link from 'next/link'
import { BackHomeButton } from '@/components/back-home-button'

export default function DocumentationPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12">
          <BackHomeButton />
          <h1 className="mt-8 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            How InterPredict Works
          </h1>
          <p className="mt-4 text-xl text-muted-foreground">
            A User's Guide to Decentralized Prediction Markets
          </p>
        </div>

        {/* Quick Start */}
        <section className="mb-12 rounded-xl border border-border bg-secondary/30 p-8 backdrop-blur">
          <h2 className="mb-6 text-2xl font-bold text-foreground">Quick Start Guide</h2>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">1. Connect Your Wallet</p>
              <p className="text-muted-foreground text-sm">Connect using any Web3 wallet compatible with the Interlink network.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">2. Browse or Create Markets</p>
              <p className="text-muted-foreground text-sm">Browse existing prediction markets or submit your own market proposal for committee review.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">3. Trade Positions</p>
              <p className="text-muted-foreground text-sm">Buy or sell YES/NO tokens on any approved market, with prices determined by supply and demand.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">4. Hold & Settle</p>
              <p className="text-muted-foreground text-sm">Hold your position until market resolution, then claim your winnings. Losing positions expire worthless.</p>
            </div>
          </div>
        </section>

        {/* Market Creation */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground">Creating a New Market</h2>
          
          <h3 className="mb-4 text-xl font-semibold text-foreground">What Makes a Good Market Proposal?</h3>
          <p className="mb-4 text-foreground">
            InterPredict markets must have clear, unambiguous resolution criteria. Here's what the Governance Committee looks for:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>Clear Event Statement:</strong> "Will Bitcoin close above $50,000 on December 31, 2026?" is good. "Crypto will moon" is not.</li>
            <li><strong>Verifiable Outcome:</strong> The event outcome must be determinable from publicly available information (news, official announcements, etc.).</li>
            <li><strong>Specific Timeline:</strong> Include exact dates and times for event resolution.</li>
            <li><strong>Measurable Resolution Criteria:</strong> Define precisely how YES/NO will be determined (e.g., which data source will be used).</li>
            <li><strong>No Ambiguity:</strong> Avoid proposals that could be interpreted multiple ways.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">Market Proposal Form</h3>
          <p className="mb-4 text-foreground">
            When submitting a market proposal, you'll provide:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>Event Title:</strong> Short, descriptive name (e.g., "BTC Price Above $50K by EOY 2026")</li>
            <li><strong>Event Description:</strong> Detailed explanation of what the market is predicting</li>
            <li><strong>Resolution Date:</strong> When the event outcome will be determined</li>
            <li><strong>Resolution Source:</strong> Where the Committee will verify the outcome (e.g., CoinGecko, official press release)</li>
            <li><strong>Liquidity Amount:</strong> Initial seed funding for the market's liquidity pool</li>
            <li><strong>Category:</strong> Politics, Finance, Technology, Sports, etc.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">What Happens After You Submit?</h3>
          <div className="space-y-3 mb-6">
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Step 1: Initial Review (24-48 hours)</p>
              <p className="text-muted-foreground text-sm">The Committee checks for completeness, clarity, and compliance with platform standards.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Step 2: Duplicate Check</p>
              <p className="text-muted-foreground text-sm">Committee verifies there isn't already an identical or very similar market.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Step 3: Committee Vote</p>
              <p className="text-muted-foreground text-sm">Committee members vote to approve or reject. Supermajority (66%+) approval required.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Step 4: Market Launch</p>
              <p className="text-muted-foreground text-sm">Approved markets go live and become available for traders within hours.</p>
            </div>
          </div>
        </section>

        {/* Trading */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground">Trading on InterPredict</h2>
          
          <h3 className="mb-4 text-xl font-semibold text-foreground">Understanding Tokens & Pricing</h3>
          <p className="mb-4 text-foreground">
            Each market has two tokens: YES and NO. When you buy a YES token at a price of $0.60, you're betting that outcome has a 60% probability. The NO token would be priced at $0.40 (totaling $1.00).
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>YES Token:</strong> Worth $1.00 if the event occurs; worthless if it doesn't.</li>
            <li><strong>NO Token:</strong> Worth $1.00 if the event doesn't occur; worthless if it does.</li>
            <li><strong>Price = Probability:</strong> A YES token priced at $0.75 means the market believes there's a 75% chance of that outcome.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">Order Types & Trading Strategies</h3>
          <p className="mb-4 text-foreground">
            InterPredict uses a Central Limit Order Book (CLOB) model similar to traditional stock exchanges:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>Market Order:</strong> Buy or sell immediately at the current best price.</li>
            <li><strong>Limit Order:</strong> Specify the price you're willing to buy/sell at; order executes when the market reaches that price.</li>
            <li><strong>Simple Strategy:</strong> Buy low-priced tokens (high-risk, high-reward) or high-priced tokens (low-risk, lower-reward).</li>
            <li><strong>Advanced Strategy:</strong> Provide liquidity by maintaining both buy and sell orders across multiple price levels (market making).</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">Risk Considerations</h3>
          <div className="rounded-lg border border-border bg-secondary/20 p-4 mb-6">
            <p className="text-foreground font-semibold mb-3">Remember: Prediction markets are high-risk assets.</p>
            <ul className="space-y-2 text-muted-foreground">
              <li>You can lose 100% of your investment if your prediction is wrong.</li>
              <li>Markets can be illiquid, making it difficult to exit large positions.</li>
              <li>Market prices can be highly volatile, especially as the resolution date approaches.</li>
              <li>Only trade with money you can afford to lose.</li>
            </ul>
          </div>
        </section>

        {/* Resolution & Settlement */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground">Market Resolution & Settlement</h2>
          
          <h3 className="mb-4 text-xl font-semibold text-foreground">How Markets Resolve</h3>
          <p className="mb-4 text-foreground">
            When a market's resolution date arrives, the Committee reviews the event outcome based on predefined criteria:
          </p>
          <ol className="mb-6 space-y-2 text-foreground list-decimal list-inside">
            <li>Committee gathers evidence from the specified resolution sources</li>
            <li>Members review and discuss the evidence</li>
            <li>Committee votes on the correct outcome (YES or NO)</li>
            <li>If supermajority (66%+) agrees, the market resolves</li>
            <li>Winning tokens become redeemable for $1.00 each</li>
            <li>Losing tokens expire worthless</li>
          </ol>

          <h3 className="mb-4 text-xl font-semibold text-foreground">What If You Disagree with the Resolution?</h3>
          <p className="mb-4 text-foreground">
            If you believe the Committee made an incorrect decision, you can file a dispute:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li><strong>Provide Evidence:</strong> Submit documentation supporting your position.</li>
            <li><strong>Committee Reconsideration:</strong> The Committee reviews your dispute with fresh perspective.</li>
            <li><strong>Override Threshold:</strong> If 75%+ of Committee members agree with you, the market is re-resolved.</li>
            <li><strong>Transparent Records:</strong> All dispute discussions are recorded on-chain.</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">Claiming Your Winnings</h3>
          <p className="mb-4 text-foreground">
            After resolution, you can redeem your winning tokens:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li>Navigate to the closed market</li>
            <li>Click "Redeem Winning Tokens"</li>
            <li>Confirm the transaction</li>
            <li>Funds are transferred to your wallet immediately</li>
          </ul>
        </section>

        {/* Governance */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground">Participating in Governance</h2>
          
          <h3 className="mb-4 text-xl font-semibold text-foreground">The Governance Forum</h3>
          <p className="mb-4 text-foreground">
            While the Committee makes formal decisions, the community discusses and votes on proposals in the Governance Forum:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li>Propose protocol changes and improvements</li>
            <li>Suggest new features for future versions</li>
            <li>Challenge Committee decisions</li>
            <li>Vote on non-binding community preference measures</li>
          </ul>

          <h3 className="mb-4 text-xl font-semibold text-foreground">Becoming a Committee Member</h3>
          <p className="mb-4 text-foreground">
            Future versions of InterPredict will enable community members to become Committee members based on:
          </p>
          <ul className="mb-6 space-y-2 text-foreground">
            <li>Reputation and trading history on the platform</li>
            <li>Community voting and approval</li>
            <li>Domain expertise in relevant fields</li>
            <li>Commitment to fairness and transparency</li>
          </ul>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 mt-8">
            <p className="text-foreground font-semibold mb-2">Want to Learn More?</p>
            <p className="text-muted-foreground mb-4">
              For technical details about how markets settle, pricing mechanics, and the governance structure, see the <Link href="/whitepaper" className="font-semibold text-primary hover:underline">Whitepaper</Link>.
            </p>
            <p className="text-muted-foreground">
              To join discussions and participate in governance voting, visit the <Link href="/governance-forum" className="font-semibold text-primary hover:underline">Governance Forum</Link>.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-foreground">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Q: What if a market never resolves?</p>
              <p className="text-muted-foreground text-sm">A: If the event never occurs or the resolution criteria aren't met, the Committee will make a final decision based on the evidence available. This is covered in detail in the Whitepaper.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Q: Can I short predict?</p>
              <p className="text-muted-foreground text-sm">A: Yes! Buying NO tokens is the same as shorting. You profit if the outcome doesn't occur.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Q: How do I know market prices are fair?</p>
              <p className="text-muted-foreground text-sm">A: Prices are determined by supply and demand, just like stock exchanges. As new information emerges, prices adjust. Market makers help maintain liquidity and tight bid-ask spreads.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Q: Is InterPredict regulated?</p>
              <p className="text-muted-foreground text-sm">A: InterPredict is a decentralized protocol. Regulatory status varies by jurisdiction. See our Risk Disclosure and Terms of Service for important disclaimers.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-semibold text-foreground mb-2">Q: What if I think there's market manipulation?</p>
              <p className="text-muted-foreground text-sm">A: Report suspicious activity to the Committee through the Governance Forum. All trading is recorded on-chain and can be audited.</p>
            </div>
          </div>
        </section>

        {/* Version Note */}
        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">
            <strong>InterPredict Version 1.0:</strong> This documentation reflects the initial release. As the protocol evolves with Version 2.0 and beyond, additional features like categorical markets, scalar markets, and enhanced governance will be added.
          </p>
          <p className="text-xs text-muted-foreground">
            Last updated: June 2026
          </p>
        </div>
      </div>
    </main>
  )
}
