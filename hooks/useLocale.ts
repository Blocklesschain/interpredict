'use client'

import { useState, useCallback, useEffect } from 'react'
import { translate, type Locale, type LocaleKey, SUPPORTED_LOCALES } from '@/i18n/index'

// ---------------------------------------------------------------------------
// Locale hook. Persists preference in localStorage.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'interpredict-lang'

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const stored = localStorage.getItem(STORAGE_KEY)
  return SUPPORTED_LOCALES.includes(stored as Locale) ? (stored as Locale) : 'en'
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    setLocaleState(getStoredLocale())
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem(STORAGE_KEY, newLocale)
  }, [])

  const t = useCallback(
    (key: LocaleKey) => translate(locale, key),
    [locale],
  )

  return { locale, setLocale, t }
}