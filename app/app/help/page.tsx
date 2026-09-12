'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useLocale } from '@/hooks/useLocale'

// ---------------------------------------------------------------------------
// Help page (V2 §49). Explains market states, DEC, resolution, timestamps,
// transaction lifecycle, and common errors.
// ---------------------------------------------------------------------------

const SECTIONS = [
  {
    title: 'Creating Forecasting Markets',
    content:
      'Anyone can propose a market by paying a 1 ITL fee and providing a 10 ITL seed. Team members can deploy markets directly to Active. Each market must have 2-4 outcomes, a clear question, and resolution criteria.',
  },
  {
    title: 'Market States',
    content:
      'Markets progress through: Proposed → DEC Review → Approved/Rejected → Active → Closed → Resolution Requested → DEC Resolution Voting → Admin Verification → Confirmed → Finalized → Resolved. Each state has specific actions available.',
  },
  {
    title: 'DEC (Decentralized Expert Council)',
    content:
      'DEC members review community proposals and vote on market resolutions. Members earn reputation for honest votes and can claim rewards. To join, submit a membership request with a 0.1 ITL application fee.',
  },
  {
    title: 'Resolution',
    content:
      'After a market ends, traders, creators, or DEC members can request resolution. DEC members vote on the correct outcome. An admin verifier confirms the outcome, and the market is finalized. Winning participants can then claim their payouts.',
  },
  {
    title: 'Timestamps',
    content:
      'All times are stored as Unix timestamps (UTC). The UI displays times in your local timezone. Always verify the end time before participating.',
  },
  {
    title: 'Transaction Lifecycle',
    content:
      '1. You sign a transaction in your wallet. 2. The transaction is submitted to the InterLink testnet. 3. Once confirmed, the indexer updates the database. 4. The UI refreshes to show the new state. This typically takes 10-30 seconds.',
  },
  {
    title: 'Common Errors',
    content:
      '"Transaction cancelled" — you rejected the transaction in your wallet. "Invalid state" — the market is not in the right state for this action. "Already completed" — you have already performed this action. "Network unavailable" — check your connection and try again.',
  },
]

export default function HelpPage() {
  const { t } = useLocale()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t('nav.help')}</h1>
      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{section.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}