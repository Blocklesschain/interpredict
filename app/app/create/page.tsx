'use client'

import { useState, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useLocale } from '@/hooks/useLocale'
import { getWalletState } from '@/services/wallet/wallet'
import { MarketState } from '@/lib/actions'
import { Upload } from 'lucide-react'

// ---------------------------------------------------------------------------
// Market creation page (V2 §41). Guided form with validation and thumbnail upload.
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
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(2)
  const [outcomes, setOutcomes] = useState(['Yes', 'No'])
  const [endDays, setEndDays] = useState(7)
  const [resolutionCriteria, setResolutionCriteria] = useState('')
  const [marketImage, setMarketImage] = useState<string | null>(null)
  const [marketImageFile, setMarketImageFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setMarketImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setMarketImage(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    if (!question || !resolutionCriteria) return

    setIsUploading(true)
    let thumbnailUrl = ''

    if (marketImageFile) {
      try {
        const formData = new FormData()
        formData.append('file', marketImageFile)
        const uploadRes = await fetch('/api/upload-thumbnail', { method: 'POST', body: formData })
        const uploadJson = await uploadRes.json()
        if (!uploadRes.ok) {
          alert(uploadJson.error || 'Image upload failed')
          setIsUploading(false)
          return
        }
        thumbnailUrl = uploadJson.url
      } catch (err: any) {
        alert('Image upload failed: ' + (err.message || 'unknown error'))
        setIsUploading(false)
        return
      }
    }

    setIsUploading(false)
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

          {/* Description */}
          <div>
            <label className="text-sm font-semibold">{t('market.description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional context for this market..."
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              rows={2}
            />
          </div>

          {/* Thumbnail Upload */}
          <div>
            <label className="text-sm font-semibold">Market Thumbnail</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 h-28 bg-muted/30 border border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer p-2 relative overflow-hidden text-center hover:border-primary/50 transition-colors"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
              {marketImage ? (
                <img src={marketImage} alt="Preview" className="size-full object-cover rounded-lg" />
              ) : (
                <>
                  <Upload className="size-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Upload custom logo/image</span>
                </>
              )}
            </div>
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

          {/* Fee Info */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Market Creation Fees</p>
            <p>Community Market: <strong>11 ITL</strong> (1 ITL proposal fee + 10 ITL seed liquidity)</p>
            <p>Team Market: <strong>10 ITL</strong> (seed liquidity only, goes directly to Active)</p>
            <p className="mt-1">Community seed is refunded if the proposal is rejected during DEC review.</p>
          </div>

          {/* Submit */}
          <Button className="w-full" onClick={handleSubmit} disabled={isUploading}>
            {isUploading ? 'Uploading...' : `${t('common.submit')} (11 ITL)`}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
