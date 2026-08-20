// Interprets DEC resolution tie, quorum, and admin verification status.

import type { LocaleKey } from '@/i18n/index'

export type ResolutionStatus =
  | 'UNIQUE_DEC_WINNER'
  | 'TIE'
  | 'QUORUM_NOT_REACHED'
  | 'ADMIN_VERIFIED'
  | 'FINALIZED'
  | 'UNKNOWN'

export interface ResolutionStatusInfo {
  status: ResolutionStatus
  labelKey: LocaleKey
  explanationKey: LocaleKey
  hasDecRecommendation: boolean
  suggestedOutcome: number | null
}

export interface ResolutionInput {
  quorumReached: boolean | null
  tied: boolean
  outcomeAvailable: boolean
  suggestedOutcome: number | null
  confirmedOutcome: number | null
  finalized: boolean
}

export function getResolutionStatus(input: ResolutionInput): ResolutionStatusInfo {
  if (input.finalized) {
    return {
      status: 'FINALIZED',
      labelKey: 'resolution.status.finalized',
      explanationKey: 'resolution.explanation.finalized',
      hasDecRecommendation: input.outcomeAvailable,
      suggestedOutcome: input.suggestedOutcome,
    }
  }

  if (input.confirmedOutcome !== null) {
    return {
      status: 'ADMIN_VERIFIED',
      labelKey: 'resolution.status.adminVerified',
      explanationKey: 'resolution.explanation.adminVerified',
      hasDecRecommendation: input.outcomeAvailable,
      suggestedOutcome: input.suggestedOutcome,
    }
  }

  if (input.tied) {
    return {
      status: 'TIE',
      labelKey: 'resolution.status.tie',
      explanationKey: 'resolution.explanation.tie',
      hasDecRecommendation: false,
      suggestedOutcome: null,
    }
  }

  if (input.quorumReached === false) {
    return {
      status: 'QUORUM_NOT_REACHED',
      labelKey: 'resolution.status.quorumNotReached',
      explanationKey: 'resolution.explanation.quorumNotReached',
      hasDecRecommendation: false,
      suggestedOutcome: null,
    }
  }

  if (input.outcomeAvailable && input.suggestedOutcome !== null) {
    return {
      status: 'UNIQUE_DEC_WINNER',
      labelKey: 'resolution.status.uniqueDecWinner',
      explanationKey: 'resolution.explanation.uniqueDecWinner',
      hasDecRecommendation: true,
      suggestedOutcome: input.suggestedOutcome,
    }
  }

  return {
    status: 'UNKNOWN',
    labelKey: 'resolution.status.unknown',
    explanationKey: 'resolution.explanation.unknown',
    hasDecRecommendation: false,
    suggestedOutcome: null,
  }
}

export function getResolutionLabel(input: ResolutionInput): string {
  return getResolutionStatus(input).labelKey
}

export function getResolutionExplanation(input: ResolutionInput): string {
  return getResolutionStatus(input).explanationKey
}
