'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function CreateSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-navy flex items-center justify-center">
          <p className="text-brand-ice text-lg font-bold animate-pulse">Setting things up...</p>
        </div>
      }
    >
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
  const [copied, setCopied] = useState(false)

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
    return (
      <div className="min-h-screen bg-brand-navy flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-brand-green border-t-transparent animate-spin mx-auto" />
          <p className="text-brand-ice text-lg font-bold">Setting up your sweepstake...</p>
        </div>
      </div>
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const shareLink = `${appUrl}/j/${sweepstake.share_slug}`
  const whatsappText = encodeURIComponent(
    `Hey! Please join the World Cup 2026 sweepstake I have created using the link below:\n\n${shareLink}\n\nOr enter code: ${sweepstake.join_code}\n\nSweepstake: ${sweepstake.name}`
  )

  function handleCopy() {
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div>
        <p className="text-brand-blue font-extrabold text-xs uppercase tracking-widest mb-1">
          Sweepstake created
        </p>
        <h1 className="heading text-4xl sm:text-5xl text-brand-navy leading-none">
          You&apos;re live!
        </h1>
        <p className="text-brand-navy/50 text-sm font-semibold mt-2">
          Share the link or code below. Your players can join right now.
        </p>
      </div>

      {/* Share card - same style as manage page */}
      <div className="bg-brand-blue rounded-3xl border-2 border-brand-blue p-6 sm:p-8 text-white">
        <p className="text-white/70 text-xs font-extrabold uppercase tracking-widest mb-5">
          Invite players
        </p>

        {/* Join code */}
        <div className="mb-6">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2">Join code</p>
          <p className="heading text-5xl sm:text-6xl text-white leading-none tracking-widest mb-3">
            {sweepstake.join_code}
          </p>
          <button
            onClick={() => { navigator.clipboard.writeText(sweepstake.join_code) }}
            className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-navy bg-brand-green rounded-full px-4 py-2 hover:brightness-95 active:scale-95 transition-all"
          >
            Copy code
          </button>
        </div>

        {/* Share link */}
        <div className="bg-white/10 rounded-2xl border border-white/20 p-4 mb-5">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">Share link</p>
          <p className="text-white font-mono text-sm break-all leading-relaxed">{shareLink}</p>
        </div>

        {/* Share buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-brand-navy bg-brand-green rounded-full px-5 py-2.5 hover:brightness-95 active:scale-95 transition-all"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <a
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-white bg-[#25D366] rounded-full px-5 py-2.5 hover:brightness-95 active:scale-95 transition-all"
          >
            Share on WhatsApp
          </a>
        </div>
      </div>

      {/* Go to sweepstake */}
      <div className="text-center">
        <Link href={`/sweepstake/${sweepstakeId}`} className="btn-primary">
          Go to your sweepstake
        </Link>
      </div>

    </div>
  )
}
