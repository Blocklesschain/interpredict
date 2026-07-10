import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Inter, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import { Web3Provider } from './context/Web3Context'
import ScrollToTop from '../components/ScrollToTop'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
})
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'InterPredict — Community Prediction Marketplace on Interlink',
  description:
    'InterPredict is a decentralized, community-owned prediction marketplace built natively on the Interlink Network. Propose, vote and trade your insights on anything and everything.',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0d0022' },
    { media: '(prefers-color-scheme: light)', color: '#faf9ff' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable} ${geistMono.variable} bg-background`}
    >
      <head>
        {/* Natively forces dark mode class directly into the HTML root channel instantly on boot */}
        <Script id="theme-init" strategy="beforeInteractive">{`
          try {
            var t = localStorage.getItem('theme') || localStorage.getItem('interpredict-theme');
            if (t === 'dark' || !t) {
              document.documentElement.classList.add('dark');
              localStorage.setItem('theme', 'dark');
            } else if (t === 'light') {
              document.documentElement.classList.remove('dark');
            }
          } catch(e) {}
        `}</Script>
      </head>
      <body className="font-sans antialiased">
        <Web3Provider>
          {children}
          {/*Scroll To Top engine running smoothly across pages */}
          <ScrollToTop />
        </Web3Provider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}