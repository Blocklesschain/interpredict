'use client'

import { useRouter } from 'next/navigation'

export function BackHomeButton() {
  const router = useRouter()

  const handleClick = () => {
    // Save current scroll position before navigating
    sessionStorage.setItem('scrollY', window.scrollY.toString())
    router.push('/')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center rounded-full border border-border bg-secondary/70 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-primary hover:text-primary-foreground"
    >
      ← Back home
    </button>
  )
}
