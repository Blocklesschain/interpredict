'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export function ScrollToTop() {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const handleScroll = () => setVisible(window.scrollY > 320)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Don't render until mounted to prevent hydration issues
  if (!mounted) return null

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={`fixed right-5 bottom-5 z-50 inline-flex items-center justify-center rounded-full border border-border bg-white/90 px-4 py-3 text-foreground shadow-[0_20px_60px_-30px_rgba(98,0,238,0.75)] transition-all duration-300 hover:-translate-y-1 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_24px_80px_-30px_rgba(98,0,238,0.65)] dark:bg-[#120025]/90 dark:text-white dark:hover:bg-primary dark:hover:text-primary-foreground ${visible ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'
        }`}
    >
      <span className="mr-2 text-sm font-semibold">Top</span>
      <ArrowUp className="h-5 w-5" />
    </button>
  )
}
