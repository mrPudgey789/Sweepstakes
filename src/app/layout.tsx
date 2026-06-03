'use client'

import { Inter, Anton } from 'next/font/google'
import './globals.css'
import { NavBar } from '@/components/nav-bar'
import Preloader from '@/components/preloader'
import { useState, useEffect } from 'react'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton' })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [preloaderDone, setPreloaderDone] = useState(true) // default to done (skip)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const seen = sessionStorage.getItem('preloader_seen')
    if (!seen) {
      setPreloaderDone(false) // show preloader on first visit
    }
    setChecked(true)
  }, [])

  return (
    <html lang="en-GB">
      <body className={`${inter.variable} ${anton.variable} font-sans min-h-screen bg-[#F8F9FB] text-brand-navy`}>
        {!preloaderDone && checked && (
          <Preloader onComplete={() => { sessionStorage.setItem('preloader_seen', '1'); setPreloaderDone(true) }} />
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
