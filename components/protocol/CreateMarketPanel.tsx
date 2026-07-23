'use client'

import { ImagePlus, Minus, Plus } from 'lucide-react'
import { ethers } from 'ethers'
import { useEffect, useState, type FormEvent } from 'react'
import { useWeb3 } from '@/app/context/Web3Context'
import type { WorkspaceAction } from '@/lib/interpredictFrontend'
import { MARKET_CATEGORIES } from '@/lib/interpredictProtocol'
import {
  Field,
  formatToken,
  inputClass,
  primaryButton,
  secondaryButton,
} from './ProtocolUI'

function validPermanentURI(value: string) {
  return /^(https:\/\/[^\s]+|ipfs:\/\/[^\s]+|ar:\/\/[^\s]+)$/.test(value)
}

export function CreateMarketPanel({
  perform,
}: {
  perform: WorkspaceAction
}) {
  const {
    account,
    roles,
    token,
    protocolPaused,
    approveSettlement,
    t,
  } = useWeb3()
  const [origin, setOrigin] = useState<'community' | 'team'>('community')
  const [outcomes, setOutcomes] = useState(['Yes', 'No'])
  const [preview, setPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (!account) throw new Error(t('connectRequired'))
      if (origin === 'team' && !roles.isTeam) {
        throw new Error('This wallet does not hold the team-market role')
      }
      const form = new FormData(event.currentTarget)
      const question = String(form.get('question') ?? '').trim()
      const description = String(form.get('description') ?? '').trim()
      const category = Number(form.get('category'))
      const customCategory = String(form.get('customCategory') ?? '').trim()
      const thumbnailURI = String(form.get('thumbnailURI') ?? '').trim()
      const resolutionCriteria = String(
        form.get('resolutionCriteria') ?? '',
      ).trim()
      const primaryEvidenceURI = String(
        form.get('primaryEvidenceURI') ?? '',
      ).trim()
      const backupEvidenceURI = String(
        form.get('backupEvidenceURI') ?? '',
      ).trim()
      const endValue = String(form.get('tradingEndTime') ?? '')
      const tradingEndTime = Math.floor(new Date(endValue).getTime() / 1_000)
      const normalizedOutcomes = outcomes.map(value => value.trim())

      if (!question || !resolutionCriteria) {
        throw new Error('Question and resolution criteria are required')
      }
      if (
        !validPermanentURI(thumbnailURI) ||
        !validPermanentURI(primaryEvidenceURI) ||
        (backupEvidenceURI && !validPermanentURI(backupEvidenceURI))
      ) {
        throw new Error('Use a complete https://, ipfs://, or ar:// URI')
      }
      if (
        normalizedOutcomes.some(value => !value) ||
        new Set(normalizedOutcomes.map(value => value.toLowerCase())).size !==
          normalizedOutcomes.length
      ) {
        throw new Error('Provide two to four distinct outcome labels')
      }
      const minimumEnd =
        Math.floor(Date.now() / 1_000) +
        (origin === 'community' ? 24 * 60 * 60 : 0)
      if (!Number.isFinite(tradingEndTime) || tradingEndTime <= minimumEnd) {
        throw new Error(
          origin === 'community'
            ? 'Community trading must end after the 24-hour proposal window'
            : 'Trading end must be in the future',
        )
      }
      if (category === 17 && !customCategory) {
        throw new Error('A custom category is required for Other')
      }
      if (category !== 17 && customCategory) {
        throw new Error('Custom category is only allowed with Other')
      }

      const params = {
        question,
        description,
        category,
        customCategory,
        thumbnailURI,
        outcomes: normalizedOutcomes,
        tradingEndTime,
        resolutionCriteria,
        primaryEvidenceURI,
        backupEvidenceURI,
      }
      if (origin === 'community') {
        const collateral = token.proposalFee + token.proposalSeed
        await approveSettlement(collateral)
        await perform(
          'createCommunityMarket',
          [params],
          'Submit community market proposal',
        )
      } else {
        const seedText = String(form.get('teamSeed') ?? '')
        const seed = ethers.parseUnits(seedText, token.decimals)
        if (seed < token.proposalSeed) {
          throw new Error(
            `Team seed must be at least ${formatToken(token.proposalSeed, token.decimals)} ${token.symbol}`,
          )
        }
        await approveSettlement(seed)
        await perform('createTeamMarket', [params, seed], 'Create team market')
      }
      event.currentTarget.reset()
      setOutcomes(['Yes', 'No'])
      if (preview) URL.revokeObjectURL(preview)
      setPreview('')
    } catch (caught) {
      console.error('Market creation failed:', caught)
      setError(
        caught instanceof Error ? caught.message : 'Market creation failed',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('createMarket')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Permanent metadata and evidence are immutable after submission.
      </p>
      {protocolPaused && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"
        >
          {t('protocolPause')}: {t('paused')}. New markets cannot be created
          until the protocol resumes.
        </p>
      )}

      <div
        role="tablist"
        aria-label={t('origin')}
        className="mt-6 flex gap-2"
      >
        <button
          type="button"
          role="tab"
          aria-selected={origin === 'community'}
          onClick={() => setOrigin('community')}
          className={origin === 'community' ? primaryButton : secondaryButton}
        >
          {t('communityMarket')}
        </button>
        {roles.isTeam && (
          <button
            type="button"
            role="tab"
            aria-selected={origin === 'team'}
            onClick={() => setOrigin('team')}
            className={origin === 'team' ? primaryButton : secondaryButton}
          >
            {t('teamMarket')}
          </button>
        )}
      </div>

      <form
        onSubmit={event => void submit(event)}
        className="mt-6 grid gap-5 rounded-2xl border border-border bg-secondary/15 p-5 sm:p-7"
      >
        <Field label={t('marketQuestion')}>
          <input
            required
            name="question"
            maxLength={280}
            className={`${inputClass} mt-1.5`}
          />
        </Field>
        <Field label={t('description')}>
          <textarea
            name="description"
            maxLength={2_000}
            rows={4}
            className={`${inputClass} mt-1.5 resize-y`}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('category')}>
            <select name="category" className={`${inputClass} mt-1.5`}>
              {MARKET_CATEGORIES.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('customCategory')} hint="Only used when category is Other.">
            <input
              name="customCategory"
              maxLength={64}
              className={`${inputClass} mt-1.5`}
            />
          </Field>
        </div>

        <Field label={t('thumbnailUri')}>
          <input
            required
            name="thumbnailURI"
            type="url"
            placeholder="https://, ipfs://, or ar://"
            className={`${inputClass} mt-1.5`}
          />
        </Field>
        <label className="focus-ring flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border p-5 text-sm font-semibold hover:border-primary/40">
          <ImagePlus className="size-5 text-primary" aria-hidden="true" />
          Local image preview
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={event => {
              if (preview) URL.revokeObjectURL(preview)
              const file = event.target.files?.[0]
              setPreview(file ? URL.createObjectURL(file) : '')
            }}
          />
        </label>
        {preview && (
          <div>
            <img
              src={preview}
              alt="Local market thumbnail preview"
              className="h-48 w-full rounded-xl object-cover"
            />
            <p className="mt-2 text-xs text-amber-300">{t('previewOnly')}</p>
          </div>
        )}

        <fieldset>
          <legend className="text-sm font-semibold">{t('outcomes')}</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {outcomes.map((value, index) => (
              <div key={index} className="flex gap-2">
                <label className="flex-1">
                  <span className="sr-only">
                    {t('outcome')} {index + 1}
                  </span>
                  <input
                    required
                    value={value}
                    maxLength={64}
                    onChange={event =>
                      setOutcomes(current =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? event.target.value : item,
                        ),
                      )
                    }
                    className={inputClass}
                  />
                </label>
                {outcomes.length > 2 && (
                  <button
                    type="button"
                    onClick={() =>
                      setOutcomes(current =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    aria-label={`${t('removeOutcome')} ${index + 1}`}
                    className={`${secondaryButton} px-3`}
                  >
                    <Minus className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={outcomes.length >= 4}
            onClick={() => setOutcomes(current => [...current, ''])}
            className={`${secondaryButton} mt-3`}
          >
            <Plus className="size-4" aria-hidden="true" />
            {t('addOutcome')}
          </button>
        </fieldset>

        <Field
          label={t('tradingEnd')}
          hint={
            origin === 'community'
              ? 'Must be later than the 24-hour proposal window.'
              : 'Must be in the future.'
          }
        >
          <input
            required
            name="tradingEndTime"
            type="datetime-local"
            className={`${inputClass} mt-1.5`}
          />
        </Field>
        <Field label={t('resolutionCriteria')}>
          <textarea
            required
            name="resolutionCriteria"
            maxLength={2_000}
            rows={5}
            className={`${inputClass} mt-1.5 resize-y`}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('primaryEvidence')}>
            <input
              required
              name="primaryEvidenceURI"
              placeholder="https://, ipfs://, or ar://"
              className={`${inputClass} mt-1.5`}
            />
          </Field>
          <Field label={t('backupEvidence')}>
            <input
              name="backupEvidenceURI"
              placeholder="https://, ipfs://, or ar://"
              className={`${inputClass} mt-1.5`}
            />
          </Field>
        </div>

        {origin === 'team' && (
          <Field
            label={`${t('teamSeed')} (${token.symbol})`}
            hint={`Protocol minimum: ${formatToken(token.proposalSeed, token.decimals)} ${token.symbol}.`}
          >
            <input
              required
              name="teamSeed"
              inputMode="decimal"
              defaultValue={ethers.formatUnits(token.proposalSeed, token.decimals)}
              className={`${inputClass} mt-1.5`}
            />
          </Field>
        )}

        {origin === 'community' && (
          <p className="rounded-xl bg-primary/10 p-4 text-sm text-muted-foreground">
            Proposal fee:{' '}
            <strong className="text-foreground">
              {formatToken(token.proposalFee, token.decimals)} {token.symbol}
            </strong>
            {' · '}Refundable/seed collateral:{' '}
            <strong className="text-foreground">
              {formatToken(token.proposalSeed, token.decimals)} {token.symbol}
            </strong>
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-rose-400">
            {error}
          </p>
        )}
        <button
          disabled={submitting || !account || protocolPaused}
          className={`${primaryButton} w-full`}
        >
          {submitting
            ? t('transactionPending')
            : origin === 'community'
              ? t('createCommunity')
              : t('createTeam')}
        </button>
        {!account && (
          <p className="text-center text-xs text-muted-foreground">
            {t('connectRequired')}
          </p>
        )}
      </form>
    </div>
  )
}
