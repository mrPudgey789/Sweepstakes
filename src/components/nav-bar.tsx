'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function NavBar() {
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = '/'
  }

  const userInitial = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <nav className="bg-brand-blue backdrop-blur-md sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between gap-4">

        {/* Logo - full on desktop, compact on mobile */}
        <Link href="/" className="shrink-0">
          <span className="hidden sm:flex items-center gap-1.5">
            <img src="/sweep-green.svg" alt="Sweep" className="h-6 w-auto brightness-0 invert" />
            <img src="/or-white.svg" alt="or" className="h-3.5 w-auto" />
            <img src="/weep-white.svg" alt="Weep" className="h-6 w-auto" />
          </span>
          <img src="/sw-logo.svg" alt="Sweep or Weep" className="sm:hidden h-8 w-auto" />
        </Link>

        {/* Spacer for layout */}
        <div className="hidden md:flex flex-1" />

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {/* Avatar circle */}
              <div className="w-9 h-9 rounded-full bg-brand-green flex items-center justify-center text-brand-navy font-bold text-sm select-none">
                {userInitial}
              </div>
              <button
                onClick={handleLogout}
                className="text-white/70 hover:text-white text-sm font-medium transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-white/80 hover:text-white text-sm font-medium transition-colors px-3 py-1.5"
              >
                Log in
              </Link>
              <Link
                href="/create"
                className="bg-brand-green text-brand-navy text-sm font-bold px-5 py-2.5 rounded-full hover:bg-brand-green-dark transition-colors shadow-lg shadow-brand-green/20 whitespace-nowrap"
              >
                Create a sweepstake
              </Link>
            </>
          )}
        </div>

        {/* Mobile: CTAs + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          {!user && (
            <>
              <Link
                href="/auth/login"
                className="text-white text-xs font-bold px-3 py-2 rounded-full border border-white/30 hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                Log in
              </Link>
              <Link
                href="/create"
                className="bg-brand-green text-brand-navy text-xs font-bold px-3 py-2 rounded-full hover:bg-brand-green-dark transition-colors whitespace-nowrap"
              >
                Create
              </Link>
            </>
          )}
          {user && <button
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label="Toggle menu"
            className="text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            {menuOpen ? (
              /* X icon */
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              /* Hamburger icon */
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>}
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-brand-blue-dark border-t border-white/10 px-5 py-4 flex flex-col gap-4 animate-slideDown">
          {user ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="text-white/80 hover:text-white text-base font-medium transition-colors"
              >
                Your sweepstakes
              </Link>
              <div className="flex items-center gap-3 pt-1 border-t border-white/10">
                <div className="w-9 h-9 rounded-full bg-brand-green flex items-center justify-center text-brand-navy font-bold text-sm select-none shrink-0">
                  {userInitial}
                </div>
                <span className="text-white/60 text-sm truncate">{user.email}</span>
              </div>
              <button
                onClick={() => { setMenuOpen(false); handleLogout() }}
                className="text-white/70 hover:text-white text-base font-medium transition-colors text-left"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className="text-white/80 hover:text-white text-base font-medium transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/create"
                onClick={() => setMenuOpen(false)}
                className="bg-brand-green text-brand-navy text-sm font-bold px-5 py-3 rounded-full hover:bg-brand-green-dark transition-colors text-center shadow-lg shadow-brand-green/20"
              >
                Create a sweepstake
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
