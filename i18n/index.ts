import en from './en.json'

// ---------------------------------------------------------------------------
// Typed i18n loader with deterministic fallback (V2 §43).
//
// Fallback chain: requested locale → en (base) → key (raw).
// Keys are typed from the `en` locale so missing translations are caught
// at compile time.
// ---------------------------------------------------------------------------

export type Locale = 'en' | 'zh' | 'es' | 'fr'

// Flatten the nested en.json into a dot-notation key union.
type Flatten<T, Prefix extends string = ''> = {
  [K in keyof T]: T[K] extends string
    ? `${Prefix}${K & string}`
    : T[K] extends object
      ? Flatten<T[K], `${Prefix}${K & string}.`>
      : never
}[keyof T]

export type LocaleKey = Flatten<typeof en>

const locales: Record<Locale, typeof en> = {
  en,
  // Additional locales are added as they are translated. The architecture
  // is extensible (e.g. Vietnamese) without code changes.
  zh: en,
  es: en,
  fr: en,
}

function getNested(obj: unknown, path: string): string | undefined {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : undefined
}

export function translate(locale: Locale, key: LocaleKey): string {
  const value = getNested(locales[locale], key)
  if (value !== undefined) return value
  const fallback = getNested(en, key)
  return fallback !== undefined ? fallback : key
}

export const SUPPORTED_LOCALES: Locale[] = ['en', 'zh', 'es', 'fr']