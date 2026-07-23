import { useWeb3 } from '../app/context/Web3Context'
import type { LocaleType } from '../app/context/translations'

export function LanguageSelector() {
  const { locale, setLocale, t } = useWeb3()

  return (
    <select
      aria-label={t('language')}
      value={locale}
      onChange={(e) => setLocale(e.target.value as LocaleType)}
      className="rounded-lg border border-border bg-white text-black dark:bg-[#120025] dark:text-white px-3 py-1.5 text-sm font-medium outline-none backdrop-blur-sm transition-all duration-200 cursor-pointer"
    >
      <option value="en">🇺🇸 English</option>
      <option value="zh">🇨🇳 简体中文</option>
      <option value="es">🇪🇸 Español</option>
      <option value="fr">🇫🇷 Français</option>
    </select>
  )
}
