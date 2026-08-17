'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useLocale } from '@/hooks/useLocale'
import { getWalletState } from '@/services/wallet/wallet'
import { MarketState } from '@/lib/actions'

// ---------------------------------------------------------------------------
// Market creation page (V2 §41). Guided form with validation.
// Full implementation requires contract interaction.
// ---------------------------------------------------------------------------

const CATEGORY_NAMES = [
  'Sports', 'Politics', 'Crypto', 'Blockchain', 'Technology', 'AI',
  'Economics', 'Finance', 'Business', 'Science', 'Climate', 'Entertainment',
  'Culture', 'Health', 'Real Estate', 'Gaming', 'Web3', 'Other',
]

export default function CreatePage() {
  const { t } = useLocale()
  const walletAddress = getWalletState().address

  const [question, setQuestion] = useState('')
  const [category, setCategory] = useState(2)
  const [outcomes, setOutcomes] = useState(['Yes', 'No'])
  const [endDays, setEndDays] = useState(7)
  const [resolutionCriteria, setResolutionCriteria] = useState('')

  if (!walletAddress) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <EmptyState variant="no-activity" description="Connect your wallet to create a market." />
      </div>
    )
  }

  const addOutcome = () => {
    if (outcomes.length < 4) {
      setOutcomes([...outcomes, ''])
    }
  }

  const removeOutcome = (index: number) => {
    if (outcomes.length > 2) {
      setOutcomes(outcomes.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = () => {
    // TODO: Contract interaction via wallet service
    alert('Market creation will be enabled after contract deployment.')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t('nav.create')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>New Market</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Question */}
          <div>
            <label className="text-sm font-semibold">{t('market.question')}</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Will Interlink process 10M transactions this week?"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              maxLength={256}
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-semibold">{t('market.category')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {CATEGORY_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
          </div>

          {/* Outcomes */}
          <div>
            <label className="text-sm font-semibold">{t('market.outcomes')} (2-4)</label>
            <div className="space-y-2 mt-1">
              {outcomes.map((outcome, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={outcome}
                    onChange={(e) => {
                      const updated = [...outcomes]
                      updated[i] = e.target.value
                      setOutcomes(updated)
                    }}
                    placeholder={`Outcome ${i + 1}`}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    maxLength={64}
                  />
                  {outcomes.length > 2 && (
                    <Button variant="ghost" size="sm" onClick={() => removeOutcome(i)}>
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {outcomes.length < 4 && (
              <Button variant="outline" size="sm" className="mt-2" onClick={addOutcome}>
                + Add Outcome
              </Button>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-semibold">Duration (days)</label>
            <input
              type="number"
              value={endDays}
              onChange={(e) => setEndDays(Number(e.target.value))}
              min={1}
              max={365}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Resolution Criteria */}
          <div>
            <label className="text-sm font-semibold">{t('market.resolutionCriteria')}</label>
            <textarea
              value={resolutionCriteria}
              onChange={(e) => setResolutionCriteria(e.target.value)}
              placeholder="How will this market be resolved?"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button className="w-full" onClick={handleSubmit}>
            {t('common.submit')} (11 ITL)
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}