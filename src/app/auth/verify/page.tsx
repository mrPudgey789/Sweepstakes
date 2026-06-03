'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'

function VerifyContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || 'your email'

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Email icon */}
        <div className="w-20 h-20 rounded-full bg-brand-blue/10 border-2 border-brand-blue/20 flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>

        <div>
          <h1 className="heading text-3xl sm:text-4xl text-brand-navy mb-3">Check your email</h1>
          <p className="text-brand-navy/60 text-sm leading-relaxed">
            We have sent a verification link to <strong className="text-brand-navy">{email}</strong>.
            Click the link in the email to confirm your account.
          </p>
        </div>

        <div className="bg-brand-blue/5 border-2 border-brand-blue/10 rounded-2xl p-5 text-left space-y-3">
          <p className="text-sm text-brand-navy/70 font-medium">Did not get the email?</p>
          <ul className="text-xs text-brand-navy/50 space-y-1.5 list-disc list-inside">
            <li>Check your spam or junk folder</li>
            <li>Make sure you entered the correct email address</li>
            <li>The email can take a few minutes to arrive</li>
          </ul>
        </div>

        <Link href="/auth/login" className="btn-secondary inline-block">
          Back to log in
        </Link>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-brand-navy/50">Loading...</p>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
