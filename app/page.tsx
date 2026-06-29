'use client'

import { useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { Markets } from "@/components/markets"
import { MarketSimulator } from "@/components/market-simulator"
import { InterlinkAdvantage } from "@/components/interlink-advantage"
import { Lifecycle } from "@/components/lifecycle"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"

export default function Page() {
  useEffect(() => {
    // Restore scroll position if coming back from a documentation page
    const savedScrollY = sessionStorage.getItem('scrollY')
    if (savedScrollY) {
      const scrollPos = parseInt(savedScrollY)
      // Use requestAnimationFrame to ensure the DOM is fully rendered
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPos)
      })
      // Clear the saved position after restoring
      sessionStorage.removeItem('scrollY')
    }
  }, [])

  return (
    <main className="light-leaks relative min-h-screen overflow-x-hidden">
      <Navbar />
      <Hero />
      <Markets />
      <MarketSimulator />
      <Lifecycle />
      <InterlinkAdvantage />
      <Footer />
      <ScrollToTop />
    </main>
  )
}
