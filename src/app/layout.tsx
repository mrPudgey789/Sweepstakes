import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NavBar } from '@/components/nav-bar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'World Cup Sweepstakes',
  description: 'Run your World Cup sweepstake with friends and colleagues. Create, share, and track your sweepstake through the 2026 FIFA World Cup.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en-GB">
      <body className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen`}>
        <NavBar />
        <main className="max-w-5xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
