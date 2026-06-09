'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Checks if the user just verified their email and has a pending join/create intent.
 * Works cross-device: checks localStorage first, then falls back to the DB.
 * Mount this in the root layout.
 */
export function JoinRedirect() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Only check on pages that are NOT already the target
    if (pathname.startsWith('/j/') || pathname === '/create') return

    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      // 1. Check localStorage first (same device, fastest)
      const savedJoin = localStorage.getItem('join_intent')
      if (savedJoin) {
        try {
          const intent = JSON.parse(savedJoin)
          if (intent?.joinPath) { router.push(intent.joinPath); return }
        } catch { /* ignore */ }
      }

      const savedWizard = localStorage.getItem('sweepstake_wizard')
      if (savedWizard) {
        router.push('/create')
        return
      }

      // 2. Check DB for cross-device pending state
      if (!user.email) return
      try {
        const res = await fetch(`/api/pending-state?email=${encodeURIComponent(user.email)}`)
        if (!res.ok) return
        const { found, type, state } = await res.json()
        if (!found) return

        if (type === 'join_intent' && state?.joinPath) {
          // Save to localStorage so the join page can pick it up
          localStorage.setItem('join_intent', JSON.stringify(state))
          router.push(state.joinPath)
        } else if (type === 'create_wizard') {
          // Save to localStorage so the create page can pick it up
          localStorage.setItem('sweepstake_wizard', JSON.stringify(state))
          router.push('/create')
        }
      } catch { /* ignore */ }
    })
  }, [pathname, router])

  return null
}
