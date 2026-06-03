'use client'

import { Inter, Anton } from 'next/font/google'
import './globals.css'
import { NavBar } from '@/components/nav-bar'
import Preloader from '@/components/preloader'
import { useState } from 'react'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton' })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [preloaderDone, setPreloaderDone] = useState(false)

  return (
    <html lang="en-GB">
      <body className={`${inter.variable} ${anton.variable} font-sans min-h-screen bg-white text-brand-navy`}>
        {!preloaderDone && (
          <Preloader onComplete={() => setPreloaderDone(true)} />
        )}
        <div
          className="transition-opacity duration-500"
          style={{
            opacity: preloaderDone ? 1 : 0,
            pointerEvents: preloaderDone ? 'auto' : 'none',
          }}
        >
          <NavBar />
          <main>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
