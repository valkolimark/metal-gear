'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en" className="dark">
      <body className="bg-[#0A0A0F] text-zinc-100">
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <h1 className="text-6xl font-bold text-[#FF6B2B]">Error</h1>
          <p className="mt-4 text-lg text-zinc-400">
            Something went wrong. We&apos;ve been notified.
          </p>
          <button
            onClick={reset}
            className="mt-8 rounded-lg bg-[#FF6B2B] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#e55e25]"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
