'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function CreateSuccessPage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading...</p>}>
      <CreateSuccessContent />
    </Suspense>
  )
}

function CreateSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sweepstakeId = searchParams.get('sweepstake_id')
  const [sweepstake, setSweepstake] = useState<{
    name: string
    join_code: string
    share_slug: string
    status: string
  } | null>(null)

  useEffect(() => {
    if (!sweepstakeId) {
      router.push('/dashboard')
      return
    }

    async function load() {
      const supabase = createClient()

      // Poll briefly for the webhook to fire
      let attempts = 0
      while (attempts < 10) {
        const { data } = await supabase
          .from('sweepstakes')
          .select('name, join_code, share_slug, status')
          .eq('id', sweepstakeId!)
          .single()

        if (data?.status === 'open') {
          setSweepstake(data)
          return
        }

        await new Promise((r) => setTimeout(r, 1000))
        attempts++
      }

      // If still draft after polling, show anyway
      const { data } = await supabase
        .from('sweepstakes')
        .select('name, join_code, share_slug, status')
        .eq('id', sweepstakeId!)
        .single()

      if (data) setSweepstake(data)
    }

    load()
  }, [sweepstakeId, router])

  if (!sweepstake) {
    return <p className="text-gray-500">Setting up your sweepstake...</p>
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const shareLink = `${appUrl}/j/${sweepstake.share_slug}`

  return (
    <div className="max-w-lg mx-auto text-center">
      <h1 className="text-2xl font-bold text-green-700 mb-2">
        {sweepstake.name} is live!
      </h1>
      <p className="text-gray-600 mb-8">
        Share the link or code below with your players.
      </p>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Share link</p>
          <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm font-mono break-all">
            {shareLink}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(shareLink)}
            className="mt-2 text-sm text-green-700 hover:underline"
          >
            Copy link
          </button>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Join code</p>
          <p className="text-3xl font-bold tracking-widest">{sweepstake.join_code}</p>
        </div>
      </div>

      <div className="mt-8">
        <Link
          href={`/sweepstake/${sweepstakeId}`}
          className="bg-green-700 text-white px-6 py-2 rounded-md hover:bg-green-800"
        >
          Go to your sweepstake
        </Link>
      </div>
    </div>
  )
}
