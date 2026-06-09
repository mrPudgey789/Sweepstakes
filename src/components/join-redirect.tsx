'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Checks if the user just verified their email and has a pending join intent.
 * If so, redirects them back to the sweepstake join page.
 * Mount this in the root layout.
 */
export function JoinRedirect() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Only check on pages that are NOT the join page itself
    if (pathname.startsWith('/j/')) return

    const saved = localStorage.getItem('join_intent')
    if (!saved) return

    let intent: { joinPath?: string } | null = null
    try { intent = JSON.parse(saved) } catch { return }
    if (!intent?.joinPath) return

    // Check if user is now logged in (just verified their email)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.push(intent!.joinPath!)
      }
    })
  }, [pathname, router])

  return null
}
