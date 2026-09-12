'use client'

import { useState, useEffect, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Theme hook (V2 §46). Dark, light, system. Persists preference.
// Avoids flash of incorrect theme via the inline script in layout.tsx.
// ---------------------------------------------------------------------------

export type Theme = 'dark' | 'light' | 'system'

const STORAGE_KEY = 'interpredict-theme'

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light' || stored === 'system') return stored
  return 'system'
}

function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') return getSystemTheme()
  return theme
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolved, setResolved] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const stored = getStoredTheme()
    setThemeState(stored)
    setResolved(resolveTheme(stored))
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
    const handler = () => {
      if (theme === 'system') {
        setResolved(getSystemTheme())
      }
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
    const resolvedValue = resolveTheme(newTheme)
    setResolved(resolvedValue)
    document.documentElement.classList.toggle('dark', resolvedValue === 'dark')
  }, [])

  // Sync DOM class on mount and when theme changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [resolved])

  return { theme, resolved, setTheme }
}