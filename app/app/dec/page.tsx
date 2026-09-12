'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/useLocale'
import { getWalletState } from '@/services/wallet/wallet'

// ---------------------------------------------------------------------------
// DEC page (V2 §28). Shows eligibility, membership status, available proposals,
// voting state, resolution state, and completed activity.
// ---------------------------------------------------------------------------

export default function DecPage() {
  const { t } = useLocale()
  const walletAddress = getWalletState().address

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t('nav.dec')}</h1>

      {!walletAddress ? (
        <EmptyState variant="no-activity" description="Connect your wallet to view DEC membership status." />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">DEC Membership</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                DEC members review community proposals and vote on market resolutions.
                Members earn reputation for honest votes and can claim rewards.
              </p>
              <div className="mt-3">
                <Badge variant="muted">Not a member</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Proposals</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState variant="empty" description="No pending proposals to review." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resolution Voting</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState variant="empty" description="No markets awaiting resolution votes." />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}